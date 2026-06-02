import { Request, Response, NextFunction } from 'express';
import { jwtService } from '../../../services/auth/jwtService';
import { userService } from '../../../services/auth/userService';

export interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { message: 'No token provided' } });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwtService.verify(token);
    const user = await userService.findById(payload.userId);
    if (!user) {
      res.status(401).json({ success: false, error: { message: 'User not found' } });
      return;
    }
    req.user = { id: user.id, email: user.email };
    next();
  } catch {
    res.status(401).json({ success: false, error: { message: 'Invalid or expired token' } });
  }
};
