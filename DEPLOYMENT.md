# Deployment Guide - Sora2 Platform

## Overview

The Sora2 platform consists of:
- **Backend**: Node.js (Express + Socket.io) - Needs persistent storage
- **Frontend**: Vue 3 (Static files)
- **Database**: SQLite (file-based)
- **Storage**: Local filesystem for videos
- **WebSocket**: Real-time updates

## 🎯 Recommended Options

### Option 1: Docker + VPS (Best for Control & Cost) ⭐ RECOMMENDED

**Best for**: Full control, predictable costs, medium-long term use

**Pros**:
- Complete control over environment
- Persistent storage built-in
- Single server simplicity
- ~$10-20/month
- Easy to backup and migrate

**Cons**:
- You manage the server
- Manual scaling

**Providers**: DigitalOcean, Linode, Hetzner, Vultr

**Setup**: See Docker deployment section below

---

### Option 2: Railway.app (Easiest Deploy) ⚡ FASTEST

**Best for**: Quick deployment, hobby projects, MVP

**Pros**:
- One-click GitHub deploy
- Automatic SSL
- Built-in databases
- WebSocket support
- Free tier available

**Cons**:
- Can get expensive at scale ($20-50+/month)
- Less control over infrastructure

**Setup**: See Railway deployment section below

---

### Option 3: Split Deployment (Best for Scale) 🚀

**Best for**: Production, scaling, CDN benefits

**Frontend**: Vercel/Netlify (free tier)
**Backend**: Railway/Render
**Storage**: AWS S3/Cloudflare R2

**Pros**:
- Frontend on CDN (fast globally)
- Backend can scale independently
- Good performance

**Cons**:
- More complex setup
- Storage needs cloud integration

---

## 🐳 Docker Deployment (RECOMMENDED)

### Prerequisites
- VPS with Ubuntu 22.04 (DigitalOcean droplet, etc.)
- Domain name (optional but recommended)

### Files Created
See `docker-compose.yml` and `Dockerfile.*` in the project root.

### Steps

1. **Get a VPS**:
   ```bash
   # DigitalOcean $12/month droplet
   # 2GB RAM, 50GB SSD, 2 vCPUs
   ```

2. **Setup Server**:
   ```bash
   # SSH into your server
   ssh root@your-server-ip
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Install Docker Compose
   apt-get install docker-compose-plugin
   ```

3. **Deploy App**:
   ```bash
   # Clone your repo
   git clone <your-repo>
   cd spra2
   
   # Create .env file
   cp backend/.env.example backend/.env
   nano backend/.env  # Add your OPENAI_API_KEY
   
   # Build and start
   docker-compose up -d
   ```

4. **Setup Domain (Optional)**:
   ```bash
   # Install nginx
   apt install nginx certbot python3-certbot-nginx
   
   # Configure nginx (see nginx.conf below)
   certbot --nginx -d yourdomain.com
   ```

5. **Access**:
   - Frontend: `http://your-server-ip:5173`
   - Backend: `http://your-server-ip:3000`
   - With nginx: `https://yourdomain.com`

---

## 🚂 Railway Deployment (EASIEST)

### Setup

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo>
   git push -u origin main
   ```

2. **Deploy on Railway**:
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub"
   - Select your repository
   - Add environment variables:
     - `OPENAI_API_KEY`: Your key
     - `JWT_SECRET`: Random string
     - `PORT`: 3000

3. **Frontend Deploy**:
   - Create new service for frontend
   - Or use Vercel/Netlify for frontend only

---

## ☁️ AWS Deployment (Production Scale)

### Architecture

```
CloudFront (CDN)
    ↓
S3 (Frontend)
    ↓
ALB → EC2/ECS (Backend)
    ↓
RDS (PostgreSQL) + S3 (Videos)
```

### Services Needed
- **EC2** or **App Runner**: Backend hosting
- **S3**: Frontend static files + Videos
- **CloudFront**: CDN
- **RDS**: PostgreSQL (upgrade from SQLite)
- **ElastiCache**: Redis (for sessions at scale)

### Estimated Cost
- ~$30-100/month depending on usage
- More complex but highly scalable

---

## 📦 Configuration Files

All deployment configs are in:
- `docker-compose.yml` - Docker setup
- `Dockerfile.backend` - Backend container
- `Dockerfile.frontend` - Frontend container  
- `railway.json` - Railway config
- `nginx.conf` - Nginx reverse proxy

---

## 🔒 Security Checklist

Before deploying:

- [ ] Change default admin password
- [ ] Set strong JWT_SECRET
- [ ] Enable HTTPS (use Let's Encrypt)
- [ ] Set up firewall (ufw on Ubuntu)
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up backups
- [ ] Use environment variables (never commit secrets)
- [ ] Set up monitoring (UptimeRobot, etc.)

---

## 💾 Backup Strategy

### What to Backup
1. **Database**: `backend/data/sora.db`
2. **Videos**: `backend/videos/`
3. **Users**: `backend/data/users.json`
4. **Config**: `backend/.env`

### Automated Backup Script
```bash
#!/bin/bash
# Save as backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf backup_$DATE.tar.gz backend/data backend/videos
# Upload to S3, Dropbox, etc.
```

### Cron Job
```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup.sh
```

---

## 📊 Monitoring

### Essential Metrics
- Server CPU/RAM usage
- Disk space (videos grow!)
- API response times
- Error rates
- Video generation success rate

### Tools
- **Free**: UptimeRobot, Healthchecks.io
- **Paid**: Datadog, New Relic, Sentry

---

## 🔄 Updates & Maintenance

### Update Deployment (Docker)
```bash
cd /path/to/spra2
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

### Update Deployment (Railway)
- Just push to GitHub
- Railway auto-deploys

---

## 💰 Cost Comparison

| Option | Setup Time | Monthly Cost | Scalability | Complexity |
|--------|-----------|--------------|-------------|------------|
| **Docker + VPS** | 1-2 hours | $10-20 | Medium | Medium |
| **Railway** | 15 min | $20-50 | High | Low |
| **Render** | 30 min | $15-40 | High | Low |
| **AWS Full Stack** | 4-8 hours | $50-200 | Very High | High |
| **Vercel + Railway** | 1 hour | $20-40 | High | Medium |

---

## 🎯 My Recommendation

**For You**: Start with **Docker + DigitalOcean**

**Why**:
1. ✅ Full control over data
2. ✅ Predictable $12/month cost
3. ✅ Simple architecture (one server)
4. ✅ Easy backups
5. ✅ Can migrate anywhere later
6. ✅ Persistent storage included
7. ✅ WebSocket support

**Next Steps**:
1. Get DigitalOcean droplet ($12/month, 2GB RAM)
2. Use Docker deployment (I've created the files)
3. Point domain to it (optional)
4. Set up automated backups
5. Monitor disk space (videos!)

---

## 🆘 Troubleshooting

### Common Issues

**WebSocket not connecting**:
- Ensure port 3000 is open
- Check nginx WebSocket proxy config
- Verify CORS settings

**Videos not downloading**:
- Check disk space: `df -h`
- Verify permissions: `chmod 755 backend/videos`
- Check backend logs

**Out of disk space**:
- Monitor with: `du -sh backend/videos`
- Add cleanup cron job
- Consider S3 for video storage

---

## 📚 Additional Resources

- [Docker Docs](https://docs.docker.com/)
- [Railway Docs](https://docs.railway.app/)
- [DigitalOcean Tutorials](https://www.digitalocean.com/community/tutorials)
- [Let's Encrypt](https://letsencrypt.org/)

---

**Need help?** Check the deployment files I've created or ask for specific setup assistance!

