import authService from '../services/auth.service.js';
import { parseCookies, setRefreshTokenCookie, clearRefreshTokenCookie } from '../utils/cookies.js';

export class AuthController {
  /**
   * Register new user
   */
  async register(req, res, next) {
    try {
      const { name, email, password, role } = req.body;
      const { user, accessToken, rawRefreshToken } = await authService.registerUser({
        name,
        email,
        password,
        role
      });

      setRefreshTokenCookie(res, rawRefreshToken);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user,
          accessToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * User login with lockout enforcement and cookie refresh token
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user, accessToken, rawRefreshToken } = await authService.loginUser({
        email,
        password
      });

      setRefreshTokenCookie(res, rawRefreshToken);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user,
          accessToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Silent refresh token rotation
   */
  async refresh(req, res, next) {
    try {
      const cookies = parseCookies(req);
      const incomingRefreshToken = cookies.refreshToken || req.body?.refreshToken;

      if (!incomingRefreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token cookie or payload missing',
          data: null
        });
      }

      const { user, accessToken, rawRefreshToken } = await authService.refreshUserToken(
        incomingRefreshToken
      );

      setRefreshTokenCookie(res, rawRefreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          user,
          accessToken
        }
      });
    } catch (error) {
      clearRefreshTokenCookie(res);
      next(error);
    }
  }

  /**
   * Single-session logout
   */
  async logout(req, res, next) {
    try {
      if (req.user?._id) {
        await authService.logoutUser(req.user._id);
      }
      clearRefreshTokenCookie(res);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
        data: null
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout across all devices
   */
  async logoutAll(req, res, next) {
    try {
      if (req.user?._id) {
        await authService.logoutAllDevices(req.user._id);
      }
      clearRefreshTokenCookie(res);

      res.status(200).json({
        success: true,
        message: 'Logged out from all active sessions',
        data: null
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current authenticated user
   */
  async getMe(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        message: 'User profile retrieved',
        data: {
          user: req.user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update profile
   */
  async updateProfile(req, res, next) {
    try {
      const { name, notificationPreferences } = req.body;
      const updatedUser = await authService.updateProfile(req.user._id, {
        name,
        notificationPreferences
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: updatedUser
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(
        req.user._id,
        currentPassword,
        newPassword
      );

      clearRefreshTokenCookie(res);

      res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request password reset link
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const clientUrl = req.headers.origin || process.env.CLIENT_URL || 'http://localhost:5173';
      const result = await authService.forgotPassword(email, clientUrl);

      res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(req, res, next) {
    try {
      const { token } = req.params;
      const { password } = req.body;
      const result = await authService.resetPassword(token, password);

      res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
export default authController;
