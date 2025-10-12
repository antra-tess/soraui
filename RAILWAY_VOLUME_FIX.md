# Railway Volume Fix - If Data Not Persisting

## Problem
Volume is mounted at `/app/storage` but app runs from `/app/backend`, causing path mismatches.

## Solution Options

### Option 1: Use Absolute Paths (Recommended)

Update Railway Environment Variables:
```
VIDEOS_DIR=/app/storage/videos
DATABASE_PATH=/app/storage/data/sora.db
USERS_FILE=/app/storage/data/users.json
```

This forces the app to use the absolute volume path regardless of working directory.

### Option 2: Change Working Directory

Update `railway.json` start command:
```json
"startCommand": "cd backend && ln -s /app/storage ./storage && npm run start:prod"
```

This creates a symlink from the working directory to the volume.

### Option 3: Mount Volume at Different Path

Instead of `/app/storage`, mount at `/app/backend/storage`:
1. Delete existing volume in Railway
2. Create new volume at `/app/backend/storage`
3. Redeploy

---

## Quick Fix Now

In Railway Dashboard → Variables, add these (will override defaults):

```
VIDEOS_DIR=/app/storage/videos
DATABASE_PATH=/app/storage/data/sora.db  
USERS_FILE=/app/storage/data/users.json
```

Then redeploy. These absolute paths will work regardless of working directory!

