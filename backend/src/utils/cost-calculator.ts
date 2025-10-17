/**
 * Calculate the cost of video generation
 * 
 * Sora Pricing (OpenAI - estimated):
 * - sora-2: $0.10 per second (base)
 * - sora-2-pro: $0.20 per second (2x base)
 * - Resolution multipliers:
 *   - 720p: 1.0x
 *   - 1080p: 1.5x
 * 
 * Veo Pricing (Google - SDK v1.25+):
 * - veo-3.1-generate-preview: $0.40/second (always includes audio)
 * - veo-3.1-fast-generate-preview: $0.15/second (always includes audio)
 * - veo-3-generate-preview: $0.40/second (always includes audio)
 * - veo-3-fast-generate-preview: $0.15/second (always includes audio)
 * 
 * Note: Audio generation is always enabled in SDK v1.25+
 * Cannot be disabled via API
 */

export function calculateVideoCost(
  model: string,
  size: string,
  seconds: string,
  generateAudio: boolean = false // Default off for cost savings
): number {
  const duration = parseInt(seconds) || 0;
  
  // Determine provider and pricing
  if (model.startsWith('veo-')) {
    // Veo pricing - always includes audio in SDK v1.25+
    let baseCostPerSecond: number;
    
    if (model.includes('fast')) {
      baseCostPerSecond = 0.15; // Veo Fast with audio
    } else {
      baseCostPerSecond = 0.40; // Veo standard with audio
    }
    
    const cost = duration * baseCostPerSecond;
    return Math.round(cost * 100) / 100;
  } else {
    // Sora pricing (no audio option)
    const baseCostPerSecond = model === 'sora-2-pro' ? 0.20 : 0.10;
    
    // Resolution multiplier for Sora
    let resolutionMultiplier = 1.0;
    if (size.includes('1920') || size.includes('1080')) {
      resolutionMultiplier = 1.5;
    }
    
    const cost = duration * baseCostPerSecond * resolutionMultiplier;
    return Math.round(cost * 100) / 100;
  }
}

