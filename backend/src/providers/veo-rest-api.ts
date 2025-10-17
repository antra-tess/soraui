import axios from 'axios';

/**
 * Direct REST API calls to Google's Veo API
 * Bypasses the SDK which has inconsistent behavior
 * Based on intercepted requests from AI Studio
 */

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export interface VeoVideoGenerationRequest {
  prompt: string;
  aspectRatio?: string;
  resolution: string;
  video?: { uri: string }; // For extensions
  forceAspectRatio?: boolean; // Force aspectRatio even for extensions
}

export interface VeoOperation {
  name: string;
  done?: boolean;
  error?: any;
  response?: {
    '@type': string;
    generateVideoResponse?: {
      generatedSamples?: Array<{
        video?: { uri: string };
      }>;
    };
  };
}

export class VeoRestAPI {
  constructor(private apiKey: string) {}

  async generateVideo(model: string, request: VeoVideoGenerationRequest): Promise<VeoOperation> {
    const instances: any[] = [{
      prompt: request.prompt,
    }];

    // For extensions, add video in instances
    if (request.video) {
      instances[0].video = request.video;
    }

    const parameters: any = {
      sampleCount: 1,
      resolution: request.resolution,
    };

    // Always add aspectRatio if provided (extensions need it to match original video!)
    if (request.aspectRatio) {
      parameters.aspectRatio = request.aspectRatio;
    }

    const payload = { instances, parameters };

    console.log('Veo REST API Request:', JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(
        `${BASE_URL}/models/${model}:predictLongRunning`,
        payload,
        {
          params: { key: this.apiKey },
          headers: { 'Content-Type': 'application/json' }
        }
      );

      console.log('Veo REST API Response:', JSON.stringify(response.data, null, 2));

      return response.data;
    } catch (error: any) {
      console.error('Veo REST API Error:');
      console.error('Status:', error.response?.status);
      console.error('Error data:', JSON.stringify(error.response?.data, null, 2));
      
      // Throw a more detailed error with Google's message
      const googleError = error.response?.data?.error;
      if (googleError) {
        throw new Error(`Veo API Error: ${googleError.message || JSON.stringify(googleError)}`);
      }
      throw error;
    }
  }

  async getOperation(operationName: string): Promise<VeoOperation> {
    const response = await axios.get(
      `${BASE_URL}/${operationName}`,
      { params: { key: this.apiKey } }
    );

    return response.data;
  }
}

