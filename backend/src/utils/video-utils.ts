import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

// Use system-installed ffmpeg and ffprobe (installed in Docker/system)
// In Alpine Linux (Docker), these are installed to /usr/bin/
const ffmpegPath = process.env.FFMPEG_PATH || '/usr/bin/ffmpeg';
const ffprobePath = process.env.FFPROBE_PATH || '/usr/bin/ffprobe';

try {
  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);
  console.log(`FFmpeg configured: ffmpeg=${ffmpegPath}, ffprobe=${ffprobePath}`);
} catch (error) {
  console.error('Error setting ffmpeg/ffprobe paths:', error);
}

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

/**
 * Extract multiple frames from a video
 * @param videoPath Path to the video file
 * @param count Number of frames to extract (1-10)
 * @returns Array of frame file paths, with last one being the final frame
 */
export async function extractVideoFrames(videoPath: string, count: number): Promise<string[]> {
  const frameCount = Math.min(Math.max(count, 1), 10);
  const tempDir = join(tmpdir(), `sora2-frames-${randomUUID()}`);
  await fs.mkdir(tempDir, { recursive: true });

  // Calculate timestamps
  const timestamps: string[] = [];
  if (frameCount === 1) {
    timestamps.push('99%'); // Final frame only
  } else {
    // Distribute evenly, with last one being final frame
    for (let i = 0; i < frameCount - 1; i++) {
      const percent = (i / (frameCount - 1)) * 100;
      timestamps.push(`${percent.toFixed(0)}%`);
    }
    timestamps.push('99%'); // Always end with final frame
  }

  const framePaths: string[] = [];

  // Extract each frame
  for (let i = 0; i < timestamps.length; i++) {
    const framePath = join(tempDir, `frame_${i}.jpg`);
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          count: 1,
          filename: `frame_${i}.jpg`,
          folder: tempDir,
          timestamps: [timestamps[i]]
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    framePaths.push(framePath);
  }

  return framePaths;
}