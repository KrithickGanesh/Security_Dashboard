import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Authentication middleware verifying JWT Bearer token.
 */
export const authenticate = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
        data: null
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'devsecops_jwt_secret_fallback'
    );

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
        data: null
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact an administrator.',
        data: null
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
        data: null
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
      data: null
    });
  }
};

/**
 * Role-Based Access Control (RBAC) middleware.
 * @param  {...string} roles - Permitted user roles.
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        data: null
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' is not authorized to access this resource.`,
        data: null
      });
    }

    next();
  };
};
