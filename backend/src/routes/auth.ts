import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { UserManager } from '../auth/users';

export function createAuthRouter(userManager: UserManager, jwtSecret: string): Router {
  const router = Router();

  router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = userManager.authenticate(username, password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  });

  return router;
}

