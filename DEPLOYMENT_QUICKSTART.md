# 🚀 Quick Deployment Guide

## Choose Your Deployment Method

### 1️⃣ Docker on VPS (Recommended) - $12/month

**Best for**: Production use, full control, predictable costs

```bash
# On your VPS (Ubuntu)
git clone <your-repo>
cd spra2

# Setup
cp backend/.env.example backend/.env
nano backend/.env  # Add OPENAI_API_KEY

# Deploy
docker-compose up -d

# Access
# Frontend: http://your-ip:5173
# Backend: http://your-ip:3000
```

**Providers**:
- [DigitalOcean](https://digitalocean.com) - $12/month (2GB RAM)
- [Linode](https://linode.com) - $12/month
- [Hetzner](https://hetzner.com) - €4.5/month (cheaper!)

**Setup Time**: 30 minutes  
**Difficulty**: Easy-Medium

---

### 2️⃣ Railway.app (Fastest) - Free tier / $20+/month

**Best for**: Quick deploy, no DevOps needed

**Steps**:
1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub"
4. Select your repo
5. Add env vars:
   - `OPENAI_API_KEY`: Your key
   - `JWT_SECRET`: Random string
   - `NODE_ENV`: production
6. Deploy!

**Setup Time**: 15 minutes  
**Difficulty**: Very Easy

---

### 3️⃣ Render.com - Free tier / $15+/month

**Best for**: Balance of ease and cost

**Steps**:
1. Push to GitHub
2. Go to [render.com](https://render.com)
3. Create "Web Service" from repo
4. Select `/backend` as root directory
5. Add environment variables
6. Create "Static Site" for frontend
7. Deploy both

**Setup Time**: 30 minutes  
**Difficulty**: Easy

---

## 📊 Quick Comparison

| Option | Cost/Month | Setup Time | Difficulty | Best For |
|--------|-----------|------------|------------|----------|
| **Docker + VPS** | $10-20 | 30 min | Medium | Production, control |
| **Railway** | $0-50 | 15 min | Easy | Quick start, MVP |
| **Render** | $0-30 | 30 min | Easy | Balance |
| **Fly.io** | $0-20 | 20 min | Medium | Global edge |

---

## 🎯 My Top Pick: Docker on DigitalOcean

### Why?
- ✅ Simple one-server setup
- ✅ $12/month flat fee
- ✅ Full control
- ✅ Easy backups
- ✅ Can migrate anywhere
- ✅ Persistent storage included

### Quick Setup

```bash
# 1. Create DigitalOcean droplet (2GB RAM, Ubuntu 22.04)
# 2. SSH in and run:

curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin git -y

git clone <your-repo>
cd spra2

cp backend/.env.example backend/.env
nano backend/.env  # Add your OPENAI_API_KEY

docker-compose up -d

# Done! Access at http://your-droplet-ip:5173
```

### Add Domain (Optional)

```bash
# Point domain A record to your server IP
# Then run:

apt install nginx certbot python3-certbot-nginx -y
cp nginx.conf /etc/nginx/sites-available/sora2
ln -s /etc/nginx/sites-available/sora2 /etc/nginx/sites-enabled/
nano /etc/nginx/sites-available/sora2  # Update domain name
nginx -t && systemctl restart nginx
certbot --nginx -d yourdomain.com

# Now access at https://yourdomain.com
```

---

## 🔧 Post-Deployment

### 1. Change Default Password

Login and edit `backend/data/users.json`:
```javascript
const bcrypt = require('bcrypt');
console.log(bcrypt.hashSync('new_secure_password', 10));
```

### 2. Setup Backups

```bash
# Create backup script
cat > /root/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cd /root/spra2
tar -czf /root/backups/sora2_$DATE.tar.gz backend/data backend/videos
# Keep only last 7 backups
ls -t /root/backups/*.tar.gz | tail -n +8 | xargs rm -f
EOF

chmod +x /root/backup.sh
mkdir -p /root/backups

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /root/backup.sh" | crontab -
```

### 3. Monitor Disk Space

```bash
# Check disk usage
df -h
du -sh backend/videos

# Setup alert (optional)
```

### 4. Setup Monitoring

Free options:
- [UptimeRobot](https://uptimerobot.com) - Uptime monitoring
- [Healthchecks.io](https://healthchecks.io) - Cron job monitoring

---

## 🆘 Troubleshooting

### Containers won't start
```bash
docker-compose logs backend
docker-compose logs frontend
```

### Can't access from browser
```bash
# Check firewall
ufw status
ufw allow 3000
ufw allow 5173
```

### Out of disk space
```bash
# Check space
df -h

# Clean old videos
cd backend/videos
ls -lth | tail -20  # See oldest videos
# Manually delete if needed
```

### Database issues
```bash
# Backup then reset
cp backend/data/sora.db backend/data/sora.db.backup
rm backend/data/sora.db
docker-compose restart backend
```

---

## 📱 Access URLs

**Development**:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

**Production (Docker on VPS)**:
- Frontend: http://your-server-ip:5173
- Backend: http://your-server-ip:3000

**Production (with nginx + domain)**:
- App: https://yourdomain.com
- API: https://yourdomain.com/api

---

## 🔄 Update Deployment

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

Or use the deploy script:
```bash
./deploy.sh
```

---

## 💡 Tips

1. **Start small**: Deploy to Railway first to test
2. **Monitor costs**: Videos take up space!
3. **Regular backups**: Automate with cron
4. **Use a domain**: Makes it professional
5. **HTTPS always**: Use Let's Encrypt (free)
6. **Watch disk**: Videos grow fast

---

Need help? See `DEPLOYMENT.md` for detailed guides!

