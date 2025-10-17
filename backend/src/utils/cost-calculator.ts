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
 * Veo Pricing (Google):
 * - veo-3.1-generate-preview: $0.40/second (with audio)
 * - veo-3.1-fast-generate-preview: $0.15/second (with audio)
 * - veo-3-generate-preview: $0.40/second (with audio)
 * - veo-3-fast-generate-preview: $0.15/second (with audio)
 * 
 * Note: Veo pricing assumes audio generation (default behavior)
 * Audio-only mode would be half price but we don't expose that option
 */

export function calculateVideoCost(
  model: string,
  size: string,
  seconds: string,
  generateAudio: boolean = true
): number {
  const duration = parseInt(seconds) || 0;
  
  // Determine provider and pricing
  if (model.startsWith('veo-')) {
    // Veo pricing
    let baseCostPerSecond: number;
    
    if (model.includes('fast')) {
      // Veo Fast: $0.15 with audio, $0.10 video only
      baseCostPerSecond = generateAudio ? 0.15 : 0.10;
    } else {
      // Veo standard: $0.40 with audio, $0.20 video only
      baseCostPerSecond = generateAudio ? 0.40 : 0.20;
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

