# User Management Guide

## Overview

There are two ways to manage users in the Sora2 platform:

1. **Via Web UI** (Easiest) ⭐ Recommended
2. **Via Railway CLI** (Direct file editing)

---

## Method 1: Web UI (Easiest) ⭐

### Change Your Password

1. **Login** to the platform
2. Click the **settings icon** (⚙️) in the top right
3. Go to "**Change Password**" tab
4. Enter:
   - Current password
   - New password (min 6 characters)
   - Confirm new password
5. Click "**Change Password**"

### Create New Users

1. **Login** to the platform
2. Click the **settings icon** (⚙️)
3. Go to "**Manage Users**" tab
4. Enter:
   - Username for new user
   - Password (min 6 characters)
5. Click "**Create User**"

That's it! The new user can immediately login.

---

## Method 2: Railway CLI (Advanced)

### Install Railway CLI

```bash
npm install -g @railway/cli
```

### Access Your Deployment

```bash
# Login to Railway
railway login

# Link to your project
railway link

# Open a shell in your running container
railway shell
```

### Change Password

```bash
# In Railway shell:

# Generate password hash
node -e "console.log(require('bcrypt').hashSync('new_password_here', 10))"

# Copy the hash (starts with $2b$10$...)

# Edit users file
nano storage/data/users.json

# Update the password field with the hash
# Save and exit (Ctrl+X, Y, Enter)
```

### Add New User

```bash
# In Railway shell:

# Generate password hash
node -e "console.log(require('bcrypt').hashSync('user_password', 10))"

# Edit users file
nano storage/data/users.json

# Add new user entry:
# {
#   "id": "user_2",
#   "username": "alice",
#   "password": "$2b$10$paste_hash_here"
# }

# Save and exit
```

### Example users.json

```json
[
  {
    "id": "user_1",
    "username": "admin",
    "password": "$2b$10$CwTycUXWue0Thq9StjUM0uJ8E.7VUr6XNZs0vGfN.EQ7kYVZQJ.P6"
  },
  {
    "id": "user_2",
    "username": "alice",
    "password": "$2b$10$newhashedpasswordhere"
  },
  {
    "id": "user_3",
    "username": "bob",
    "password": "$2b$10$anotherhashedpassword"
  }
]
```

---

## API Endpoints (For Programmatic Access)

### Change Password

```bash
POST /api/admin/change-password
Authorization: Bearer <token>

{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

### Create User

```bash
POST /api/admin/users
Authorization: Bearer <token>

{
  "username": "newuser",
  "password": "password123"
}
```

### List Users

```bash
GET /api/admin/users
Authorization: Bearer <token>
```

---

## 🔐 Security Best Practices

1. **Change Default Password Immediately**
   - Default is `admin` / `admin`
   - Change via UI or CLI

2. **Use Strong Passwords**
   - Minimum 6 characters (enforced)
   - Recommend 12+ characters
   - Mix letters, numbers, symbols

3. **Limit User Access**
   - Only create accounts for people who need them
   - Each user sees all platform costs (by design)

4. **Regular Password Rotation**
   - Change passwords periodically
   - Especially if users leave

---

## 🆘 Troubleshooting

### Can't Change Password via UI

**Check:**
- Are you logged in?
- Is current password correct?
- Is new password at least 6 characters?

**Try:**
- Logout and login again
- Use Railway CLI method instead

### Can't Create New User

**Common Issues:**
- Username already exists
- Password too short
- File permissions (Railway volumes)

**Solutions:**
- Try different username
- Make password longer
- Use Railway CLI to check `storage/data/users.json`

### Forgot Admin Password

**Recovery via Railway CLI:**

```bash
railway shell

# Reset admin password
node -e "
const fs = require('fs');
const bcrypt = require('bcrypt');
const users = JSON.parse(fs.readFileSync('storage/data/users.json'));
users[0].password = bcrypt.hashSync('newadminpass', 10);
fs.writeFileSync('storage/data/users.json', JSON.stringify(users, null, 2));
console.log('Admin password reset to: newadminpass');
"

# Exit shell
exit

# Login with new password
```

---

## 💡 Tips

1. **First Login**: Change admin password immediately
2. **User Creation**: Use the web UI - it's easier and safer
3. **Backup**: Download `users.json` periodically
4. **Team**: Create individual accounts for each team member
5. **Costs**: All users can see platform-wide costs (transparent spending)

---

## 📚 Related Docs

- Backend README - API documentation
- RAILWAY_DEPLOY_STEPS.md - Railway setup
- QUICK_REFERENCE.md - API quick reference

---

**Managing users is now easy via the web UI!** No need to SSH or edit files manually. 🎉

