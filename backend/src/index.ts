import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { VideoDatabase } from './db/database';
import { UserManager } from './auth/users';
import { VideoService } from './services/video-service';
import { createAuthMiddleware } from './auth/middleware';
import { createAuthRouter } from './routes/auth';
import { createVideosRouter } from './routes/videos';
import { createAdminRouter } from './routes/admin';
import { mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import jwt from 'jsonwebtoken';

dotenv.config();

// Configuration
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_production';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const VIDEOS_DIR = process.env.VIDEOS_DIR || './storage/videos';
const DATABASE_PATH = process.env.DATABASE_PATH || './storage/data/sora.db';
const USERS_FILE = process.env.USERS_FILE || './storage/data/users.json';

if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

// Debug: Log working directory and paths
console.log('📂 Working directory:', process.cwd());
console.log('📂 Videos dir:', VIDEOS_DIR);
console.log('📂 Database path:', DATABASE_PATH);
console.log('📂 Users file:', USERS_FILE);

// Ensure directories exist
const ensureDir = (path: string) => {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

ensureDir(DATABASE_PATH);
ensureDir(USERS_FILE);
if (!existsSync(VIDEOS_DIR)) {
  mkdirSync(VIDEOS_DIR, { recursive: true });
}

// Initialize services
const db = new VideoDatabase(DATABASE_PATH);
const userManager = new UserManager(USERS_FILE);
const videoService = new VideoService(OPENAI_API_KEY, db, VIDEOS_DIR);

// Initialize database (async)
await db.initialize();

// Resume polling for any in-progress videos (e.g., after server restart)
setTimeout(() => {
  videoService.resumePolling().catch(err => {
    console.error('Error resuming polling:', err);
  });
}, 2000); // Wait 2 seconds for everything to initialize

// Create Express app
const app = express();
const httpServer = createServer(app);

// Setup Socket.io
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Make io globally accessible for VideoService
(global as any).io = io;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = join(process.cwd(), 'public');
  if (existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
  }
}

// Auth middleware
const authMiddleware = createAuthMiddleware(userManager, JWT_SECRET);

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use('/api/auth', createAuthRouter(userManager, JWT_SECRET));

// Create flexible auth middleware that accepts token from header OR query
const flexibleAuthMiddleware = (req: any, res: any, next: any) => {
  let token = null;
  
  // Try to get token from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  // Fallback to query parameter (for image/video URLs)
  if (!token && req.query.token) {
    token = req.query.token as string;
  }
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    const user = userManager.getUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = {
      id: user.id,
      username: user.username
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

app.use('/api/videos', flexibleAuthMiddleware, createVideosRouter(videoService, VIDEOS_DIR, JWT_SECRET));
app.use('/api/admin', authMiddleware, createAdminRouter(userManager));

// Serve frontend index.html for all non-API routes (SPA support)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    const indexPath = join(process.cwd(), 'public', 'index.html');
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend not built. Run npm run build:frontend');
    }
  });
}

// WebSocket authentication and connection handling
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    const user = userManager.getUserById(decoded.userId);
    
    if (!user) {
      return next(new Error('Authentication error'));
    }

    (socket as any).userId = user.id;
    (socket as any).username = user.username;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  const userId = (socket as any).userId;
  const username = (socket as any).username;
  
  console.log(`User connected: ${username} (${userId})`);
  
  // Join user-specific room for targeted updates
  socket.join(`user_${userId}`);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${username} (${userId})`);
  });

  // Client can request immediate status update for a video
  socket.on('request_video_status', async (data: { video_id: string }) => {
    try {
      const video = await videoService.getVideoStatus(data.video_id);
      if (video && video.user_id === userId) {
        socket.emit('video_update', {
          video_id: video.id,
          video: video
        });
      }
    } catch (error) {
      console.error('Error fetching video status:', error);
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  videoService.shutdown();
  db.close();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  videoService.shutdown();
  db.close();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║   Sora2 Video Generation Platform             ║
║                                               ║
║   Server running on http://localhost:${PORT}   ║
║                                               ║
║   API Endpoints:                              ║
║   • POST   /api/auth/login                    ║
║   • POST   /api/videos                        ║
║   • GET    /api/videos                        ║
║   • GET    /api/videos/:id                    ║
║   • GET    /api/videos/:id/content            ║
║   • POST   /api/videos/:id/remix              ║
║   • DELETE /api/videos/:id                    ║
║                                               ║
║   WebSocket: Real-time video updates          ║
║                                               ║
╚═══════════════════════════════════════════════╝
  `);
});

export { app, httpServer, io };

