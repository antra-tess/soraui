# MCP Server Integration Guide

This guide shows how to integrate the Sora2 platform with MCP (Model Context Protocol) servers or other programmatic clients.

## API Overview

The Sora2 platform provides a REST API that any HTTP client can use. All endpoints (except login) require JWT authentication.

**Base URL:** `http://localhost:3000/api`

## Authentication Flow

### 1. Login to get JWT token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin"
  }'
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

### 2. Use token in subsequent requests

Add the token to the `Authorization` header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## API Endpoints

### Create Video

**POST** `/api/videos`

Create a new video generation job.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:**
- `prompt` (required): Text description of the video
- `model` (optional): `sora-2` or `sora-2-pro` (default: `sora-2`)
- `size` (optional): Resolution like `1280x720` (default: `1280x720`)
- `seconds` (optional): Duration like `8` (default: `8`)
- `input_reference` (optional): Image file for first-frame guidance

**Example:**
```bash
curl -X POST http://localhost:3000/api/videos \
  -H "Authorization: Bearer $TOKEN" \
  -F "prompt=A cat riding a motorcycle through a neon city" \
  -F "model=sora-2" \
  -F "size=1280x720" \
  -F "seconds=8"
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user_1",
  "openai_video_id": "video_abc123",
  "prompt": "A cat riding a motorcycle through a neon city",
  "model": "sora-2",
  "size": "1280x720",
  "seconds": "8",
  "status": "queued",
  "progress": 0,
  "created_at": 1705849200
}
```

### Get Video Status

**GET** `/api/videos/:videoId`

Get the current status and details of a video.

**Example:**
```bash
curl http://localhost:3000/api/videos/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "in_progress",
  "progress": 45,
  ...
}
```

**Status values:**
- `queued`: Waiting to start
- `in_progress`: Currently generating
- `completed`: Ready to download
- `failed`: Generation failed

### List Videos

**GET** `/api/videos`

List all videos for the authenticated user.

**Query Parameters:**
- `limit` (optional): Max results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Example:**
```bash
curl "http://localhost:3000/api/videos?limit=20&offset=0" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "videos": [
    { ... },
    { ... }
  ],
  "limit": 20,
  "offset": 0
}
```

### Download Video

**GET** `/api/videos/:videoId/content`

Download the video file or thumbnail.

**Query Parameters:**
- `variant` (optional): `video` (default) or `thumbnail`

**Example:**
```bash
# Download video
curl -L http://localhost:3000/api/videos/550e8400-e29b-41d4-a716-446655440000/content \
  -H "Authorization: Bearer $TOKEN" \
  --output video.mp4

# Download thumbnail
curl -L "http://localhost:3000/api/videos/550e8400-e29b-41d4-a716-446655440000/content?variant=thumbnail" \
  -H "Authorization: Bearer $TOKEN" \
  --output thumbnail.webp
```

### Remix Video

**POST** `/api/videos/:videoId/remix`

Create a new video by remixing an existing one.

**Body:**
```json
{
  "prompt": "Change the motorcycle to red and add more neon lights"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/videos/550e8400-e29b-41d4-a716-446655440000/remix \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Change the motorcycle to red"}'
```

### Delete Video

**DELETE** `/api/videos/:videoId`

Delete a video from the library.

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/videos/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $TOKEN"
```

## WebSocket Integration

For real-time updates, connect to the WebSocket server.

### Connection

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token_here'
  }
});

socket.on('connect', () => {
  console.log('Connected to WebSocket');
});

socket.on('video_update', (data) => {
  console.log('Video update:', data);
  // data: { video_id, updates: { status, progress, ... } }
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

### Events

**Server → Client:**

`video_update` - Emitted when video status/progress changes
```json
{
  "video_id": "550e8400-e29b-41d4-a716-446655440000",
  "updates": {
    "status": "in_progress",
    "progress": 67
  }
}
```

**Client → Server:**

`request_video_status` - Request immediate status for a video
```json
{
  "video_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Example MCP Server Integration

Here's a simple example of how an MCP server might interact with the API:

```python
import requests
import time

class Sora2Client:
    def __init__(self, base_url, username, password):
        self.base_url = base_url
        self.token = None
        self.login(username, password)
    
    def login(self, username, password):
        """Authenticate and get JWT token"""
        response = requests.post(
            f"{self.base_url}/api/auth/login",
            json={"username": username, "password": password}
        )
        response.raise_for_status()
        self.token = response.json()["token"]
    
    def headers(self):
        """Get headers with auth token"""
        return {"Authorization": f"Bearer {self.token}"}
    
    def create_video(self, prompt, model="sora-2", size="1280x720", seconds="8"):
        """Create a new video"""
        data = {
            "prompt": prompt,
            "model": model,
            "size": size,
            "seconds": seconds
        }
        response = requests.post(
            f"{self.base_url}/api/videos",
            headers=self.headers(),
            data=data
        )
        response.raise_for_status()
        return response.json()
    
    def get_video_status(self, video_id):
        """Get video status"""
        response = requests.get(
            f"{self.base_url}/api/videos/{video_id}",
            headers=self.headers()
        )
        response.raise_for_status()
        return response.json()
    
    def wait_for_completion(self, video_id, poll_interval=5):
        """Poll until video is complete"""
        while True:
            video = self.get_video_status(video_id)
            status = video["status"]
            progress = video.get("progress", 0)
            
            print(f"Status: {status}, Progress: {progress}%")
            
            if status == "completed":
                return video
            elif status == "failed":
                raise Exception(f"Video failed: {video.get('error_message')}")
            
            time.sleep(poll_interval)
    
    def download_video(self, video_id, output_path):
        """Download completed video"""
        response = requests.get(
            f"{self.base_url}/api/videos/{video_id}/content",
            headers=self.headers(),
            stream=True
        )
        response.raise_for_status()
        
        with open(output_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

# Usage
client = Sora2Client("http://localhost:3000", "admin", "admin")

# Create video
video = client.create_video(
    prompt="A serene lake at sunset with mountains in the background",
    model="sora-2-pro"
)
print(f"Created video: {video['id']}")

# Wait for completion
completed_video = client.wait_for_completion(video["id"])
print(f"Video completed!")

# Download
client.download_video(video["id"], "output.mp4")
print("Downloaded to output.mp4")
```

## Error Handling

The API returns standard HTTP status codes:

- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Not authorized for this resource
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

**Error Response Format:**
```json
{
  "error": "Error message here"
}
```

## Rate Limiting

The API doesn't currently implement rate limiting, but you should:
- Poll status endpoints reasonably (every 5-10 seconds)
- Not create excessive simultaneous video jobs
- Be respectful of OpenAI's API limits

## Best Practices

1. **Store tokens securely**: Don't hardcode tokens in code
2. **Handle token expiration**: Tokens expire after 7 days
3. **Poll reasonably**: Don't hammer the status endpoint
4. **Use WebSockets**: More efficient than polling for updates
5. **Error handling**: Always handle network and API errors
6. **Timeouts**: Set appropriate timeouts for downloads

## Support

For issues or questions, check:
- Main README.md for general documentation
- Backend README.md for detailed API specs
- Server logs for debugging

---

Built with ❤️ for easy integration with MCP servers and automation tools.

