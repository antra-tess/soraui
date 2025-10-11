# Sora2 Video Platform - Frontend

A modern Vue 3 + Vuetify interface for the Sora2 video generation platform with real-time WebSocket updates.

## Features

- 🎨 Modern, responsive UI with Vuetify 3
- 🔐 User authentication
- 🎬 Create videos from text prompts
- 🖼️ Upload reference images for first-frame guidance
- 🔄 Remix existing videos
- 📊 Real-time progress updates via WebSocket
- 📚 Video library with thumbnail previews
- 💾 Download completed videos
- 🌙 Dark mode support

## Setup

### Prerequisites

- Node.js 18+ or Bun
- Backend server running on http://localhost:3000

### Installation

```bash
cd frontend
npm install
# or
bun install
```

### Development

```bash
npm run dev
# or
bun run dev
```

The frontend will be available at http://localhost:5173

### Production Build

```bash
npm run build
# or
bun run build
```

The built files will be in the `dist/` directory.

## Project Structure

```
frontend/
├── src/
│   ├── api/           # API client
│   ├── components/    # Vue components
│   ├── plugins/       # Vuetify configuration
│   ├── router/        # Vue Router
│   ├── stores/        # Pinia stores
│   ├── types/         # TypeScript types
│   ├── views/         # Page views
│   ├── App.vue        # Root component
│   └── main.ts        # Entry point
├── index.html
├── vite.config.ts
└── package.json
```

## Features Guide

### Login

Default credentials:
- Username: `admin`
- Password: `admin`

### Creating Videos

1. Enter a detailed prompt describing the video you want
2. Select model (sora-2 for speed, sora-2-pro for quality)
3. Choose resolution and duration
4. Optionally upload a reference image (must match selected resolution)
5. Click "Generate Video"

### Monitoring Progress

Videos appear in the library immediately with their status:
- **Queued**: Waiting to start
- **Processing**: Currently generating (with progress bar)
- **Completed**: Ready to download
- **Failed**: Generation failed (with error message)

Progress updates automatically via WebSocket.

### Remixing Videos

1. Click the "Remix" button on a completed video
2. Describe the change you want to make
3. Submit to create a new video based on the original

### Downloading Videos

Click the "Download" button on completed videos to download the MP4 file.

## Configuration

The frontend proxies API requests to the backend. If your backend is on a different host/port, update `vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://your-backend:3000',
      changeOrigin: true
    }
  }
}
```

Also update the WebSocket connection in `src/stores/websocket.ts`:

```typescript
socket.value = io('http://your-backend:3000', {
  auth: {
    token: authStore.token
  }
})
```

## Technologies

- **Vue 3**: Progressive JavaScript framework
- **Vuetify 3**: Material Design component framework
- **Pinia**: State management
- **Vue Router**: Client-side routing
- **Socket.io**: Real-time WebSocket communication
- **Axios**: HTTP client
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server

## License

MIT

