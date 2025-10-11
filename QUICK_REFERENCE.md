# Sora2 Platform - Quick Reference

## Installation & Setup

```bash
# Quick setup
./setup.sh

# Or manually
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Configure
cd backend
cp .env.example .env
# Edit .env and add OPENAI_API_KEY
```

## Running

```bash
# Both servers (recommended)
npm run dev

# Or separately
npm run dev:backend   # Port 3000
npm run dev:frontend  # Port 5173
```

## Default Login

- **Username:** `admin`
- **Password:** `admin`

⚠️ Change immediately!

## API Quick Reference

### Authentication
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

### Create Video
```bash
curl -X POST http://localhost:3000/api/videos \
  -H "Authorization: Bearer $TOKEN" \
  -F "prompt=A cat on a motorcycle" \
  -F "model=sora-2"
```

### List Videos
```bash
curl http://localhost:3000/api/videos \
  -H "Authorization: Bearer $TOKEN"
```

### Download Video
```bash
curl -L http://localhost:3000/api/videos/{VIDEO_ID}/content \
  -H "Authorization: Bearer $TOKEN" \
  --output video.mp4
```

### Remix Video
```bash
curl -X POST http://localhost:3000/api/videos/{VIDEO_ID}/remix \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Change the color to red"}'
```

## File Locations

```
spra2/
├── backend/
│   ├── .env              # Configuration
│   ├── data/
│   │   ├── sora.db       # Database
│   │   └── users.json    # Users
│   ├── videos/           # Downloaded videos
│   └── uploads/          # Temp uploads
│
└── frontend/
    └── dist/             # Production build
```

## Environment Variables

```env
# backend/.env
OPENAI_API_KEY=sk-...           # Required
JWT_SECRET=random-secret        # Required
PORT=3000
VIDEOS_DIR=./videos
DATABASE_PATH=./data/sora.db
USERS_FILE=./data/users.json
```

## User Management

Generate password hash:
```javascript
const bcrypt = require('bcrypt');
console.log(bcrypt.hashSync('password123', 10));
```

Edit `backend/data/users.json`:
```json
[
  {
    "id": "user_1",
    "username": "admin",
    "password": "$2b$10$..."
  }
]
```

## Common Issues

### Port in use
```bash
# Change port in backend/.env
PORT=3001
```

### Backend won't start
```bash
# Check .env exists and has OPENAI_API_KEY
cat backend/.env
```

### WebSocket not connecting
```bash
# Verify backend is running
curl http://localhost:3000/health
```

### Videos not downloading
```bash
# Check directories exist
mkdir -p backend/data backend/videos backend/uploads
```

## Development Commands

```bash
# Install all
npm run install:all

# Build all
npm run build:all

# Run dev mode
npm run dev

# Backend only
cd backend && npm run dev

# Frontend only
cd frontend && npm run dev

# Production build
cd backend && npm run build && npm start
cd frontend && npm run build
```

## Prompt Tips

✅ **Good Prompts:**
- "Wide shot of a child flying a red kite in a grassy park, golden hour sunlight"
- "Close-up of a steaming coffee cup on a wooden table, morning light through blinds"

❌ **Bad Prompts:**
- "child with kite"
- "coffee"

**Include:**
- Shot type (wide, close-up, etc.)
- Subject (what/who)
- Action (what's happening)
- Setting (where)
- Lighting (when/how)

## Model Comparison

| Feature | sora-2 | sora-2-pro |
|---------|--------|------------|
| Speed | ⚡ Fast | 🐢 Slower |
| Quality | ⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Excellent |
| Use Case | Iteration, testing | Final output |
| Cost | Lower | Higher |

## Video Sizes

- `1280x720` - HD Landscape
- `1920x1080` - Full HD Landscape
- `720x1280` - HD Portrait
- `1080x1920` - Full HD Portrait

## Durations

- `4` seconds
- `8` seconds (default)
- `12` seconds

## Project Structure

```
backend/src/
├── auth/           # Authentication
├── db/             # Database
├── routes/         # API routes
├── services/       # Business logic
└── index.ts        # Server

frontend/src/
├── api/            # API client
├── components/     # UI components
├── stores/         # State management
├── views/          # Pages
└── main.ts         # Entry point
```

## Tech Stack

**Backend:**
- Express.js
- Socket.io
- SQLite
- OpenAI SDK
- JWT + Bcrypt

**Frontend:**
- Vue 3
- Vuetify 3
- Pinia
- Socket.io-client
- Axios

## Links

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Health Check: http://localhost:3000/health

## Documentation

- [README.md](./README.md) - Full documentation
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Setup guide
- [MCP_INTEGRATION.md](./MCP_INTEGRATION.md) - API integration
- [backend/README.md](./backend/README.md) - Backend API
- [frontend/README.md](./frontend/README.md) - Frontend UI

