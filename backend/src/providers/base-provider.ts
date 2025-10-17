import { Video } from '../types';

export interface VideoGenerationConfig {
  prompt: string;
  model: string;
  size: string; // e.g., "1280x720" for Sora
  aspectRatio: string; // e.g., "16:9" for Veo
  duration: string;
  resolution?: string; // e.g., "720p" for Veo
  negativePrompt?: string;
  inputReferencePath?: string;
  lastFramePath?: string;
  referenceImagePaths?: string[];
  sourceVideoId?: string; // For remixing or extending
  generateAudio?: boolean; // For Veo - whether to generate audio (default: true)
  personGeneration?: 'allow_all' | 'allow_adult' | 'dont_allow'; // For Veo person generation control
}

export interface ProviderVideoResponse {
  id: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  created_at: number;
  completed_at?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ProviderCapabilities {
  supportsAudio: boolean;
  supportsRemix: boolean;
  supportsExtension: boolean;
  supportsInterpolation: boolean;
  supportsMultipleReferenceImages: boolean;
  maxReferenceImages: number;
  maxDuration: number;
  supportedAspectRatios: string[];
  supportedResolutions: string[];
  supportedDurations: string[];
}

export abstract class BaseVideoProvider {
  protected apiKey: string;
  protected videosDir: string;

  constructor(apiKey: string, videosDir: string) {
    this.apiKey = apiKey;
    this.videosDir = videosDir;
  }

  /**
   * Get provider-specific capabilities
   */
  abstract getCapabilities(): ProviderCapabilities;

  /**
   * Create a new video generation
   */
  abstract createVideo(
    config: VideoGenerationConfig
  ): Promise<ProviderVideoResponse>;

  /**
   * Get the status of a video generation
   */
  abstract getVideoStatus(providerVideoId: string): Promise<ProviderVideoResponse>;

  /**
   * Download the generated video
   */
  abstract downloadVideo(
    providerVideoId: string,
    localVideoId: string
  ): Promise<{ videoPath: string; thumbnailPath?: string }>;

  /**
   * Download thumbnail (if supported)
   */
  abstract downloadThumbnail(
    providerVideoId: string,
    localVideoId: string
  ): Promise<string | null>;

  /**
   * Remix/modify an existing video (if supported)
   */
  abstract remixVideo?(
    providerVideoId: string,
    prompt: string
  ): Promise<ProviderVideoResponse>;

  /**
   * Extend an existing video (if supported)
   */
  abstract extendVideo?(
    providerVideoId: string,
    prompt: string,
    duration: string,
    localVideoPath?: string,
    storedMetadata?: string,
    originalAspectRatio?: string
  ): Promise<ProviderVideoResponse>;

  /**
   * Get provider name
   */
  abstract getProviderName(): string;

  /**
   * Validate configuration for this provider
   */
  abstract validateConfig(config: VideoGenerationConfig): void;
}

