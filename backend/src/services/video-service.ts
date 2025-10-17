import { VideoDatabase } from '../db/database';
import { Video, CostStats } from '../types';
import { createWriteStream, mkdirSync, existsSync, createReadStream, copyFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import axios from 'axios';
import FormData from 'form-data';
import { calculateVideoCost } from '../utils/cost-calculator';
import { extractLastFrame } from '../utils/video-utils';
import { resizeAndPadImage, cleanupTempImage } from '../utils/image-utils';
import { ProviderFactory, ProviderType } from '../providers/provider-factory';
import { BaseVideoProvider } from '../providers/base-provider';

export class VideoService {
  private apiKeys: { openai: string; google?: string };
  private db: VideoDatabase;
  private videosDir: string;
  private pollingJobs: Map<string, NodeJS.Timeout>;
  private baseURL = 'https://api.openai.com/v1';

  constructor(
    openaiApiKey: string, 
    db: VideoDatabase, 
    videosDir: string,
    googleApiKey?: string
  ) {
    this.apiKeys = { 
      openai: openaiApiKey,
      google: googleApiKey 
    };
    this.db = db;
    this.videosDir = videosDir;
    this.pollingJobs = new Map();

    // Ensure directories exist
    if (!existsSync(videosDir)) {
      mkdirSync(videosDir, { recursive: true });
    }
    
    // Create reference-images subdirectory
    const refImagesDir = join(videosDir, 'reference-images');
    if (!existsSync(refImagesDir)) {
      mkdirSync(refImagesDir, { recursive: true });
    }
  }

  private getProvider(model: string): BaseVideoProvider {
    const providerType = ProviderFactory.getProviderTypeFromModel(model);
    const apiKey = providerType === 'sora' ? this.apiKeys.openai : this.apiKeys.google!;
    
    if (!apiKey) {
      throw new Error(`API key not configured for provider: ${providerType}`);
    }

    return ProviderFactory.createProvider(providerType, apiKey, this.videosDir);
  }

  async resumePolling(): Promise<void> {
    // Resume polling for all in-progress or queued videos
    const allUsers = ['user_1']; // In a real system, you'd get all user IDs
    for (const userId of allUsers) {
      const videos = this.db.getVideosByUser(userId, 1000, 0);
      for (const video of videos) {
        if (video.status === 'in_progress' || video.status === 'queued') {
          console.log(`Resuming polling for video ${video.id} (${video.status})`);
          this.startPolling(video.id);
        }
      }
    }
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.apiKeys.openai}`,
      'Content-Type': 'application/json'
    };
  }

  async createVideo(
    userId: string,
    prompt: string,
    model: string,
    size: string = '1280x720',
    seconds: string = '8',
    inputReferencePath?: string,
    negativePrompt?: string,
    resolution?: string,
    generateAudio: boolean = true,
    personGeneration?: 'allow_all' | 'allow_adult' | 'dont_allow',
    referenceImagePaths?: string[],
    lastFramePath?: string
  ): Promise<Video> {
    const videoId = randomUUID();
    let processedImagePath: string | undefined;
    let processedReferenceImages: string[] = [];
    let processedLastFrame: string | undefined;

    try {
      // Get the appropriate provider
      const provider = this.getProvider(model);
      const providerType = ProviderFactory.getProviderTypeFromModel(model);

      // Process the input image if provided (for Sora/Veo single image)
      if (inputReferencePath) {
        console.log(`Processing uploaded image for video ${videoId}, target size: ${size}`);
        processedImagePath = await resizeAndPadImage(inputReferencePath, size);
      }

      // Process reference images for Veo (up to 3)
      if (referenceImagePaths && referenceImagePaths.length > 0) {
        console.log(`Processing ${referenceImagePaths.length} reference images for Veo video ${videoId}`);
        processedReferenceImages = await Promise.all(
          referenceImagePaths.map(path => resizeAndPadImage(path, size))
        );
      }

      // Process last frame for Veo interpolation
      if (lastFramePath) {
        console.log(`Processing last frame for Veo interpolation video ${videoId}`);
        processedLastFrame = await resizeAndPadImage(lastFramePath, size);
      }

      // Convert size format (e.g., "1280x720" -> "16:9")
      const aspectRatio = this.sizeToAspectRatio(size);

      // Create video using provider
      const providerResponse = await provider.createVideo({
        prompt,
        model,
        size, // For Sora (e.g., "1280x720")
        aspectRatio, // For Veo (e.g., "16:9")
        duration: seconds,
        resolution,
        negativePrompt,
        inputReferencePath: processedImagePath,
        lastFramePath: processedLastFrame,
        referenceImagePaths: processedReferenceImages.length > 0 ? processedReferenceImages : undefined,
        generateAudio,
        personGeneration,
      });

      const cost = calculateVideoCost(model, size, seconds, generateAudio);

      // Save all reference/input images permanently for gallery display
      let savedRefImagePaths: string[] = [];
      
      // Save style reference images (Veo reference-images mode)
      if (processedReferenceImages.length > 0) {
        processedReferenceImages.forEach((tempPath, index) => {
          const permanentPath = join(this.videosDir, 'reference-images', `${videoId}_styleref${index}.jpg`);
          copyFileSync(tempPath, permanentPath);
          savedRefImagePaths.push(permanentPath);
        });
        console.log(`Saved ${processedReferenceImages.length} style reference images`);
      }
      
      // Save first frame (Veo image-to-video or interpolation)
      if (processedImagePath) {
        const permanentPath = join(this.videosDir, 'reference-images', `${videoId}_first.jpg`);
        copyFileSync(processedImagePath, permanentPath);
        savedRefImagePaths.push(permanentPath);
        console.log(`Saved first frame image`);
      }
      
      // Save last frame (Veo interpolation)
      if (processedLastFrame) {
        const permanentPath = join(this.videosDir, 'reference-images', `${videoId}_last.jpg`);
        copyFileSync(processedLastFrame, permanentPath);
        savedRefImagePaths.push(permanentPath);
        console.log(`Saved last frame image`);
      }
      
      if (savedRefImagePaths.length > 0) {
        console.log(`Total ${savedRefImagePaths.length} reference images saved for video ${videoId}`);
      }

      const video: Video = {
        id: videoId,
        user_id: userId,
        provider: providerType,
        provider_video_id: providerResponse.id,
        openai_video_id: providerType === 'sora' ? providerResponse.id : undefined,
        prompt,
        model,
        size,
        seconds,
        status: providerResponse.status,
        progress: providerResponse.progress,
        created_at: providerResponse.created_at,
        has_input_reference: !!inputReferencePath || processedReferenceImages.length > 0,
        has_audio: providerType === 'veo' ? generateAudio : undefined,
        reference_image_paths: savedRefImagePaths.length > 0 ? JSON.stringify(savedRefImagePaths) : undefined,
        cost
      };

      this.db.createVideo(video);
      this.startPolling(videoId);

      return video;
    } finally {
      // Clean up temp processed images
      if (processedImagePath) {
        await cleanupTempImage(processedImagePath);
      }
      if (processedLastFrame) {
        await cleanupTempImage(processedLastFrame);
      }
      for (const imagePath of processedReferenceImages) {
        await cleanupTempImage(imagePath);
      }
    }
  }

  private sizeToAspectRatio(size: string): string {
    // Convert size strings to aspect ratios
    // 1280x720, 1920x1080 -> 16:9
    // 720x1280, 1080x1920 -> 9:16
    const [width, height] = size.split('x').map(Number);
    
    if (width > height) {
      return '16:9';
    } else {
      return '9:16';
    }
  }

  async remixVideo(
    userId: string,
    originalVideoId: string,
    prompt: string
  ): Promise<Video> {
    const originalVideo = this.db.getVideo(originalVideoId);
    if (!originalVideo) {
      throw new Error('Original video not found');
    }

    if (originalVideo.user_id !== userId) {
      throw new Error('Not authorized to remix this video');
    }

    // Get the provider
    const provider = this.getProvider(originalVideo.model);
    const providerType = ProviderFactory.getProviderTypeFromModel(originalVideo.model);

    // Check if provider supports remix
    if (!provider.remixVideo) {
      throw new Error(`${providerType} does not support video remixing`);
    }

    const videoId = randomUUID();

    // Create remix using provider
    const providerResponse = await provider.remixVideo(originalVideo.provider_video_id, prompt);

    const cost = calculateVideoCost(originalVideo.model, originalVideo.size, originalVideo.seconds);

    const video: Video = {
      id: videoId,
      user_id: userId,
      provider: providerType,
      provider_video_id: providerResponse.id,
      openai_video_id: providerType === 'sora' ? providerResponse.id : undefined,
      prompt,
      model: originalVideo.model,
      size: originalVideo.size,
      seconds: originalVideo.seconds,
      status: providerResponse.status,
      progress: providerResponse.progress,
      created_at: providerResponse.created_at,
      remix_of: originalVideoId,
      cost
    };

    this.db.createVideo(video);
    this.startPolling(videoId);

    return video;
  }

  async continueFromVideo(
    userId: string,
    originalVideoId: string,
    prompt: string,
    model?: string,
    seconds?: string
  ): Promise<Video> {
    const originalVideo = this.db.getVideo(originalVideoId);
    if (!originalVideo) {
      throw new Error('Original video not found');
    }

    if (originalVideo.user_id !== userId) {
      throw new Error('Not authorized to continue from this video');
    }

    if (originalVideo.status !== 'completed' || !originalVideo.file_path) {
      throw new Error('Original video must be completed');
    }

    const videoModel = model || originalVideo.model;
    const videoDuration = seconds || originalVideo.seconds;
    const provider = this.getProvider(videoModel);
    const providerType = ProviderFactory.getProviderTypeFromModel(videoModel);

    // Check if provider supports native extension (Veo does, Sora doesn't)
    if (provider.extendVideo && originalVideo.provider === providerType) {
      // Use native extension (for Veo)
      console.log(`Using native extension for ${providerType} video`);
      
      const videoId = randomUUID();
      const extensionResponse = await provider.extendVideo(
        originalVideo.provider_video_id,
        prompt,
        videoDuration
      );

      const cost = calculateVideoCost(videoModel, originalVideo.size, videoDuration, originalVideo.has_audio !== false);

      const video: Video = {
        id: videoId,
        user_id: userId,
        provider: providerType,
        provider_video_id: extensionResponse.id,
        openai_video_id: providerType === 'sora' ? extensionResponse.id : undefined,
        prompt,
        model: videoModel,
        size: originalVideo.size,
        seconds: videoDuration,
        status: extensionResponse.status,
        progress: extensionResponse.progress,
        created_at: extensionResponse.created_at,
        has_audio: originalVideo.has_audio,
        cost
      };

      this.db.createVideo(video);
      this.startPolling(videoId);

      return video;
    } else {
      // Use last-frame approach (for Sora or cross-provider continuation)
      const frameId = randomUUID();
      const framePath = join(this.videosDir, `${frameId}_lastframe.jpg`);
      
      try {
        await extractLastFrame(originalVideo.file_path, framePath);
      } catch (error) {
        console.error('Error extracting last frame:', error);
        throw new Error('Failed to extract last frame from video');
      }

      try {
        // Create new video using the extracted frame as reference
        return await this.createVideo(
          userId,
          prompt,
          videoModel as any,
          originalVideo.size,
          videoDuration,
          framePath
        );
      } finally {
        // Clean up the extracted frame after use
        await cleanupTempImage(framePath);
      }
    }
  }

  async getVideoStatus(videoId: string): Promise<Video | null> {
    return this.db.getVideo(videoId);
  }

  async listVideos(userId: string, limit = 50, offset = 0): Promise<Video[]> {
    return this.db.getVideosByUser(userId, limit, offset);
  }

  async deleteVideo(videoId: string, userId: string): Promise<boolean> {
    const video = this.db.getVideo(videoId);
    if (!video) return false;
    if (video.user_id !== userId) return false;

    // Stop polling if active
    this.stopPolling(videoId);

    // Delete from database
    this.db.deleteVideo(videoId);

    // Note: We're keeping the files on disk for now
    // You could add file deletion here if needed

    return true;
  }

  private startPolling(videoId: string): void {
    // Poll every 5 seconds
    const interval = setInterval(async () => {
      await this.pollVideoStatus(videoId);
    }, 5000);

    this.pollingJobs.set(videoId, interval);

    // Initial poll immediately
    this.pollVideoStatus(videoId);
  }

  /**
   * Force poll a video's status immediately
   * Useful for stuck videos or manual refresh
   */
  async forceCheckStatus(videoId: string): Promise<Video | null> {
    const video = this.db.getVideo(videoId);
    if (!video) {
      return null;
    }

    console.log('\n========== FORCE CHECK STATUS ==========');
    console.log(`Video ID: ${videoId}`);
    console.log(`OpenAI Video ID: ${video.openai_video_id}`);
    console.log(`Current Status: ${video.status}`);
    console.log(`Current Progress: ${video.progress}%`);

    // Poll the status immediately with logging enabled
    await this.pollVideoStatus(videoId, true);

    // If video is not completed/failed and not currently polling, restart polling
    const updatedVideo = this.db.getVideo(videoId);
    if (updatedVideo && updatedVideo.status !== 'completed' && updatedVideo.status !== 'failed') {
      if (!this.pollingJobs.has(videoId)) {
        console.log(`Restarting polling for stuck video ${videoId}`);
        this.startPolling(videoId);
      }
    }

    console.log(`Updated Status: ${updatedVideo?.status}`);
    console.log(`Updated Progress: ${updatedVideo?.progress}%`);
    console.log('========================================\n');

    return updatedVideo;
  }

  private stopPolling(videoId: string): void {
    const interval = this.pollingJobs.get(videoId);
    if (interval) {
      clearInterval(interval);
      this.pollingJobs.delete(videoId);
    }
  }

  private async pollVideoStatus(videoId: string, isForceCheck: boolean = false): Promise<void> {
    try {
      const video = this.db.getVideo(videoId);
      if (!video) {
        this.stopPolling(videoId);
        return;
      }

      if (video.status === 'completed' || video.status === 'failed') {
        this.stopPolling(videoId);
        return;
      }

      // Get the appropriate provider
      const provider = this.getProvider(video.model);

      // Get status from provider
      const providerResponse = await provider.getVideoStatus(video.provider_video_id);

      // Log raw API response only for forced checks
      if (isForceCheck) {
        console.log('--- RAW PROVIDER API RESPONSE ---');
        console.log(JSON.stringify(providerResponse, null, 2));
        console.log('--- END RAW RESPONSE ---');
      }

      const updates: Partial<Video> = {
        status: providerResponse.status,
        progress: providerResponse.progress
      };

      if (providerResponse.status === 'completed') {
        // Download the video using provider
        try {
          const downloadResult = await provider.downloadVideo(video.provider_video_id, videoId);
          
          updates.file_path = downloadResult.videoPath;
          updates.thumbnail_path = downloadResult.thumbnailPath;
          updates.completed_at = Date.now();
        } catch (error) {
          console.error(`Error downloading video ${videoId}:`, error);
          updates.status = 'failed';
          updates.error_message = 'Failed to download video';
        }
      } else if (providerResponse.status === 'failed') {
        updates.error_message = providerResponse.error || 'Video generation failed';
      }

      this.db.updateVideo(videoId, updates);

      // Emit event (will be handled by WebSocket service)
      this.emitVideoUpdate(video.user_id, videoId, updates);

    } catch (error: any) {
      if (isForceCheck) {
        console.error(`Error during force check for video ${videoId}:`);
        console.error('Error details:', error.response?.data || error.message || error);
      } else {
        console.error(`Error polling video ${videoId}:`, error);
      }
    }
  }

  private async downloadVideo(openaiVideoId: string, videoId: string): Promise<string> {
    const response = await axios.get(
      `${this.baseURL}/videos/${openaiVideoId}/content`,
      {
        headers: this.headers,
        responseType: 'stream'
      }
    );

    const filePath = join(this.videosDir, `${videoId}.mp4`);
    const writer = createWriteStream(filePath);

    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      writer.on('finish', () => resolve(filePath));
      writer.on('error', reject);
    });
  }

  private async downloadThumbnail(openaiVideoId: string, videoId: string): Promise<string> {
    try {
      const response = await axios.get(
        `${this.baseURL}/videos/${openaiVideoId}/content?variant=thumbnail`,
        {
          headers: this.headers,
          responseType: 'stream'
        }
      );

      const filePath = join(this.videosDir, `${videoId}_thumb.webp`);
      const writer = createWriteStream(filePath);

      return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('Error downloading thumbnail:', error);
      return '';
    }
  }

  private emitVideoUpdate(userId: string, videoId: string, updates: Partial<Video>): void {
    // This will be connected to WebSocket service
    // For now, just a placeholder
    const io = (global as any).io;
    if (io) {
      io.to(`user_${userId}`).emit('video_update', {
        video_id: videoId,
        updates
      });
    }
  }

  getCostStats(userId: string): CostStats {
    return this.db.getCostStats(userId);
  }

  shutdown(): void {
    // Stop all polling jobs
    for (const [videoId] of this.pollingJobs) {
      this.stopPolling(videoId);
    }
  }
}

