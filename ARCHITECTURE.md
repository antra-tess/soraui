# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT BROWSER                                 │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                      Vue 3 Application                          │    │
│  │  ┌──────────┐  ┌───────────┐  ┌─────────┐  ┌──────────────┐  │    │
│  │  │  Login   │  │ Dashboard │  │ Video   │  │   Remix      │  │    │
│  │  │  View    │  │   View    │  │ Library │  │   Dialog     │  │    │
│  │  └──────────┘  └───────────┘  └─────────┘  └──────────────┘  │    │
│  │                                                                 │    │
│  │  ┌──────────────────────────────────────────────────────────┐ │    │
│  │  │              Pinia Stores (State Management)              │ │    │
│  │  │  ┌────────┐  ┌─────────┐  ┌───────────────────────────┐ │ │    │
│  │  │  │  Auth  │  │ Videos  │  │      WebSocket Store      │ │ │    │
│  │  │  └────────┘  └─────────┘  └───────────────────────────┘ │ │    │
│  │  └──────────────────────────────────────────────────────────┘ │    │
│  │                                                                 │    │
│  │  ┌──────────────────────────────────────────────────────────┐ │    │
│  │  │                    API Client (Axios)                     │ │    │
│  │  └──────────────────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP REST API / WebSocket
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND SERVER (Node.js)                         │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                    Express.js + Socket.io                       │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │    │
│  │  │   Auth       │  │   Video      │  │   WebSocket          │ │    │
│  │  │   Routes     │  │   Routes     │  │   Handler            │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │    │
│  │                                                                 │    │
│  │  ┌──────────────────────────────────────────────────────────┐ │    │
│  │  │                   Middleware Layer                        │ │    │
│  │  │  • JWT Authentication                                     │ │    │
│  │  │  • CORS                                                   │ │    │
│  │  │  • Multer (file upload)                                   │ │    │
│  │  └──────────────────────────────────────────────────────────┘ │    │
│  │                                                                 │    │
│  │  ┌──────────────────────────────────────────────────────────┐ │    │
│  │  │                   Business Logic                          │ │    │
│  │  │  ┌────────────────┐  ┌──────────────┐  ┌──────────────┐ │ │    │
│  │  │  │ Video Service  │  │ User Manager │  │  Database    │ │ │    │
│  │  │  │ • OpenAI calls │  │ • Auth       │  │  • SQLite    │ │ │    │
│  │  │  │ • Polling      │  │ • Bcrypt     │  │  • Videos    │ │ │    │
│  │  │  │ • Downloads    │  └──────────────┘  └──────────────┘ │ │    │
│  │  │  └────────────────┘                                       │ │    │
│  │  └──────────────────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ OpenAI SDK / HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            OpenAI Sora API                               │
│  • Video generation (sora-2, sora-2-pro)                                │
│  • Status polling                                                        │
│  • Content download                                                      │
│  • Remix functionality                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. User Authentication

```
Browser                  Backend                    Database
   │                        │                          │
   │──── POST /login ──────►│                          │
   │     {user,pass}        │                          │
   │                        │─── verify user ─────────►│
   │                        │◄──── user data ──────────│
   │◄─── JWT token ─────────│                          │
   │                        │                          │
```

### 2. Create Video

```
Browser              Backend                OpenAI              Database
   │                    │                      │                    │
   │── POST /videos ───►│                      │                    │
   │   {prompt,etc}     │                      │                    │
   │                    │── create video ─────►│                    │
   │                    │◄── job created ──────│                    │
   │                    │                      │                    │
   │                    │─── save to DB ──────────────────────────►│
   │◄─── video obj ────│                      │                    │
   │                    │                      │                    │
   │                    │──┐                   │                    │
   │                    │  │ start polling     │                    │
   │                    │◄─┘ every 5s          │                    │
   │                    │                      │                    │
   │                    │── get status ───────►│                    │
   │                    │◄── progress ─────────│                    │
   │◄── WS: update ─────│                      │                    │
   │                    │─── update DB ───────────────────────────►│
   │                    │                      │                    │
   │                    │   (repeat until complete)                 │
   │                    │                      │                    │
   │                    │── download MP4 ─────►│                    │
   │                    │◄── video file ───────│                    │
   │                    │                      │                    │
   │◄── WS: complete ───│                      │                    │
```

### 3. Real-time Updates (WebSocket)

```
Browser                  Backend                    Polling Loop
   │                        │                          │
   │── connect (token) ────►│                          │
   │◄─── connected ─────────│                          │
   │                        │                          │
   │   join user room       │                          │
   │◄───────────────────────│                          │
   │                        │                          │
   │                        │◄─── video update ────────│
   │◄── video_update ───────│      (from polling)      │
   │    {id, status}        │                          │
   │                        │                          │
```

### 4. Download Video

```
Browser              Backend              Filesystem
   │                    │                      │
   │── GET /content ───►│                      │
   │                    │─── read file ───────►│
   │                    │◄─── stream ──────────│
   │◄─── MP4 stream ────│                      │
   │                    │                      │
```

## Component Interaction

### Frontend Components

