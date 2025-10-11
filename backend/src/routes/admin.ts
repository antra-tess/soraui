import { Router } from 'express';
import { UserManager } from '../auth/users';
import { AuthRequest } from '../auth/middleware';
import bcrypt from 'bcrypt';

export function createAdminRouter(userManager: UserManager): Router {
  const router = Router();

  // List all users (without passwords)
  router.get('/users', (req: AuthRequest, res) => {
    // In a real app, you'd check if user is admin
    // For now, any authenticated user can see users
    try {
      const users = Array.from((userManager as any).users.values()).map((u: any) => ({
        id: u.id,
        username: u.username
      }));
      res.json({ users });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Change password
  router.post('/change-password', async (req: AuthRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }

      // Verify current password
      const user = (userManager as any).users.get(req.user!.username);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isValid = bcrypt.compareSync(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Update password
      const success = userManager.updatePassword(req.user!.username, newPassword);
      
      if (success) {
        res.json({ success: true, message: 'Password changed successfully' });
      } else {
        res.status(500).json({ error: 'Failed to update password' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create new user (admin only - basic implementation)
  router.post('/users', async (req: AuthRequest, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const newUser = userManager.createUser(username, password);
      
      res.json({
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username
        }
      });
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: 'User already exists' });
      }
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

