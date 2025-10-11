# Sora2 Video Generation Platform

A full-stack TypeScript application for creating and managing Sora2 video generations with real-time updates. Built with Express, Socket.io, Vue 3, and Vuetify.

## Features

### Backend
- 🎬 **Video Generation**: Create videos from text prompts using Sora 2 and Sora 2 Pro
- 🖼️ **Image Reference**: Upload reference images for first-frame guidance
- 🔄 **Video Remix**: Modify existing videos with targeted adjustments
- 📚 **Library Management**: Browse, download, and delete videos
- 🔐 **Authentication**: Simple JWT-based auth with local user storage
- ⚡ **Real-time Updates**: WebSocket notifications for video progress
- 💾 **Persistent Storage**: SQLite database + local file storage
- 🔌 **MCP Compatible**: REST API works with MCP servers and other clients

### Frontend
- 🎨 **Modern UI**: Responsive Vuetify 3 interface with dark mode
- 📊 **Live Progress**: Real-time progress bars via WebSocket
- 🖼️ **Thumbnail Previews**: Visual library with thumbnails
- 💾 **Easy Downloads**: One-click video downloads
- 🔄 **Quick Remix**: Remix videos directly from the library

## Quick Start

### Prerequisites

- Node.js 18+ or Bun
- OpenAI API key with Sora access

### Installation

1. **Clone and setup backend:**

```bash
cd backend
npm install  # or bun install
cp .env.example .env
```

2. **Configure backend** - Edit `backend/.env`:

```env
OPENAI_API_KEY=your_openai_api_key_here
JWT_SECRET=your_random_secret_here
PORT=3000
```

3. **Setup frontend:**

```bash
cd ../frontend
npm install  # or bun install
```

### Running

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Then open http://localhost:5173

**Default Login:**
- Username: `admin`
- Password: `admin`

⚠️ **Change the default password immediately!**

## Project Structure

```
spra2/
├── backend/              # Express + Socket.io backend
│   ├── src/
│   │   ├── auth/        # Authentication & users
│   │   ├── db/          # SQLite database
│   │   ├── routes/      # API routes
│   │   ├── services/    # Video service
│   │   └── index.ts     # Server entry
│   ├── data/            # SQLite DB & users.json
│   ├── videos/          # Downloaded videos
│   └── package.json
│
├── frontend/            # Vue 3 + Vuetify frontend
│   ├── src/
│   │   ├── api/         # API client
│   │   ├── components/  # Vue components
│   │   ├── stores/      # Pinia stores
│   │   ├── views/       # Page views
│   │   └── main.ts      # App entry
│   └── package.json
│
└── README.md            # This file
```

## API Documentation

### Authentication

**POST /api/auth/login**
```json
{
  "username": "admin",
  "password": "admin"
}
```

Returns JWT token for authenticated requests.

### Video Endpoints

All require `Authorization: Bearer <token>` header.

- **POST /api/videos** - Create video (multipart/form-data)
- **GET /api/videos** - List videos
- **GET /api/videos/:id** - Get video status
- **GET /api/videos/:id/content** - Download video/thumbnail
- **POST /api/videos/:id/remix** - Remix video
- **DELETE /api/videos/:id** - Delete video

### WebSocket Events

Connect with JWT token:
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'your_token' }
})

socket.on('video_update', (data) => {
  // { video_id, updates: { status, progress, ... } }
})
```

## User Management

Users are stored in `backend/data/users.json`. To add users:

1. Generate a bcrypt hash:
```javascript
const bcrypt = require('bcrypt');
console.log(bcrypt.hashSync('password123', 10));
```

2. Add to `users.json`:
```json
[
  {
    "id": "user_1",
    "username": "admin",
    "password": "$2b$10$..."
  },
  {
    "id": "user_2",
    "username": "alice",
    "password": "$2b$10$..."
  }
]
```

## MCP Server Usage

The REST API can be used by MCP servers or other clients:

```bash
# Login
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  | jq -r '.token')

# Create video
curl -X POST http://localhost:3000/api/videos \
  -H "Authorization: Bearer $TOKEN" \
  -F "prompt=A cat on a motorcycle" \
  -F "model=sora-2"

# List videos
curl http://localhost:3000/api/videos \
  -H "Authorization: Bearer $TOKEN"
```

## Configuration

### Backend Environment Variables

```env
OPENAI_API_KEY=        # Required: Your OpenAI API key
JWT_SECRET=            # Required: Random secret for JWT signing
PORT=3000              # Server port
VIDEOS_DIR=./videos    # Video storage directory
DATABASE_PATH=./data/sora.db  # SQLite database path
USERS_FILE=./data/users.json # Users file path
```

### Frontend Configuration

If backend is on different host/port, update:
- `frontend/vite.config.ts` - proxy configuration
- `frontend/src/stores/websocket.ts` - WebSocket URL

## Development

### Backend Development

```bash
cd backend
npm run dev  # Auto-reload with tsx
```

### Frontend Development

```bash
cd frontend
npm run dev  # Vite dev server with HMR
```

### Production Build

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve dist/ with your preferred static server
```

## Troubleshooting

### WebSocket not connecting
- Check that backend is running on port 3000
- Verify JWT token is valid
- Check browser console for connection errors

### Videos not downloading
- Ensure `VIDEOS_DIR` has write permissions
- Check disk space
- Verify OpenAI API key has Sora access

### Authentication failing
- Verify `users.json` format is correct
- Check password hashes are bcrypt format
- Ensure `JWT_SECRET` is set

## Architecture

### Backend Flow
1. Client authenticates → receives JWT token
2. Client creates video → job starts in OpenAI
3. Backend polls OpenAI API every 5s
4. On progress update → emits WebSocket event
5. On completion → downloads MP4 + thumbnail
6. Client receives real-time updates via WebSocket

### Frontend State Management
- **Auth Store**: JWT token + user info
- **Videos Store**: Video library state
- **WebSocket Store**: Real-time connection management

## Technologies

**Backend:**
- Express.js - Web framework
- Socket.io - WebSocket server
- better-sqlite3 - Database
- OpenAI SDK - Sora API client
- JWT - Authentication
- Bcrypt - Password hashing

**Frontend:**
- Vue 3 - UI framework
- Vuetify 3 - Material Design components
- Pinia - State management
- Socket.io-client - WebSocket client
- Axios - HTTP client
- TypeScript - Type safety

## License

MIT

## Credits

Built for video generation with OpenAI's Sora API. Documentation reference: sora2.md

