import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Unauthorized access attempt: Missing or malformed Authorization header', {
        ip: req.ip,
        path: req.originalUrl,
        method: req.method
      });
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required'
      });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'nexus_corporate_jwt_secret_fallback_2026';

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      logger.warn('Unauthorized access attempt: Invalid or expired JWT', {
        ip: req.ip,
        path: req.originalUrl,
        error: err.message
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token'
      });
    }

    // Lookup user in DB to ensure account wasn't deleted / permissions modified
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      logger.warn('Unauthorized access attempt: User not found for token', {
        userId: decoded.userId,
        ip: req.ip
      });
      return res.status(401).json({
        success: false,
        message: 'User account not found or deactivated'
      });
    }

    // Attach authenticated context to req.user
    req.user = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name
    };

    next();
  } catch (error) {
    logger.error('Authentication middleware error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};
