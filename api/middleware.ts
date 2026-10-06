import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from './models';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }
    
    // @ts-ignore
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'village-ecommerce-secret') as any;
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
    return;
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    next();
  }
}
