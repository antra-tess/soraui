import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserManager } from './users';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
}

export function createAuthMiddleware(userManager: UserManager, jwtSecret: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, jwtSecret) as { userId: string; username: string };
      const user = userManager.getUserById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      req.user = {
        id: user.id,
        username: user.username
      };

      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

