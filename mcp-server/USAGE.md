# Using the Sora2 MCP Server

## Quick Start

### 1. Build the MCP Server

```bash
cd mcp-server
npm install
npm run build
```

### 2. Configure Claude Desktop

Edit your Claude Desktop config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the Sora2 MCP server:

```json
{
  "mcpServers": {
    "sora2": {
      "command": "node",
      "args": [
        "/Users/olena/spra2/mcp-server/dist/index.js"
      ],
      "env": {
        "SORA2_BASE_URL": "http://localhost:3000",
        "SORA2_USERNAME": "admin",
        "SORA2_PASSWORD": "admin"
      }
    }
  }
}
```

**For Production** (Railway):
```json
{
  "mcpServers": {
    "sora2": {
      "command": "node",
      "args": [
        "/Users/olena/spra2/mcp-server/dist/index.js"
      ],
      "env": {
        "SORA2_BASE_URL": "https://soraui-production.up.railway.app",
        "SORA2_USERNAME": "your_username",
        "SORA2_PASSWORD": "your_password"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

Close and reopen Claude Desktop for the changes to take effect.

### 4. Verify Connection

In Claude, you should now see "sora2" in the available tools/servers.

---

## Example Agent Conversations

### Basic Video Creation

```
You: Create a video of a sunset over the ocean

Claude: I'll create that video for you using the Sora2 platform.
[Uses create_video tool]
Video generation started. Video ID: abc-123...
Status: queued

You: Check the status

Claude: [Uses get_video_status tool]
The video is in progress, 45% complete.

You: Check again

Claude: [Uses get_video_status tool]
The video is completed! Would you like to see screenshots?

You: Yes, show me 5 screenshots

Claude: [Uses get_video_screenshots tool with count=5]
Here are 5 frames from your video showing the sunset progression.
The final frame shows the sun fully set.
[Displays 5 images]
```

### Creating Sequences

```
You: Create a video of a car driving through a desert

Claude: [Uses create_video]
Video created. Video ID: xyz-456...

[Wait for completion]

You: Now continue from that video - the car stops and a person gets out

Claude: [Uses continue_from_video]
I'll create a continuation starting from the last frame of the car video.
New video ID: def-789...
The last frame shows the car in the desert, and the new video will continue from there.
```

### Analyzing Videos

```
You: Show me screenshots from video abc-123

Claude: [Uses get_video_screenshots with count=3]
Here are 3 key frames:
1. Beginning frame
2. Middle frame  
3. Final frame (last frame of the video)

[Agent can analyze the images and describe what's happening]
```

---

## Available Tools for Agents

### 1. create_video
Create a new video from text prompt.

**Agent can specify**:
- Detailed prompt
- Model (sora-2 or sora-2-pro)
- Resolution
- Duration

### 2. get_video_status
Check generation progress.

**Returns**:
- Status (queued/in_progress/completed/failed)
- Progress percentage
- Cost
- Error messages if any

### 3. list_videos
Browse all videos created.

**Returns**: List with status, prompts, costs

### 4. get_video_screenshots
**Extract frames from completed videos** - This is the key tool for agents to "see" videos!

**Parameters**:
- `video_id`: Video to extract from
- `count`: Number of screenshots (1-10)

**Special behavior**:
- If count = 1: Returns the final frame only
- If count > 1: Distributes evenly across video + final frame as last
- Returns actual image data that agents can analyze

**Example**:
```json
{
  "video_id": "abc-123",
  "count": 5
}
```

Returns: 5 images at 0%, 25%, 50%, 75%, and 99% (final frame)

### 5. remix_video
Modify existing video while keeping composition.

### 6. continue_from_video
Create sequence using last frame as first frame of next video.

### 7. get_cost_stats
Check spending statistics.

---

## Agent Use Cases

### 1. Video Analysis
```
Agent: Create video → Wait for completion → Extract 10 screenshots → 
Analyze progression → Provide detailed description
```

### 2. Iterative Creation
```
Agent: Create video → Get screenshots → 
If not satisfactory: Remix with adjustments → 
Repeat until desired result
```

### 3. Sequence Creation
```
Agent: Create scene 1 → Create scene 2 (continue from scene 1) → 
Create scene 3 (continue from scene 2) → 
Build complete narrative
```

### 4. Quality Control
```
Agent: List all failed videos → 
Analyze failure patterns → 
Provide recommendations for better prompts
```

---

## Advanced Example

### Multi-Shot Sequence Generator

```python
# Pseudo-code for an agent workflow

# Scene 1
video1 = create_video("Wide shot of a child flying a red kite")
wait_until_complete(video1)
frames1 = get_video_screenshots(video1, count=3)
# Agent analyzes frames

# Scene 2 - Continue from Scene 1
video2 = continue_from_video(
    video1, 
    "The kite string breaks and the kite flies away"
)
wait_until_complete(video2)

# Scene 3 - Continue from Scene 2  
video3 = continue_from_video(
    video2,
    "The child watches the kite disappear into the clouds"
)

# Result: 3-part seamless sequence
```

---

## Troubleshooting

### MCP Server Won't Start

**Check**:
- Built the server: `npm run build`
- Sora2 platform is running
- Correct paths in config

**Test manually**:
```bash
cd mcp-server
SORA2_BASE_URL=http://localhost:3000 \
SORA2_USERNAME=admin \
SORA2_PASSWORD=admin \
npm run dev
```

### Authentication Fails

**Check**:
- Username and password are correct
- Platform URL is accessible
- Test with curl:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

### Screenshots Not Working

**Requirements**:
- ffmpeg must be installed (handled by @ffmpeg-installer/ffmpeg)
- Video must be completed
- Sufficient disk space for temp files

---

## Performance Notes

- Screenshot extraction is done on-demand
- Temp files stored in system temp directory
- Cleaned up automatically (OS handles it)
- First screenshot request downloads the video
- Subsequent requests reuse downloaded video

---

## Security

- Credentials stored in Claude Desktop config (encrypted by OS)
- Never commit passwords to git
- Use separate user accounts for agents if possible
- Monitor agent usage via cost tracking

---

**Your MCP server is ready!** Configure Claude Desktop and start building agentic workflows with video generation! 🤖🎬

