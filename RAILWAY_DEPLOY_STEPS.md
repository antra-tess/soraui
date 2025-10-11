# Deploy to Railway - Step by Step

## ✅ Step 1: Push to GitHub (Complete these steps)

### Option A: Using GitHub CLI (Easiest)
```bash
# If you have gh CLI installed
gh repo create sora2-platform --private --source=. --remote=origin --push
```

### Option B: Manual GitHub Setup
1. Go to https://github.com/new
2. Create a new repository named `sora2-platform` (private)
3. **Don't** initialize with README, .gitignore, or license
4. Copy the repository URL

Then run:
```bash
cd /Users/olena/spra2
git remote add origin https://github.com/YOUR_USERNAME/sora2-platform.git
git branch -M main
git push -u origin main
```

---

## ✅ Step 2: Deploy on Railway

### 2.1: Sign Up / Login
1. Go to https://railway.app
2. Click "Login" and sign in with GitHub
3. Authorize Railway to access your repositories

### 2.2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `sora2-platform` repository
4. Railway will start deploying automatically

### 2.3: Configure Environment Variables
1. Once deployed, click on your service
2. Go to "Variables" tab
3. Click "Add Variable" and add these:

**Required Variables:**
```
OPENAI_API_KEY = your_openai_api_key_here
JWT_SECRET = create_a_random_secure_string_here
NODE_ENV = production
```

**Optional Variables:**
```
PORT = 3000
VIDEOS_DIR = ./videos
DATABASE_PATH = ./data/sora.db
USERS_FILE = ./data/users.json
```

### 2.4: Add Persistent Storage (Important!)
Railway needs persistent volumes for:
- Database (`data/`)
- Videos (`videos/`)

**In Railway Dashboard:**
1. Click on your service
2. Go to "Data" or "Volumes" tab
3. Add volume:
   - **Mount Path**: `/app/data`
   - **Name**: `sora-data`
4. Add another volume:
   - **Mount Path**: `/app/videos`
   - **Name**: `sora-videos`

### 2.5: Wait for Deployment
- Railway will rebuild with environment variables
- Check the "Deployments" tab for progress
- Look for green checkmark ✅

### 2.6: Get Your URL
1. Go to "Settings" tab
2. Under "Domains", Railway auto-generates a URL like:
   ```
   https://sora2-platform-production-xxxx.up.railway.app
   ```
3. Click "Generate Domain" if not auto-generated

---

## ✅ Step 3: Access Your Platform

1. **Open the Railway URL** in your browser
2. **Login** with:
   - Username: `admin`
   - Password: `admin`
3. **Change password immediately!**

---

## 🔧 Post-Deployment Setup

### Change Default Password
SSH into Railway or use Railway CLI:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Access shell
railway run bash

# Generate new password hash
node -e "console.log(require('bcrypt').hashSync('your_new_password', 10))"

# Edit users.json
nano data/users.json
```

### Monitor Your Deployment
- **Logs**: Click "Deployments" → View logs
- **Metrics**: Check CPU/RAM usage
- **Costs**: Monitor in Railway billing

---

## 🐛 Troubleshooting

### Build Fails
**Check Railway logs for errors**
- Missing dependencies? Check package.json
- TypeScript errors? Run `npm run build` locally first

### App Crashes on Start
**Common issues:**
- Missing environment variables
- Database not writable (check volumes)
- Port conflicts

**Solutions:**
```bash
# View logs in Railway dashboard
# Or use CLI:
railway logs
```

### WebSocket Not Working
**Issue**: Railway might need WebSocket configuration

**Solution**: WebSocket should work by default on Railway, but if not:
- Check Railway docs for WebSocket support
- Verify `socket.io` is properly configured

### Database/Videos Not Persisting
**Issue**: No volumes configured

**Solution**: Add persistent volumes (Step 2.4 above)

---

## 💰 Railway Pricing

- **Free Tier**: $5 credit/month (enough for testing)
- **Hobby Plan**: ~$5-20/month for light usage
- **Pro Plan**: Usage-based, ~$20-50/month

**Tips to reduce costs:**
- Remove unused deployments
- Monitor resource usage
- Use sleep mode for non-production instances

---

## 🔄 Deploying Updates

After making changes:

```bash
# Commit changes
git add .
git commit -m "Your changes"
git push

# Railway auto-deploys! 🎉
```

---

## 📊 Monitoring

**In Railway Dashboard:**
- CPU usage
- Memory usage
- Network traffic
- Build times
- Error logs

**External Monitoring** (recommended):
- UptimeRobot (free) - checks if site is up
- Healthchecks.io - monitors background jobs

---

## ✅ Success Checklist

- [ ] Code pushed to GitHub
- [ ] Railway project created
- [ ] Environment variables set
- [ ] Persistent volumes added
- [ ] Deployment successful (green ✓)
- [ ] Can access the URL
- [ ] Can login with admin/admin
- [ ] Changed default password
- [ ] Created first video successfully
- [ ] Cost tracking working

---

## 🎉 You're Live!

Your Sora2 platform is now:
- ✅ Deployed to Railway
- ✅ Accessible from anywhere
- ✅ Auto-deploys on git push
- ✅ SSL/HTTPS enabled
- ✅ WebSocket working
- ✅ Ready for production use

**Share the URL with your team and start creating videos!** 🎬

---

## 📞 Need Help?

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Or check the main DEPLOYMENT.md file

