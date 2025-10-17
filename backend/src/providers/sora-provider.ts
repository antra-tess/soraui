import {
  BaseVideoProvider,
  VideoGenerationConfig,
  ProviderVideoResponse,
  ProviderCapabilities,
} from './base-provider';
import axios from 'axios';
import FormData from 'form-data';
import { createReadStream, createWriteStream } from 'fs';
import { join } from 'path';

export class SoraProvider extends BaseVideoProvider {
  private baseURL = 'https://api.openai.com/v1';

  getProviderName(): string {
    return 'sora';
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsAudio: false,
      supportsRemix: true,
      supportsExtension: true,
      supportsInterpolation: false,
      supportsMultipleReferenceImages: false,
      maxReferenceImages: 1,
      maxDuration: 12,
      supportedAspectRatios: ['16:9', '9:16'],
      supportedResolutions: ['1280x720', '1920x1080', '720x1280', '1080x1920'],
      supportedDurations: ['4', '8', '12'],
    };
  }

  validateConfig(config: VideoGenerationConfig): void {
    const caps = this.getCapabilities();

    if (!caps.supportedDurations.includes(config.duration)) {
      throw new Error(
        `Duration ${config.duration} not supported. Use: ${caps.supportedDurations.join(', ')}`
      );
    }

    if (!['sora-2', 'sora-2-pro'].includes(config.model)) {
      throw new Error('Model must be sora-2 or sora-2-pro');
    }
  }

  async createVideo(config: VideoGenerationConfig): Promise<ProviderVideoResponse> {
    this.validateConfig(config);

    const formData = new FormData();
    formData.append('model', config.model);
    formData.append('prompt', config.prompt);
    formData.append('size', config.size); // Use the actual size (e.g., "1280x720")
    formData.append('seconds', config.duration);

    if (config.inputReferencePath) {
      formData.append('input_reference', createReadStream(config.inputReferencePath));
    }

    console.log('Sending video creation request to OpenAI...');
    console.log(`Model: ${config.model}, Size: ${config.size}, Seconds: ${config.duration}`);
    console.log(`Has input_reference: ${!!config.inputReferencePath}`);

    const response = await axios.post(`${this.baseURL}/videos`, formData, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...formData.getHeaders(),
      },
    });

    const openaiVideo = response.data;
    console.log('OpenAI response:', JSON.stringify(openaiVideo, null, 2));

    return {
      id: openaiVideo.id,
      status: openaiVideo.status as any,
      progress: openaiVideo.progress || 0,
      created_at: openaiVideo.created_at,
      completed_at: openaiVideo.completed_at,
      error: openaiVideo.error?.message,
      metadata: openaiVideo,
    };
  }

  async getVideoStatus(providerVideoId: string): Promise<ProviderVideoResponse> {
    const response = await axios.get(`${this.baseURL}/videos/${providerVideoId}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const openaiVideo = response.data;

    return {
      id: openaiVideo.id,
      status: openaiVideo.status as any,
      progress: openaiVideo.progress || 0,
      created_at: openaiVideo.created_at,
      completed_at: openaiVideo.completed_at,
      error: openaiVideo.error?.message,
      metadata: openaiVideo,
    };
  }

  async downloadVideo(
    providerVideoId: string,
    localVideoId: string
  ): Promise<{ videoPath: string; thumbnailPath?: string }> {
    const response = await axios.get(`${this.baseURL}/videos/${providerVideoId}/content`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      responseType: 'stream',
    });

    const filePath = join(this.videosDir, `${localVideoId}.mp4`);
    const writer = createWriteStream(filePath);

    await new Promise<void>((resolve, reject) => {
      response.data.pipe(writer);
      writer.on('finish', () => resolve());
      writer.on('error', reject);
    });

    const thumbnailPath = await this.downloadThumbnail(providerVideoId, localVideoId);

    return { videoPath: filePath, thumbnailPath: thumbnailPath || undefined };
  }

  async downloadThumbnail(providerVideoId: string, localVideoId: string): Promise<string | null> {
    try {
      const response = await axios.get(
        `${this.baseURL}/videos/${providerVideoId}/content?variant=thumbnail`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        }
      );

      const filePath = join(this.videosDir, `${localVideoId}_thumb.webp`);
      const writer = createWriteStream(filePath);

      await new Promise<void>((resolve, reject) => {
        response.data.pipe(writer);
        writer.on('finish', () => resolve());
        writer.on('error', reject);
      });

      return filePath;
    } catch (error) {
      console.error('Error downloading thumbnail:', error);
      return null;
    }
  }

  async remixVideo(providerVideoId: string, prompt: string): Promise<ProviderVideoResponse> {
    const formData = new FormData();
    formData.append('prompt', prompt);

    const response = await axios.post(
      `${this.baseURL}/videos/${providerVideoId}/remix`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...formData.getHeaders(),
        },
      }
    );

    const openaiVideo = response.data;

    return {
      id: openaiVideo.id,
      status: openaiVideo.status as any,
      progress: openaiVideo.progress || 0,
      created_at: openaiVideo.created_at,
      completed_at: openaiVideo.completed_at,
      error: openaiVideo.error?.message,
      metadata: openaiVideo,
    };
  }

  async extendVideo(
    providerVideoId: string,
    prompt: string,
    duration: string
  ): Promise<ProviderVideoResponse> {
    // For Sora, extension is done via the continue endpoint
    // This is actually handled differently - we extract the last frame and create a new video
    throw new Error('Extension is handled via continueFromVideo in the service layer');
  }
}

