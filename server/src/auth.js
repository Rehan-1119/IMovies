import jwt from 'jsonwebtoken';
import { User } from './models.js';

const JWT_SECRET = process.env.JWT_SECRET || 'imovies_super_secret_jwt_key_2026_modern_cinema';

export async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return res.status(401).json({ message: 'Sign in required' });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload?.id) {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }

    req.user = await User.findById(payload.id).select('-password').lean();
    if (!req.user) {
      return res.status(401).json({ message: 'User account not found' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token', error: err.message });
  }
}

export function admin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}
