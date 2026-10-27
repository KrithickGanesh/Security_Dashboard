import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false
    },
    role: {
      type: String,
      enum: {
        values: ['Admin', 'Security Analyst', 'Developer', 'Auditor'],
        message: '{VALUE} is not a valid role'
      },
      default: 'Developer'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date,
      default: null
    },
    lastLogin: {
      type: Date,
      default: null
    },
    refreshToken: {
      type: String,
      select: false
    },
    passwordResetToken: {
      type: String,
      select: false
    },
    passwordResetExpires: {
      type: Date,
      select: false
    },
    notificationPreferences: {
      email: {
        type: Boolean,
        default: true
      },
      inApp: {
        type: Boolean,
        default: true
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
userSchema.index({ role: 1 });

/**
 * Pre-save middleware to hash password with bcrypt cost factor of 12.
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/**
 * Compare plain password with stored bcrypt hash.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Check if the user account is currently locked due to failed attempts.
 */
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

/**
 * Increment failed attempts and trigger lockout if threshold is reached.
 */
userSchema.methods.incrementFailedAttempts = async function (threshold = 5, lockMinutes = 15) {
  // If a previous lock has expired, restart count
  if (this.lockUntil && this.lockUntil <= new Date()) {
    this.failedLoginAttempts = 1;
    this.lockUntil = null;
  } else {
    this.failedLoginAttempts += 1;
    if (this.failedLoginAttempts >= threshold && !this.lockUntil) {
      this.lockUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
    }
  }
  return this.save({ validateBeforeSave: false });
};

/**
 * Reset lockout state and clear failed attempts.
 */
userSchema.methods.resetLockout = async function () {
  this.failedLoginAttempts = 0;
  this.lockUntil = null;
  return this.save({ validateBeforeSave: false });
};

export const User = mongoose.model('User', userSchema);
export default User;
