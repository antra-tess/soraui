# Railway Volume Persistence Check

## How to Verify Your Volume is Working

### In Railway Dashboard:

1. Go to your service
2. Click "**Settings**" tab
3. Scroll to "**Volumes**" section
4. Verify you have a volume:
   - ✅ **Mount Path**: `/app/storage`
   - ✅ **Status**: Active/Mounted
   - ✅ **Size**: 5-10GB

### Check the Logs

When the app starts, you should see ONE of these messages:

**If volume is working (users persisted):**
```
✅ Loaded 2 user(s) from ./storage/data/users.json
```

**If volume is NEW or reset:**
```
⚠️  FIRST RUN: Created default user: admin / admin
⚠️  IMPORTANT: Change this password immediately via Settings!
⚠️  Users file created at: ./storage/data/users.json
```

### Check Which One You See

Look at your Railway deployment logs right after "Server running" - it will show which message appeared.

---

## If Users Were Reset

This happens when:
1. **Volume not mounted** - No volume configured
2. **Volume recreated** - You deleted and recreated the volume
3. **Path mismatch** - Volume mounted at wrong path
4. **First deployment** - This is the first successful deploy with volumes

### Solutions:

#### Option 1: Change Password Again (Quick Fix)
1. Login with `admin` / `admin`
2. Click ⚙️ settings icon
3. Change password
4. Create new users if needed

**Going forward**: Your password will persist as long as the volume remains mounted!

#### Option 2: Verify Volume is Mounted (Permanent Fix)

**In Railway**:
1. Go to **Settings** → **Volumes**
2. Confirm volume exists and is mounted at `/app/storage`
3. If not, add it now

**Test Persistence**:
1. Change your password via UI
2. Trigger a redeploy (Settings → Redeploy)
3. Check logs - should say "Loaded X users"
4. Login - new password should work

---

## How Volume Persistence Works

```
Deployment 1:
  - No users.json exists
  - Creates default admin/admin
  - Saves to /app/storage/data/users.json
  
Deployment 2 (with volume):
  - Checks /app/storage/data/users.json
  - File exists! (from volume)
  - Loads existing users
  - Your changes preserved ✅
  
Deployment 2 (without volume):
  - Checks /app/storage/data/users.json
  - File doesn't exist (fresh container)
  - Creates default admin/admin again ❌
```

---

## Testing Volume Persistence

### Quick Test:

```bash
# 1. Change password via UI
# 2. In Railway, click "Redeploy"
# 3. Check logs for: "✅ Loaded X user(s)"
# 4. Login with NEW password (not admin/admin)
```

If login works with new password → ✅ Volume working!  
If reset to admin/admin → ❌ Volume not working

---

## Railway Volume Best Practices

1. **Add volume BEFORE first deploy** (if possible)
2. **Never delete the volume** (data loss!)
3. **Backup important data**:
   ```bash
   railway run cat storage/data/users.json > users_backup.json
   ```
4. **Monitor volume usage**:
   - Railway dashboard shows storage used
   - Videos will grow over time

---

## Current Situation

Check your Railway logs now. You should see one of:

- ✅ `Loaded X user(s)` - Your changes are safe!
- ⚠️ `FIRST RUN: Created default` - Volume needs verification

Let me know which message you see and I can help further!

---

## Emergency User Recovery

If you need to recover or set users manually:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link
railway login
railway link

# Create/edit users file
railway run bash

# Inside container:
cat > storage/data/users.json << 'EOF'
[
  {
    "id": "user_1",
    "username": "admin",
    "password": "$2b$10$your_bcrypt_hash_here"
  }
]
EOF

exit
```

---

**Bottom line**: Check the logs for the "✅ Loaded" message to confirm your volume is working!

