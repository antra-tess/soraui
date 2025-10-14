# Sora2 MCP Server

An MCP (Model Context Protocol) server that allows AI agents to create and manage videos using the Sora2 platform.

## Features

- 🎬 **Create Videos**: Generate videos from text prompts
- 📊 **Monitor Progress**: Check video generation status
- 🖼️ **Extract Frames**: Get screenshots from videos for agent analysis
- 🔄 **Remix Videos**: Modify existing videos
- ➡️ **Continue Videos**: Create sequences using last frame as first frame
- 💰 **Cost Tracking**: Monitor spending

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Configuration

Set environment variables:

```bash
export SORA2_BASE_URL=http://localhost:3000
export SORA2_USERNAME=admin
export SORA2_PASSWORD=admin
```

Or for production:
```bash
export SORA2_BASE_URL=https://soraui-production.up.railway.app
export SORA2_USERNAME=your_username
export SORA2_PASSWORD=your_password
```

## Usage with Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "sora2": {
      "command": "node",
      "args": ["/Users/olena/spra2/mcp-server/dist/index.js"],
      "env": {
        "SORA2_BASE_URL": "http://localhost:3000",
        "SORA2_USERNAME": "admin",
        "SORA2_PASSWORD": "admin"
      }
    }
  }
}
```

Or for production:
```json
{
  "mcpServers": {
    "sora2": {
      "command": "node",
      "args": ["/Users/olena/spra2/mcp-server/dist/index.js"],
      "env": {
        "SORA2_BASE_URL": "https://soraui-production.up.railway.app",
        "SORA2_USERNAME": "your_username",
        "SORA2_PASSWORD": "your_password"
      }
    }
  }
}
```

## Available Tools

### create_video

Create a new video from a text prompt.

**Parameters**:
- `prompt` (required): Detailed video description
- `model` (optional): 'sora-2' or 'sora-2-pro'
- `size` (optional): Resolution like '1280x720'
- `seconds` (optional): Duration '4', '8', or '12'

**Example**:
```
Create a video of a cat riding a skateboard in slow motion
```

### get_video_status

Check the progress of a video generation.

**Parameters**:
- `video_id` (required): Video ID from create_video

**Returns**: Status, progress percentage, completion status

### list_videos

List all videos created by the user.

**Parameters**:
- `limit` (optional): Max results (default: 20)
- `offset` (optional): Pagination offset

### get_video_screenshots

Extract frames from a completed video. **Perfect for agents to "see" the video content.**

**Parameters**:
- `video_id` (required): Video to extract from
- `count` (optional): Number of screenshots (1-10, default: 3)

**Returns**: 
- JSON with metadata
- Image data for each frame (base64)
- Last screenshot is always the final frame

**Example**:
```
Get 5 screenshots from video abc123
```

Returns: 5 images showing the video progression, with the last one being the final frame.

### remix_video

Modify an existing video while preserving composition.

**Parameters**:
- `video_id` (required): Video to remix
- `prompt` (required): What to change

**Example**:
```
Change the color palette to warm tones
```

### continue_from_video

Create a new video starting from the last frame of an existing one.

**Parameters**:
- `video_id` (required): Video to continue from
- `prompt` (required): What happens next
- `model` (optional): Model for new video
- `seconds` (optional): Duration of new video

**Example**:
```
The cat jumps off the skateboard and walks away
```

### get_cost_stats

Get spending statistics.

**Returns**:
- Your total spending
- Your video count
- Platform total (all users)
- Platform video count

## Example Agent Workflow

```
Agent: "Create a video of a sunset over the ocean"
→ MCP creates video, returns video_id

Agent: "Check status of video_id"
→ MCP returns: in_progress, 45%

Agent: "Check status again"
→ MCP returns: completed

Agent: "Get 3 screenshots from the video"
→ MCP returns: 3 images (beginning, middle, end frame)

Agent analyzes images: "The sunset looks good"

Agent: "Continue from this video - the sun has set and stars appear"
→ MCP creates continuation video using last frame as first frame
```

## Development

```bash
# Run in dev mode
npm run dev

# Build
npm run build

# Test manually
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```

## Architecture

```
AI Agent (Claude, etc.)
    ↓ MCP Protocol
Sora2 MCP Server
    ↓ REST API
Sora2 Platform Backend
    ↓ OpenAI SDK
OpenAI Sora API
```

## Troubleshooting

### Authentication Error
- Check SORA2_USERNAME and SORA2_PASSWORD
- Verify Sora2 platform is running at SORA2_BASE_URL
- Test login: `curl -X POST $SORA2_BASE_URL/api/auth/login -d '{"username":"admin","password":"admin"}'`

### Frame Extraction Error
- Ensure video is completed (`get_video_status`)
- Check ffmpeg is installed
- Verify temp directory is writable

### Connection Error
- Check SORA2_BASE_URL is accessible
- Verify platform is running
- Check network/firewall

## License

MIT