```
App.vue
  ├─ Router
  │   ├─ LoginView
  │   │   └─ Login form
  │   │
  │   └─ DashboardView
  │       ├─ CreateVideoCard
  │       │   ├─ Prompt input
  │       │   ├─ Model selector
  │       │   └─ File upload
  │       │
  │       └─ VideoCard (×N)
  │           ├─ Thumbnail
  │           ├─ Progress bar
  │           ├─ Download button
  │           └─ Remix button
  │               └─ RemixDialog
  │
  └─ Stores (Pinia)
      ├─ authStore
      │   ├─ token
      │   ├─ user
      │   └─ login()
      │
      ├─ videosStore
      │   ├─ videos[]
      │   ├─ fetchVideos()
      │   ├─ createVideo()
      │   └─ updateVideo()
      │
      └─ wsStore
          ├─ socket
          ├─ connected
          └─ on('video_update')
```

### Backend Services

```
index.ts (main)
  ├─ Express app
  │   ├─ CORS middleware
  │   ├─ Body parser
  │   └─ Auth middleware
  │
  ├─ Socket.io server
  │   ├─ Auth verification
  │   ├─ Room management
  │   └─ Event handlers
  │
  ├─ Routes
  │   ├─ /api/auth
  │   │   └─ POST /login
  │   │
  │   └─ /api/videos
  │       ├─ POST /
  │       ├─ GET /
  │       ├─ GET /:id
  │       ├─ GET /:id/content
  │       ├─ POST /:id/remix
  │       └─ DELETE /:id
  │
  └─ Services
      ├─ VideoService
      │   ├─ createVideo()
      │   ├─ pollVideoStatus() (internal)
      │   ├─ downloadVideo() (internal)
      │   └─ remixVideo()
      │
      ├─ UserManager
      │   ├─ authenticate()
      │   ├─ getUserById()
      │   └─ createUser()
      │
      └─ VideoDatabase
          ├─ createVideo()
          ├─ updateVideo()
          ├─ getVideo()
          └─ deleteVideo()
```

## State Management

### Frontend State (Pinia)

```
┌──────────────────────────────────────────────────┐
│                   Auth Store                     │
│  • token: string | null                          │
│  • user: User | null                             │
│  • isAuthenticated: computed                     │
│  • login(username, password)                     │
│  • logout()                                      │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│                  Videos Store                    │
│  • videos: Video[]                               │
│  • loading: boolean                              │
│  • error: string | null                          │
│  • fetchVideos()                                 │
│  • createVideo(data)                             │
│  • updateVideo(id, updates)                      │
│  • deleteVideo(id)                               │
│  • remixVideo(id, prompt)                        │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│                WebSocket Store                   │
│  • socket: Socket | null                         │
│  • connected: boolean                            │
│  • connect()                                     │
│  • disconnect()                                  │
│  • requestVideoStatus(id)                        │
│  • on('video_update') → videosStore.update()    │
└──────────────────────────────────────────────────┘
```

### Backend State

```
┌──────────────────────────────────────────────────┐
│              In-Memory State                     │
│  • pollingJobs: Map<videoId, interval>          │
│  • users: Map<username, User> (from JSON)        │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│              SQLite Database                     │
│  • videos table (all video metadata)             │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│              Filesystem                          │
│  • videos/*.mp4 (video files)                    │
│  • videos/*_thumb.webp (thumbnails)              │
│  • uploads/* (temp uploads)                      │
│  • data/users.json (user accounts)               │
│  • data/sora.db (SQLite database)                │
└──────────────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────┐
│              Client                         │
│  • Stores JWT in localStorage               │
│  • Includes in Authorization header         │
│  • Auto-logout on 401                       │
└─────────────────────────────────────────────┘
                   │
                   │ HTTPS (production)
                   ▼
┌─────────────────────────────────────────────┐
│            API Gateway                      │
│  • CORS validation                          │
│  • Rate limiting (future)                   │
└─────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         Auth Middleware                     │
│  • Extract JWT from header                  │
│  • Verify signature (JWT_SECRET)            │
│  • Check expiration                         │
│  • Load user from UserManager               │
│  • Attach to request                        │
└─────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         Route Handlers                      │
│  • Check req.user authorization             │
│  • Validate input                           │
│  • Execute business logic                   │
└─────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│            Services                         │
│  • Verify ownership (user_id match)         │
│  • Sanitize data                            │
│  • Execute operations                       │
└─────────────────────────────────────────────┘
```

## Deployment Architecture (Future)

```
┌──────────────────────────────────────────────────────┐
│                    CDN / CloudFlare                  │
│           (Static assets, DDoS protection)           │
└──────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────┐
│              Load Balancer / Nginx                   │
│        (SSL termination, reverse proxy)              │
└──────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        ▼                                   ▼
┌──────────────────┐              ┌──────────────────┐
│ Frontend Server  │              │ Backend Server   │
│   (Static)       │              │   (Node.js)      │
│ • Vue build      │              │ • Express        │
│ • Nginx          │              │ • Socket.io      │
└──────────────────┘              └──────────────────┘
                                           │
                        ┌──────────────────┼──────────────────┐
                        ▼                  ▼                  ▼
                  ┌──────────┐      ┌──────────┐      ┌──────────┐
                  │PostgreSQL│      │  Redis   │      │   S3     │
                  │(metadata)│      │(sessions)│      │ (videos) │
                  └──────────┘      └──────────┘      └──────────┘
```

---

This architecture provides:
- ✅ **Separation of Concerns**: Frontend, Backend, Database, External API
- ✅ **Real-time Communication**: WebSocket for instant updates
- ✅ **Scalability**: Can scale horizontally with load balancing
- ✅ **Security**: JWT auth, password hashing, authorization checks
- ✅ **Maintainability**: Clear structure, typed interfaces, modular code

