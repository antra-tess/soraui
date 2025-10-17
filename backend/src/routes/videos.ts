import { Router, Request } from 'express';
import multer from 'multer';
import { VideoService } from '../services/video-service';
import { AuthRequest } from '../auth/middleware';
import { createReadStream, existsSync } from 'fs';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import jwt from 'jsonwebtoken';
import { extractVideoFrames } from '../utils/video-utils';

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit per file
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

// Support multiple images with different field names
const uploadFields = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5 // Max 5 files (3 reference + 1 first + 1 last)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
}).fields([
  { name: 'input_reference', maxCount: 1 },     // Sora or Veo image-to-video
  { name: 'reference_images', maxCount: 3 },     // Veo style references
  { name: 'first_frame', maxCount: 1 },          // Veo interpolation first
  { name: 'last_frame', maxCount: 1 }            // Veo interpolation last
]);

export function createVideosRouter(videoService: VideoService, videosDir: string, jwtSecret: string): Router {
  const router = Router();

  // Create a new video - use appropriate upload handler
  const createVideoHandler = async (req: AuthRequest, res: any) => {
    try {
      const { 
        prompt, 
        model = 'sora-2', 
        size = '1280x720', 
        seconds = '8', 
        negativePrompt, 
        resolution,
        generateAudio,
        personGeneration,
        veoImageMode
      } = req.body;

      const fileFields = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      console.log('=== CREATE VIDEO REQUEST ===');
      console.log('Body:', { prompt: prompt?.substring(0, 50), model, size, seconds, veoImageMode, generateAudio });
      console.log('Files:', fileFields ? Object.keys(fileFields).map(key => ({
        field: key,
        count: fileFields[key].length,
        files: fileFields[key].map(f => f.originalname)
      })) : 'NO FILES');
      console.log('===========================');

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      // Extract files based on field names and Veo image mode
      let inputReferencePath = fileFields?.input_reference?.[0]?.path;
      const referenceImagePaths = fileFields?.reference_images?.map(f => f.path);
      const firstFramePath = fileFields?.first_frame?.[0]?.path;
      const lastFramePath = fileFields?.last_frame?.[0]?.path;
      
      // For interpolation, use first_frame as inputReference
      if (firstFramePath && !inputReferencePath) {
        inputReferencePath = firstFramePath;
      }

      const video = await videoService.createVideo(
        req.user!.id,
        prompt,
        model,
        size,
        seconds,
        inputReferencePath,
        negativePrompt,
        resolution,
        generateAudio !== 'false' && generateAudio !== false, // Default true
        personGeneration, // Will be determined by provider based on image usage
        referenceImagePaths,
        lastFramePath
      );

      res.json(video);
    } catch (error: any) {
      console.error('Error creating video:', error);
      res.status(500).json({ error: error.message || 'Failed to create video' });
    }
  };

  // Use uploadFields for all video creation to support all image modes
  router.post('/', uploadFields, createVideoHandler);

  // Remix a video
  router.post('/:videoId/remix', async (req: AuthRequest, res) => {
    try {
      const { videoId } = req.params;
      const { prompt } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const video = await videoService.remixVideo(req.user!.id, videoId, prompt);
      res.json(video);
    } catch (error: any) {
      console.error('Error remixing video:', error);
      res.status(500).json({ error: error.message || 'Failed to remix video' });
    }
  });

  // Continue from last frame of a video
  router.post('/:videoId/continue', async (req: AuthRequest, res) => {
    try {
      const { videoId } = req.params;
      const { prompt, model, seconds } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const video = await videoService.continueFromVideo(
        req.user!.id,
        videoId,
        prompt,
        model,
        seconds
      );
      res.json(video);
    } catch (error: any) {
      console.error('Error continuing from video:', error);
      res.status(500).json({ error: error.message || 'Failed to continue from video' });
    }
  });

  // Get video status
  router.get('/:videoId', async (req: AuthRequest, res) => {
    try {
      const { videoId } = req.params;
      const video = await videoService.getVideoStatus(videoId);

      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      if (video.user_id !== req.user!.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      res.json(video);
    } catch (error: any) {
      console.error('Error getting video:', error);
      res.status(500).json({ error: error.message || 'Failed to get video' });
    }
  });

  // List videos
  router.get('/', async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const videos = await videoService.listVideos(req.user!.id, limit, offset);
      res.json({ videos, limit, offset });
    } catch (error: any) {
      console.error('Error listing videos:', error);
      res.status(500).json({ error: error.message || 'Failed to list videos' });
    }
  });

  // Download video content
  router.get('/:videoId/content', async (req: AuthRequest, res) => {
    try {
      const { videoId } = req.params;
      const variant = req.query.variant as string || 'video';

      const video = await videoService.getVideoStatus(videoId);

      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      if (video.user_id !== req.user!.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      if (video.status !== 'completed') {
        return res.status(400).json({ error: 'Video is not ready yet' });
      }

      let filePath: string | undefined;
      let contentType: string;

      if (variant === 'video') {
        filePath = video.file_path;
        contentType = 'video/mp4';
      } else if (variant === 'thumbnail') {
        filePath = video.thumbnail_path;
        contentType = 'image/webp';
      } else {
        return res.status(400).json({ error: 'Invalid variant. Use video or thumbnail' });
      }

      if (!filePath || !existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      // For video files, support range requests (required for Safari)
      if (variant === 'video') {
        const { statSync } = await import('fs');
        const stat = statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
          // Parse Range header
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunksize = (end - start) + 1;

          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': contentType,
          });

          const stream = createReadStream(filePath, { start, end });
          stream.pipe(res);
        } else {
          // No range request - send full file
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes',
          });

          const stream = createReadStream(filePath);
          stream.pipe(res);
        }
      } else {
        // For thumbnails, just stream normally
        res.setHeader('Content-Type', contentType);
        const stream = createReadStream(filePath);
        stream.pipe(res);
      }
    } catch (error: any) {
      console.error('Error downloading video:', error);
      res.status(500).json({ error: error.message || 'Failed to download video' });
    }
  });

  // Delete video
  router.delete('/:videoId', async (req: AuthRequest, res) => {
    try {
      const { videoId } = req.params;
      const success = await videoService.deleteVideo(videoId, req.user!.id);

      if (!success) {
        return res.status(404).json({ error: 'Video not found or not authorized' });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting video:', error);
      res.status(500).json({ error: error.message || 'Failed to delete video' });
    }
  });

  // Get reference images for a video
  router.get('/:videoId/reference-images', async (req: AuthRequest, res) => {
    try {
      const { videoId } = req.params;
      const video = await videoService.getVideoStatus(videoId);

      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      if (video.user_id !== req.user!.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      if (!video.reference_image_paths) {
        return res.json({ images: [] });
      }

      const imagePaths = JSON.parse(video.reference_image_paths);
      const images = await Promise.all(
        imagePaths.map(async (path: string, index: number) => {
          if (existsSync(path)) {
            const data = await readFile(path);
            // Extract meaningful filename from path (e.g., videoId_first.jpg, videoId_styleref0.jpg)
            const pathParts = path.split('/');
            const filename = pathParts[pathParts.length - 1];
            return {
              index,
              filename: filename,
              data: data.toString('base64'),
              mimeType: 'image/jpeg'
            };
          }
          return null;
        })
      );

      res.json({ 
        images: images.filter(img => img !== null)
      });
    } catch (error: any) {
      console.error('Error getting reference images:', error);
      res.status(500).json({ error: error.message || 'Failed to get reference images' });
    }
  });

  // Get cost statistics
  router.get('/stats/costs', async (req: AuthRequest, res) => {
    try {
      const stats = videoService.getCostStats(req.user!.id);
      res.json(stats);
    } catch (error: any) {
      console.error('Error getting cost stats:', error);
      res.status(500).json({ error: error.message || 'Failed to get cost stats' });
    }
  });

  // Force check video status (for stuck videos)
  router.post('/:videoId/check-status', async (req: AuthRequest, res) => {
    try {
      const { videoId } = req.params;

      const video = await videoService.getVideoStatus(videoId);

      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      if (video.user_id !== req.user!.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Force check the status
      const updatedVideo = await videoService.forceCheckStatus(videoId);

      res.json({
        message: 'Status check triggered',
        video: updatedVideo
      });
    } catch (error: any) {
      console.error('Error force checking video status:', error);
      res.status(500).json({ error: error.message || 'Failed to check video status' });
    }
  });

  // Extract screenshots from video (server-side)
  router.get('/:videoId/screenshots', async (req: AuthRequest, res) => {
    try {
      const { videoId } = req.params;
      const count = Math.min(Math.max(parseInt(req.query.count as string) || 3, 1), 10);

      const video = await videoService.getVideoStatus(videoId);

      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      if (video.user_id !== req.user!.id) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      if (video.status !== 'completed' || !video.file_path) {
        return res.status(400).json({ error: 'Video is not ready yet' });
      }

      if (!existsSync(video.file_path)) {
        return res.status(404).json({ error: 'Video file not found' });
      }

      // Extract frames
      const framePaths = await extractVideoFrames(video.file_path, count);

      // Read frames as base64
      const frames = await Promise.all(
        framePaths.map(async (path, index) => {
          const data = await readFile(path);
          return {
            frame_number: index + 1,
            is_final_frame: index === framePaths.length - 1,
            data: data.toString('base64')
          };
        })
      );

      // Clean up temp files
      await Promise.all(framePaths.map(path => 
        unlink(path).catch(() => {})
      ));

      res.json({
        video_id: videoId,
        prompt: video.prompt,
        frame_count: frames.length,
        frames
      });
    } catch (error: any) {
      console.error('Error extracting screenshots:', error);
      res.status(500).json({ error: error.message || 'Failed to extract screenshots' });
    }
  });

  return router;
}

