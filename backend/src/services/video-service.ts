import { VideoDatabase } from '../db/database';
import { Video, CostStats } from '../types';
import { createWriteStream, mkdirSync, existsSync, createReadStream } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import axios from 'axios';
import FormData from 'form-data';
import { calculateVideoCost } from '../utils/cost-calculator';
import { extractLastFrame } from '../utils/video-utils';
import { resizeAndPadImage, cleanupTempImage } from '../utils/image-utils';

export class VideoService {
  private apiKey: string;
  private db: VideoDatabase;
  private videosDir: string;
  private pollingJobs: Map<string, NodeJS.Timeout>;
  private baseURL = 'https://api.openai.com/v1';

  constructor(openaiApiKey: string, db: VideoDatabase, videosDir: string) {
    this.apiKey = openaiApiKey;
    this.db = db;
    this.videosDir = videosDir;
    this.pollingJobs = new Map();

    // Ensure videos directory exists
    if (!existsSync(videosDir)) {
      mkdirSync(videosDir, { recursive: true });
    }
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
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  async createVideo(
    userId: string,
    prompt: string,
    model: 'sora-2' | 'sora-2-pro',
    size: string = '1280x720',
    seconds: string = '8',
    inputReferencePath?: string
  ): Promise<Video> {
    const videoId = randomUUID();
    let processedImagePath: string | undefined;

    try {
      // Process the input image if provided
      if (inputReferencePath) {
        console.log(`Processing uploaded image for video ${videoId}, target size: ${size}`);
        processedImagePath = await resizeAndPadImage(inputReferencePath, size);
      }

      // Create video with OpenAI Sora API
      const formData = new FormData();
      formData.append('model', model);
      formData.append('prompt', prompt);
      formData.append('size', size);
      formData.append('seconds', seconds);

      if (processedImagePath) {
        formData.append('input_reference', createReadStream(processedImagePath));
      }

      const response = await axios.post(`${this.baseURL}/videos`, formData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders()
        }
      });

      const openaiVideo = response.data;

      const cost = calculateVideoCost(model, size, seconds);

      const video: Video = {
        id: videoId,
        user_id: userId,
        openai_video_id: openaiVideo.id,
        prompt,
        model,
        size,
        seconds,
        status: openaiVideo.status as any,
        progress: openaiVideo.progress || 0,
        created_at: openaiVideo.created_at,
        has_input_reference: !!inputReferencePath,
        cost
      };

      this.db.createVideo(video);
      this.startPolling(videoId);

      return video;
    } finally {
      // Clean up processed image
      if (processedImagePath) {
        await cleanupTempImage(processedImagePath);
      }
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

    const videoId = randomUUID();

    // Create remix with OpenAI
    const response = await axios.post(
      `${this.baseURL}/videos/${originalVideo.openai_video_id}/remix`,
      { prompt },
      { headers: this.headers }
    );

    const openaiVideo = response.data;

    const cost = calculateVideoCost(originalVideo.model, originalVideo.size, originalVideo.seconds);

    const video: Video = {
      id: videoId,
      user_id: userId,
      openai_video_id: openaiVideo.id,
      prompt,
      model: originalVideo.model,
      size: originalVideo.size,
      seconds: originalVideo.seconds,
      status: openaiVideo.status as any,
      progress: openaiVideo.progress || 0,
      created_at: openaiVideo.created_at,
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
    model?: 'sora-2' | 'sora-2-pro',
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

    // Extract last frame from the video
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
      // The frame will be processed (resized and padded) by createVideo
      const videoModel = model || originalVideo.model;
      const videoDuration = seconds || originalVideo.seconds;
      
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

      // Get status from OpenAI
      const response = await axios.get(
        `${this.baseURL}/videos/${video.openai_video_id}`,
        { headers: this.headers }
      );
      const openaiVideo = response.data;

      // Log raw API response only for forced checks
      if (isForceCheck) {
        console.log('--- RAW OPENAI API RESPONSE ---');
        console.log(JSON.stringify(openaiVideo, null, 2));
        console.log('--- END RAW RESPONSE ---');
      }

      const updates: Partial<Video> = {
        status: openaiVideo.status as any,
        progress: openaiVideo.progress || video.progress
      };

      if (openaiVideo.status === 'completed') {
        // Download the video
        try {
          const videoPath = await this.downloadVideo(video.openai_video_id, videoId);
          const thumbnailPath = await this.downloadThumbnail(video.openai_video_id, videoId);
          
          updates.file_path = videoPath;
          updates.thumbnail_path = thumbnailPath;
          updates.completed_at = Date.now();
        } catch (error) {
          console.error(`Error downloading video ${videoId}:`, error);
          updates.status = 'failed';
          updates.error_message = 'Failed to download video';
        }
      } else if (openaiVideo.status === 'failed') {
        updates.error_message = (openaiVideo as any).error?.message || 'Video generation failed';
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

