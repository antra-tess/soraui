/**
 * Calculate the cost of a Sora video generation
 * Based on OpenAI's Sora pricing (estimated rates)
 * 
 * Pricing structure:
 * - sora-2: $0.10 per second (base)
 * - sora-2-pro: $0.20 per second (2x base)
 * - Resolution multipliers:
 *   - 720p (1280x720): 1.0x
 *   - 1080p (1920x1080): 1.5x
 *   - Portrait modes: same as landscape
 */

export function calculateVideoCost(
  model: string,
  size: string,
  seconds: string
): number {
  const duration = parseInt(seconds) || 0;
  
  // Base cost per second
  const baseCostPerSecond = model === 'sora-2-pro' ? 0.20 : 0.10;
  
  // Resolution multiplier
  let resolutionMultiplier = 1.0;
  if (size.includes('1920') || size.includes('1080')) {
    resolutionMultiplier = 1.5;
  }
  
  // Calculate total cost
  const cost = duration * baseCostPerSecond * resolutionMultiplier;
  
  // Round to 2 decimal places
  return Math.round(cost * 100) / 100;
}

