import sharp from 'sharp';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

/**
 * Resize and pad an image to fit the target resolution without cropping
 * @param inputPath Path to the input image
 * @param targetSize Target size in format "widthxheight" (e.g., "1280x720")
 * @returns Path to the processed image
 */
export async function resizeAndPadImage(inputPath: string, targetSize: string): Promise<string> {
  const [widthStr, heightStr] = targetSize.split('x');
  const targetWidth = parseInt(widthStr, 10);
  const targetHeight = parseInt(heightStr, 10);

  if (isNaN(targetWidth) || isNaN(targetHeight)) {
    throw new Error(`Invalid size format: ${targetSize}`);
  }

  // Read the input image
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Could not read image dimensions');
  }

  // Calculate the scale factor to fit the image within the target dimensions
  const scaleWidth = targetWidth / metadata.width;
  const scaleHeight = targetHeight / metadata.height;
  const scale = Math.min(scaleWidth, scaleHeight);

  // Calculate the new dimensions (maintaining aspect ratio)
  const newWidth = Math.round(metadata.width * scale);
  const newHeight = Math.round(metadata.height * scale);

  // Resize the image
  const resizedImage = await image
    .resize(newWidth, newHeight, {
      fit: 'inside',
      withoutEnlargement: false
    })
    .toBuffer();

  // Create a black canvas of the target size and composite the resized image on it
  const outputPath = join(tmpdir(), `processed-${randomUUID()}.jpg`);
  
  await sharp({
    create: {
      width: targetWidth,
      height: targetHeight,
      channels: 3,
      background: { r: 0, g: 0, b: 0 } // Black background
    }
  })
    .composite([{
      input: resizedImage,
      gravity: 'center' // Center the image on the canvas
    }])
    .jpeg({ quality: 95 }) // High quality JPEG
    .toFile(outputPath);

  console.log(`Image processed: ${metadata.width}x${metadata.height} -> ${newWidth}x${newHeight} (padded to ${targetWidth}x${targetHeight})`);

  return outputPath;
}

/**
 * Clean up a temporary processed image
 * @param imagePath Path to the temporary image
 */
export async function cleanupTempImage(imagePath: string): Promise<void> {
  try {
    await fs.unlink(imagePath);
  } catch (error) {
    // Ignore errors if file doesn't exist
  }
}

