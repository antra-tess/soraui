import {
  BaseVideoProvider,
  VideoGenerationConfig,
  ProviderVideoResponse,
  ProviderCapabilities,
} from './base-provider';
import { GoogleGenAI } from '@google/genai';
import { createWriteStream, createReadStream } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

export class VeoProvider extends BaseVideoProvider {
  private client: GoogleGenAI;

  constructor(apiKey: string, videosDir: string) {
    super(apiKey, videosDir);
    this.client = new GoogleGenAI({});
  }

  getProviderName(): string {
    return 'veo';
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsAudio: true, // Veo supports native audio generation!
      supportsRemix: false, // Veo doesn't have remix, but has extension
      supportsExtension: true, // Can extend up to 141 seconds
      supportsInterpolation: true, // First + last frame interpolation
      supportsMultipleReferenceImages: true, // Up to 3 reference images
      maxReferenceImages: 3,
      maxDuration: 8, // Per generation (can extend up to 141s total)
      supportedAspectRatios: ['16:9', '9:16'],
      supportedResolutions: ['720p', '1080p'],
      supportedDurations: ['4', '6', '8'],
    };
  }

  validateConfig(config: VideoGenerationConfig): void {
    const caps = this.getCapabilities();

    if (!caps.supportedDurations.includes(config.duration)) {
      throw new Error(
        `Duration ${config.duration} not supported. Use: ${caps.supportedDurations.join(', ')}`
      );
    }

    if (!['veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview', 'veo-3-generate-preview', 'veo-3-fast-generate-preview'].includes(config.model)) {
      throw new Error('Model must be one of: veo-3.1-generate-preview, veo-3.1-fast-generate-preview, veo-3-generate-preview, veo-3-fast-generate-preview');
    }

    if (config.referenceImagePaths && config.referenceImagePaths.length > caps.maxReferenceImages) {
      throw new Error(`Maximum ${caps.maxReferenceImages} reference images supported`);
    }
  }

  async createVideo(config: VideoGenerationConfig): Promise<ProviderVideoResponse> {
    this.validateConfig(config);

    console.log('Sending video creation request to Google Veo...');
    console.log(`Model: ${config.model}, Aspect: ${config.aspectRatio}, Duration: ${config.duration}s`);
    console.log(`Has input image: ${!!config.inputReferencePath}`);
    console.log(`Has last frame: ${!!config.lastFramePath}`);
    console.log(`Reference images: ${config.referenceImagePaths?.length || 0}`);

    const requestConfig: any = {
      model: config.model,
      prompt: config.prompt,
      config: {
        aspectRatio: config.aspectRatio,
        durationSeconds: parseInt(config.duration, 10), // Must be a number
      },
    };

    // Add resolution if specified
    if (config.resolution) {
      requestConfig.config.resolution = config.resolution;
    }

    // Add negative prompt if specified
    if (config.negativePrompt) {
      requestConfig.config.negativePrompt = config.negativePrompt;
    }

    // Audio generation control (default: true)
    if (config.generateAudio === false) {
      requestConfig.config.generateAudio = false;
    }

    // Note: personGeneration removed - let Veo use its own defaults
    // Veo automatically handles this based on the input type

    // Add input image (for image-to-video)
    if (config.inputReferencePath) {
      const imageBytes = await readFile(config.inputReferencePath);
      requestConfig.image = {
        imageBytes: imageBytes.toString('base64'),
        mimeType: 'image/jpeg',
      };
    }

    // Add last frame (for interpolation)
    if (config.lastFramePath) {
      const lastFrameBytes = await readFile(config.lastFramePath);
      requestConfig.config.lastFrame = {
        imageBytes: lastFrameBytes.toString('base64'),
        mimeType: 'image/jpeg',
      };
    }

    // Add reference images (up to 3)
    if (config.referenceImagePaths && config.referenceImagePaths.length > 0) {
      console.log(`Adding ${config.referenceImagePaths.length} reference images to Veo request`);
      requestConfig.config.referenceImages = await Promise.all(
        config.referenceImagePaths.map(async (path, index) => {
          const imageBytes = await readFile(path);
          console.log(`Reference image ${index + 1}: ${path}, size: ${imageBytes.length} bytes`);
          return {
            image: {
              imageBytes: imageBytes.toString('base64'),
              mimeType: 'image/jpeg',
            },
            referenceType: 'asset',
          };
        })
      );
      console.log(`✅ Reference images added to Veo config`);
    } else {
      console.log('No reference images provided for this Veo video');
    }

    // Start the video generation operation
    const operation = await this.client.models.generateVideos(requestConfig);

    if (!operation.name) {
      throw new Error('Operation name not returned from Veo API');
    }

    console.log('Google Veo response - Operation started:', operation.name);

    return {
      id: operation.name, // Operation name is the ID we'll use to poll
      status: 'queued',
      progress: 0,
      created_at: Math.floor(Date.now() / 1000),
      metadata: { operation },
    };
  }

  async getVideoStatus(operationName: string): Promise<ProviderVideoResponse> {
    // Poll the operation status
    const operation = await this.client.operations.getVideosOperation({
      operation: { name: operationName },
    });

    const done = operation.done || false;
    const hasError = operation.error !== undefined;

    let status: 'queued' | 'in_progress' | 'completed' | 'failed' = 'queued';
    let progress = 0;

    if (hasError) {
      status = 'failed';
      progress = 0;
    } else if (done) {
      status = 'completed';
      progress = 100;
    } else {
      status = 'in_progress';
      // Veo doesn't provide granular progress, so we'll estimate
      progress = 50; // Show as "in progress" without specific percentage
    }

    return {
      id: operationName,
      status,
      progress,
      created_at: Math.floor(Date.now() / 1000),
      completed_at: done ? Math.floor(Date.now() / 1000) : undefined,
      error: hasError ? JSON.stringify(operation.error) : undefined,
      metadata: { operation },
    };
  }

  async downloadVideo(
    operationName: string,
    localVideoId: string
  ): Promise<{ videoPath: string; thumbnailPath?: string }> {
    try {
      console.log(`Downloading Veo video - Operation: ${operationName}`);
      
      // Get the completed operation with the video file
      const operation = await this.client.operations.getVideosOperation({
        operation: { name: operationName },
      });

      console.log('Operation status:', {
        done: operation.done,
        hasResponse: !!operation.response,
        hasVideos: !!operation.response?.generatedVideos,
        videoCount: operation.response?.generatedVideos?.length
      });

      if (!operation.done || !operation.response?.generatedVideos?.[0]?.video) {
        throw new Error('Video not ready or not found in operation response');
      }

      const videoFile = operation.response.generatedVideos[0].video;
      console.log('=== VIDEO FILE OBJECT ===');
      console.log(JSON.stringify(videoFile, null, 2));
      console.log('Video file keys:', Object.keys(videoFile || {}));
      console.log('========================');

      // Video file has a downloadUri property we need to download from
      const downloadUri = (videoFile as any)?.downloadUri || (videoFile as any)?.uri;
      
      if (!downloadUri) {
        console.error('No download URI found. VideoFile:', videoFile);
        throw new Error('Video file does not have a downloadUri or uri property');
      }

      console.log('Downloading from URI:', downloadUri);

      // Download the video from the URI
      // Note: Google file URIs may have auth embedded or use different auth
      const filePath = join(this.videosDir, `${localVideoId}.mp4`);
      const axios = (await import('axios')).default;
      
      // Try with API key as query parameter (Google's file API pattern)
      const downloadUrl = `${downloadUri}${downloadUri.includes('?') ? '&' : '?'}key=${this.apiKey}`;
      
      const response = await axios.get(downloadUrl, { 
        responseType: 'stream'
      });
      
      const writer = createWriteStream(filePath);
      response.data.pipe(writer);
      
      await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => resolve());
        writer.on('error', reject);
      });

      console.log(`✅ Veo video downloaded to: ${filePath}`);

      // Generate thumbnail
      const thumbnailPath = await this.downloadThumbnail(operationName, localVideoId);

      return { 
        videoPath: filePath,
        thumbnailPath: thumbnailPath || undefined
      };
    } catch (error: any) {
      console.error('Error in Veo downloadVideo:', error.message);
      console.error('Error details:', error.response?.data || error.response || 'No response data');
      throw error;
    }
  }

  async downloadThumbnail(operationName: string, localVideoId: string): Promise<string | null> {
    try {
      // Veo doesn't provide thumbnails directly, so extract from the video file
      const videoPath = join(this.videosDir, `${localVideoId}.mp4`);
      const thumbnailPath = join(this.videosDir, `${localVideoId}_thumb.webp`);
      
      // Check if video exists
      const { existsSync } = await import('fs');
      if (!existsSync(videoPath)) {
        console.warn(`Video file not found for thumbnail extraction: ${videoPath}`);
        return null;
      }

      // Extract thumbnail using ffmpeg (import from video-utils)
      const { extractLastFrame } = await import('../utils/video-utils.js');
      
      await extractLastFrame(videoPath, thumbnailPath);
      console.log(`✅ Generated thumbnail for Veo video: ${thumbnailPath}`);
      
      return thumbnailPath;
    } catch (error) {
      console.error('Error generating Veo thumbnail:', error);
      return null;
    }
  }

  async remixVideo(providerVideoId: string, prompt: string): Promise<ProviderVideoResponse> {
    throw new Error('Veo does not support video remixing. Use video extension instead.');
  }

  async extendVideo(
    operationName: string,
    prompt: string,
    duration: string
  ): Promise<ProviderVideoResponse> {
    // Get the original video
    const operation = await this.client.operations.getVideosOperation({
      operation: { name: operationName },
    });

    if (!operation.done || !operation.response?.generatedVideos?.[0]?.video) {
      throw new Error('Original video not ready');
    }

    const videoFile = operation.response.generatedVideos[0].video;

    // Start extension operation
    const extensionOperation = await this.client.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      video: videoFile,
      prompt: prompt,
      config: {
        durationSeconds: parseInt(duration, 10), // Must be a number
        // Note: Resolution is not supported for extensions, Veo uses original video resolution
      },
    } as any); // Cast to any - SDK types may not include video extension yet

    if (!extensionOperation.name) {
      throw new Error('Extension operation name not returned from Veo API');
    }

    return {
      id: extensionOperation.name,
      status: 'queued',
      progress: 0,
      created_at: Math.floor(Date.now() / 1000),
      metadata: { operation: extensionOperation },
    };
  }
}

