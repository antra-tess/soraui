import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { promises as fs } from 'fs';
import { join } from 'path';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Extract the last frame from a video file
 * @param videoPath Path to the video file
 * @param outputPath Path where to save the extracted frame
 * @returns Promise that resolves when frame is extracted
 */
export function extractLastFrame(videoPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        count: 1,
        filename: 'last-frame.jpg',
        folder: join(outputPath, '..'),
        timestamps: ['99%'] // Get frame at 99% (near the end)
      })
      .on('end', async () => {
        // Rename to target filename
        const tempPath = join(join(outputPath, '..'), 'last-frame.jpg');
        try {
          await fs.rename(tempPath, outputPath);
          resolve();
        } catch (err) {
          reject(err);
        }
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

