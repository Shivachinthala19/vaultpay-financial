import { logger } from '../utils/logger.js';

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.security('Role authorization failure: Access denied', {
        userId: req.user?.userId,
        currentRole: req.user?.role,
        requiredRoles: roles,
        path: req.originalUrl
      });

      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to access this resource'
      });
    }
    next();
  };
};
