# Getting Started with Sora2 Platform

Welcome! This guide will help you get the Sora2 video generation platform up and running.

## Prerequisites

Before you begin, make sure you have:

1. **Node.js 18 or higher** installed ([Download](https://nodejs.org/))
   - Check with: `node --version`
2. **OpenAI API Key** with Sora access
3. **Terminal/Command Line** access

## Quick Setup (5 minutes)

### Option 1: Automated Setup (Recommended)

```bash
# Make the setup script executable
chmod +x setup.sh

# Run setup
./setup.sh
```

### Option 2: Manual Setup

1. **Install dependencies:**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   cd ..
   ```

2. **Configure backend:**
   ```bash
   cd backend
   cp .env.example .env
   ```

3. **Edit `backend/.env`** and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=sk-your-key-here
   JWT_SECRET=your-random-secret-here
   ```

4. **Create necessary directories:**
   ```bash
   mkdir -p backend/data backend/videos backend/uploads
   ```

## Running the Platform

From the root directory:

```bash
npm run dev
```

This starts both:
- **Backend** on http://localhost:3000
- **Frontend** on http://localhost:5173

Or run them separately:

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

## First Login

1. Open http://localhost:5173 in your browser
2. Login with default credentials:
   - **Username:** `admin`
   - **Password:** `admin`

⚠️ **Important:** Change the default password immediately!

## Creating Your First Video

1. After logging in, you'll see the dashboard
2. Enter a detailed prompt in the text area:
   - ✅ Good: "Wide shot of a child flying a red kite in a grassy park, golden hour sunlight"
   - ❌ Bad: "child with kite"
3. Choose your model:
   - **Sora 2:** Faster, good for iteration
   - **Sora 2 Pro:** Higher quality, slower
4. Select resolution and duration
5. (Optional) Upload a reference image
6. Click "Generate Video"

## Monitoring Progress

Once you create a video:
- It appears in the library immediately
- Status updates automatically via WebSocket
- Progress bar shows generation progress
- You'll be notified when complete

## User Management

### Adding Users

1. Generate a password hash:
   ```javascript
   // Run in Node.js
   const bcrypt = require('bcrypt');
   console.log(bcrypt.hashSync('yourpassword', 10));
   ```

2. Edit `backend/data/users.json`:
   ```json
   [
     {
       "id": "user_1",
       "username": "admin",
       "password": "$2b$10$hashed..."
     },
     {
       "id": "user_2",
       "username": "alice",
       "password": "$2b$10$hashed..."
     }
   ]
   ```

3. Restart the backend

### Changing Passwords

Same process as adding users - just update the password hash for the existing user.

## Features Overview

### Creating Videos
- Text-to-video generation
- Multiple models (sora-2, sora-2-pro)
- Various resolutions and durations
- Optional reference image input

### Managing Videos
- Library view with thumbnails
- Download completed videos
- Delete unwanted videos
- View generation progress

### Remixing Videos
- Modify existing videos
- Keep original composition
- Make targeted changes
- Quick iteration

## Troubleshooting

### Backend won't start

**Error: "OPENAI_API_KEY environment variable is required"**
- Solution: Add your API key to `backend/.env`

**Error: "EADDRINUSE"**
- Solution: Port 3000 is in use. Change `PORT` in `backend/.env`

### Frontend won't connect

**"Failed to fetch"**
- Solution: Make sure backend is running on port 3000
- Check: `curl http://localhost:3000/health`

### WebSocket not connecting

**"Connection failed"**
- Solution: Check backend is running
- Verify JWT token is valid (try logging out and back in)

### Videos not downloading

**"Download failed"**
- Solution: Check `backend/videos/` directory exists and is writable
- Verify enough disk space available

## Next Steps

- Read the full [README.md](./README.md) for detailed information
- Check [Backend README](./backend/README.md) for API documentation
- Check [Frontend README](./frontend/README.md) for UI details
- Explore the code to customize for your needs

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the detailed documentation
3. Check console logs for error messages

## Tips for Best Results

1. **Write detailed prompts:**
   - Include shot type, subject, action, setting, lighting
   - Example: "Close-up of steaming coffee cup on wooden table, morning light through blinds"

2. **Choose the right model:**
   - Use sora-2 for quick iterations and testing
   - Use sora-2-pro for final, high-quality outputs

3. **Reference images:**
   - Must match your target resolution
   - Use for brand consistency or specific looks

4. **Remixing:**
   - Make one change at a time
   - Be specific about what to change
   - Keeps original composition better

## Production Deployment

For production use:

1. **Change default passwords**
2. **Set strong JWT_SECRET**
3. **Use environment variables**
4. **Set up proper backup for videos and database**
5. **Consider nginx reverse proxy**
6. **Enable HTTPS**
7. **Set up monitoring**

See deployment documentation for more details.

---

Happy video generating! 🎬

