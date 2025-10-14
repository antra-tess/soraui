import { Router, Request } from 'express';
import multer from 'multer';
import { VideoService } from '../services/video-service';
import { AuthRequest } from '../auth/middleware';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import jwt from 'jsonwebtoken';

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
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

export function createVideosRouter(videoService: VideoService, videosDir: string, jwtSecret: string): Router {
  const router = Router();

  // Create a new video
  router.post('/', upload.single('input_reference'), async (req: AuthRequest, res) => {
    try {
      const { prompt, model = 'sora-2', size = '1280x720', seconds = '8' } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      if (!['sora-2', 'sora-2-pro'].includes(model)) {
        return res.status(400).json({ error: 'Invalid model. Use sora-2 or sora-2-pro' });
      }

      const inputReferencePath = req.file ? req.file.path : undefined;

      const video = await videoService.createVideo(
        req.user!.id,
        prompt,
        model,
        size,
        seconds,
        inputReferencePath
      );

      res.json(video);
    } catch (error: any) {
      console.error('Error creating video:', error);
      res.status(500).json({ error: error.message || 'Failed to create video' });
    }
  });

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

      res.setHeader('Content-Type', contentType);
      const stream = createReadStream(filePath);
      stream.pipe(res);
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

  return router;
}

