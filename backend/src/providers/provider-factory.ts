import { BaseVideoProvider } from './base-provider';
import { SoraProvider } from './sora-provider';
import { VeoProvider } from './veo-provider';

export type ProviderType = 'sora' | 'veo';

export class ProviderFactory {
  private static providers: Map<string, BaseVideoProvider> = new Map();

  static createProvider(
    providerType: ProviderType,
    apiKey: string,
    videosDir: string
  ): BaseVideoProvider {
    // Create a unique key for caching
    const cacheKey = `${providerType}:${apiKey}`;

    // Return cached provider if exists
    if (this.providers.has(cacheKey)) {
      return this.providers.get(cacheKey)!;
    }

    // Create new provider
    let provider: BaseVideoProvider;

    switch (providerType) {
      case 'sora':
        provider = new SoraProvider(apiKey, videosDir);
        break;
      case 'veo':
        provider = new VeoProvider(apiKey, videosDir);
        break;
      default:
        throw new Error(`Unknown provider type: ${providerType}`);
    }

    // Cache the provider
    this.providers.set(cacheKey, provider);

    return provider;
  }

  static getProviderForModel(model: string, apiKeys: { openai: string; google: string }, videosDir: string): BaseVideoProvider {
    // Determine provider based on model name
    if (model.startsWith('sora-')) {
      return this.createProvider('sora', apiKeys.openai, videosDir);
    } else if (model.startsWith('veo-')) {
      return this.createProvider('veo', apiKeys.google, videosDir);
    } else {
      throw new Error(`Unknown model: ${model}`);
    }
  }

  static getSupportedModels(): Record<ProviderType, string[]> {
    return {
      sora: ['sora-2', 'sora-2-pro'],
      veo: [
        'veo-3.1-generate-preview',
        'veo-3.1-fast-generate-preview',
        'veo-3-generate-preview',
        'veo-3-fast-generate-preview',
      ],
    };
  }

  static getProviderTypeFromModel(model: string): ProviderType {
    if (model.startsWith('sora-')) return 'sora';
    if (model.startsWith('veo-')) return 'veo';
    throw new Error(`Cannot determine provider for model: ${model}`);
  }
}

