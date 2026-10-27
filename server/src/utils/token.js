import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Generate a short-lived 15-minute JWT access token.
 */
export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    process.env.JWT_SECRET || 'devsecops_jwt_secret_fallback',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    }
  );
};

/**
 * Generate a cryptographically secure random token string.
 */
export const generateRandomToken = (bytes = 40) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Hash a sensitive token (refresh token, reset token, API key secret) using SHA-256.
 */
export const hashToken = (token) => {
  if (!token) return null;
  return crypto.createHash('sha256').update(token).digest('hex');
};
