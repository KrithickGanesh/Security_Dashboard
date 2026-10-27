import User from '../models/User.js';
import { generateAccessToken, generateRandomToken, hashToken } from '../utils/token.js';
import { sendEmail } from '../utils/email.js';

export class AuthService {
  /**
   * Register a new user with Developer role by default.
   */
  async registerUser({ name, email, password, role = 'Developer' }) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      const error = new Error('An account with this email already exists.');
      error.statusCode = 409;
      throw error;
    }

    // Restrict public registration to Developer role (Admins can be created or updated later)
    const assignedRole = role === 'Admin' ? 'Developer' : role;

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: assignedRole
    });

    const accessToken = generateAccessToken(user);
    const rawRefreshToken = generateRandomToken();
    user.refreshToken = hashToken(rawRefreshToken);
    await user.save();

    const sanitizedUser = user.toObject();
    delete sanitizedUser.password;
    delete sanitizedUser.refreshToken;

    return { user: sanitizedUser, accessToken, rawRefreshToken };
  }

  /**
   * Authenticate user with lockout enforcement and refresh token rotation.
   */
  async loginUser({ email, password }) {
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password +refreshToken +lockUntil +failedLoginAttempts');

    if (!user) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    if (!user.isActive) {
      const error = new Error('This account has been deactivated. Please contact an administrator.');
      error.statusCode = 403;
      throw error;
    }

    // Check account lockout
    if (user.isLocked()) {
      const minutesRemaining = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
      const error = new Error(
        `Account locked due to consecutive failed login attempts. Please try again in ${minutesRemaining} minute(s).`
      );
      error.statusCode = 423; // Locked
      error.lockUntil = user.lockUntil;
      throw error;
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incrementFailedAttempts(5, 15);
      const remaining = Math.max(0, 5 - user.failedLoginAttempts);

      let msg = 'Invalid email or password.';
      if (user.isLocked()) {
        msg = 'Account has been locked for 15 minutes due to 5 failed login attempts.';
      } else if (remaining > 0 && remaining <= 3) {
        msg = `Invalid credentials. ${remaining} attempt(s) remaining before account lockout.`;
      }

      const error = new Error(msg);
      error.statusCode = 401;
      throw error;
    }

    // Reset lockout on successful login
    await user.resetLockout();
    user.lastLogin = new Date();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const rawRefreshToken = generateRandomToken();
    user.refreshToken = hashToken(rawRefreshToken);
    await user.save();

    const sanitizedUser = user.toObject();
    delete sanitizedUser.password;
    delete sanitizedUser.refreshToken;

    return { user: sanitizedUser, accessToken, rawRefreshToken };
  }

  /**
   * Rotate refresh token and issue a fresh access token.
   */
  async refreshUserToken(incomingRefreshToken) {
    if (!incomingRefreshToken) {
      const error = new Error('Refresh token is required.');
      error.statusCode = 401;
      throw error;
    }

    const hashedToken = hashToken(incomingRefreshToken);
    const user = await User.findOne({ refreshToken: hashedToken })
      .select('+refreshToken');

    if (!user || !user.isActive) {
      const error = new Error('Invalid or expired refresh token.');
      error.statusCode = 401;
      throw error;
    }

    // Refresh token rotation: issue new pair
    const accessToken = generateAccessToken(user);
    const newRawRefreshToken = generateRandomToken();
    user.refreshToken = hashToken(newRawRefreshToken);
    await user.save();

    const sanitizedUser = user.toObject();
    delete sanitizedUser.refreshToken;

    return { user: sanitizedUser, accessToken, rawRefreshToken: newRawRefreshToken };
  }

  /**
   * Server-side logout: invalidate refresh token.
   */
  async logoutUser(userId) {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    return true;
  }

  /**
   * Invalidate all sessions by nullifying refresh token.
   */
  async logoutAllDevices(userId) {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    return true;
  }

  /**
   * Initiate forgot password flow with 15-minute token.
   */
  async forgotPassword(email, clientUrl = 'http://localhost:5173') {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return neutral message to prevent user enumeration
      return { message: 'If that email is registered, a password reset link has been dispatched.' };
    }

    const rawResetToken = generateRandomToken(32);
    user.passwordResetToken = hashToken(rawResetToken);
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    const resetUrl = `${clientUrl}/reset-password/${rawResetToken}`;

    const text = `You requested a password reset for your DevSecOps Dashboard account.\n\nPlease navigate to this link to reset your password within 15 minutes:\n${resetUrl}\n\nIf you did not request this, please disregard this email.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0B1220; color: #E6EDF7; border-radius: 8px;">
        <h2 style="color: #22D3EE;">Password Reset Request</h2>
        <p>A password reset was requested for your account: <strong>${user.email}</strong>.</p>
        <p>Click the link below or paste it into your browser to set a new password. This link expires in 15 minutes.</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #22D3EE; color: #0B1220; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px;">Reset Password</a>
        </div>
        <p style="color: #8FA1BF; font-size: 13px;">Direct URL: <a href="${resetUrl}" style="color: #22D3EE;">${resetUrl}</a></p>
        <p style="color: #8FA1BF; font-size: 12px; margin-top: 24px;">If you did not request this reset, your account remains secure and no action is necessary.</p>
      </div>
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: 'DevSecOps Dashboard - Password Reset Request',
        text,
        html
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      throw new Error('Failed to send password reset email. Please try again later.');
    }

    return { message: 'If that email is registered, a password reset link has been dispatched.' };
  }

  /**
   * Reset password with valid 15-minute token.
   */
  async resetPassword(token, newPassword) {
    const hashedToken = hashToken(token);

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    }).select('+password +passwordResetToken +passwordResetExpires +refreshToken');

    if (!user) {
      const error = new Error('Password reset token is invalid or has expired.');
      error.statusCode = 400;
      throw error;
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = null; // Invalidate any existing sessions
    await user.save();

    return { message: 'Password has been successfully updated. You may now log in.' };
  }

  /**
   * Change password for logged-in user.
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password +refreshToken');
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      const error = new Error('Current password does not match.');
      error.statusCode = 400;
      throw error;
    }

    user.password = newPassword;
    user.refreshToken = null; // Force re-login on other devices
    await user.save();

    return { message: 'Password updated successfully.' };
  }

  /**
   * Update profile information.
   */
  async updateProfile(userId, { name, notificationPreferences }) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      throw error;
    }

    if (name) user.name = name.trim();
    if (notificationPreferences) {
      user.notificationPreferences = {
        ...user.notificationPreferences,
        ...notificationPreferences
      };
    }

    await user.save();
    return user;
  }
}

export const authService = new AuthService();
export default authService;
