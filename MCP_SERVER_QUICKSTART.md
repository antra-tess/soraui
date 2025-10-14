# MCP Server - Quick Start

## What It Does

The Sora2 MCP server lets AI agents:
- ✅ Create videos from text prompts
- ✅ Monitor generation progress  
- ✅ **Extract screenshots** to "see" video content
- ✅ Remix and continue videos
- ✅ Build video sequences
- ✅ Track costs

## 🚀 Setup (2 minutes)

### 1. Build the MCP Server

```bash
cd mcp-server
npm install
npm run build
```

### 2. Add to Claude Desktop

Edit: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

**For Production (Railway)**:
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

### 3. Restart Claude Desktop

Close and reopen Claude Desktop.

### 4. Test It!

In Claude, try:
```
"Create a video of a sunset over mountains"
```

Claude will use the MCP server to generate your video!

---

## 🎥 Screenshot Feature (Special!)

The MCP server can extract frames from videos so agents can "see" them:

```
Agent: "Show me 5 screenshots from the video"
→ Returns 5 images distributed across the video
→ Last screenshot is always the final frame
```

**Use Cases**:
- Agent analyzes video quality
- Checks if prompt was followed
- Decides whether to remix or continue
- Builds sequences based on visual content

---

## 🔗 Full Documentation

See `mcp-server/USAGE.md` for:
- All 7 available tools
- Example agent workflows
- Multi-shot sequence creation
- Troubleshooting

---

**MCP Server is ready for AI agents!** 🤖🎬

