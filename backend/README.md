# Sora2 Video Generation Platform - Backend

A TypeScript backend API for creating and managing Sora2 video generations with real-time WebSocket updates.

## Features

- 🎬 Video generation from text prompts
- 🖼️ Image reference input (first-frame guidance)
- 🔄 Video remix functionality
- 📚 Video library management
- 🔐 JWT authentication with local user storage
- ⚡ Real-time progress updates via WebSocket
- 💾 SQLite database for metadata
- 📦 Automatic video downloads and storage
- 🔌 REST API compatible with MCP servers

## Setup

### Prerequisites

- Node.js 18+ or Bun
- OpenAI API key with Sora access

### Installation

```bash
cd backend
npm install
# or
bun install
```

### Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and set your configuration:
```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
JWT_SECRET=your_jwt_secret_here_change_in_production
VIDEOS_DIR=./videos
DATABASE_PATH=./data/sora.db
USERS_FILE=./data/users.json
```

### User Management

Users are stored in `data/users.json`. A default admin user is created on first run:
- Username: `admin`
- Password: `admin`

**⚠️ Change this password immediately!**

To add more users, edit `data/users.json`:
```json
[
  {
    "id": "user_1",
    "username": "admin",
    "password": "$2b$10$hashedpassword"
  },
  {
    "id": "user_2",
    "username": "alice",
    "password": "$2b$10$hashedpassword"
  }
]
```

Use bcrypt to hash passwords. You can use this Node.js snippet:
```javascript
const bcrypt = require('bcrypt');
console.log(bcrypt.hashSync('your_password', 10));
```

### Running

Development mode with auto-reload:
```bash
npm run dev
```

Production build and run:
```bash
npm run build
npm start
```

## API Documentation

### Authentication

#### POST /api/auth/login
Login and receive a JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "admin"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_1",
    "username": "admin"
  }
}
```

### Videos

All video endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

#### POST /api/videos
Create a new video generation job.

**Request (multipart/form-data):**
- `prompt` (required): Text prompt describing the video
- `model` (optional): `sora-2` (default) or `sora-2-pro`
- `size` (optional): Video resolution, default `1280x720`
- `seconds` (optional): Video duration, default `8`
- `input_reference` (optional): Image file (JPEG/PNG/WebP) for first-frame guidance

**Response:**
```json
{
  "id": "video_abc123",
  "user_id": "user_1",
  "openai_video_id": "video_openai_xyz",
  "prompt": "A cat on a motorcycle",
  "model": "sora-2",
  "size": "1280x720",
  "seconds": "8",
  "status": "queued",
  "progress": 0,
  "created_at": 1234567890
}
```

#### GET /api/videos
List all videos for the authenticated user.

**Query Parameters:**
- `limit` (optional): Max results, default 50
- `offset` (optional): Pagination offset, default 0

**Response:**
```json
{
  "videos": [...],
  "limit": 50,
  "offset": 0
}
```

#### GET /api/videos/:videoId
Get status and details of a specific video.

**Response:**
```json
{
  "id": "video_abc123",
  "status": "completed",
  "progress": 100,
  "file_path": "/path/to/video.mp4",
  ...
}
```

#### GET /api/videos/:videoId/content?variant=video
Download video content.

**Query Parameters:**
- `variant` (optional): `video` (default) or `thumbnail`

**Response:** Binary video/image data

#### POST /api/videos/:videoId/remix
Remix an existing video with a new prompt.

**Request:**
```json
{
  "prompt": "Change the color palette to teal and orange"
}
```

**Response:** New video object (same format as create)

#### DELETE /api/videos/:videoId
Delete a video from the library.

**Response:**
```json
{
  "success": true
}
```

## WebSocket Events

Connect to the WebSocket server with authentication:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token'
  }
});

// Listen for video updates
socket.on('video_update', (data) => {
  console.log('Video update:', data);
  // data: { video_id, updates: { status, progress, ... } }
});

// Request immediate status update
socket.emit('request_video_status', { video_id: 'video_abc123' });
```

### Events

**Server → Client:**
- `video_update`: Sent when video status/progress changes
  ```json
  {
    "video_id": "video_abc123",
    "updates": {
      "status": "in_progress",
      "progress": 45
    }
  }
  ```

**Client → Server:**
- `request_video_status`: Request immediate status for a video
  ```json
  {
    "video_id": "video_abc123"
  }
  ```

## Architecture

```
backend/
├── src/
│   ├── auth/          # Authentication & user management
│   ├── db/            # Database layer (SQLite via sql.js)
│   ├── routes/        # Express routes
│   ├── services/      # Business logic (video service)
│   ├── types/         # TypeScript type definitions
│   └── index.ts       # Main server file
├── data/              # SQLite DB & users.json
├── videos/            # Downloaded video files
└── uploads/           # Temporary upload directory
```

**Note**: This backend uses `sql.js` (pure JavaScript SQLite) instead of `better-sqlite3` to avoid native compilation issues with newer Node.js versions. This works great for small to medium workloads.

## MCP Server Compatibility

The REST API is designed to be compatible with MCP (Model Context Protocol) servers. Any HTTP client can interact with the API by:

1. Authenticating via POST /api/auth/login
2. Using the returned JWT token in subsequent requests
3. Optionally connecting to WebSocket for real-time updates

## License

MIT

