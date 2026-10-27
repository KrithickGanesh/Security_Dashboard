import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'system_config'
    },
    slaDays: {
      critical: { type: Number, default: 2 },
      high: { type: Number, default: 7 },
      medium: { type: Number, default: 30 },
      low: { type: Number, default: 90 }
    },
    gatePolicyDefaults: {
      failOnCritical: { type: Boolean, default: true },
      maxHigh: { type: Number, default: 5 },
      maxMedium: { type: Number, default: 20 }
    },
    passwordPolicy: {
      minLength: { type: Number, default: 8 },
      requireUppercase: { type: Boolean, default: true },
      requireLowercase: { type: Boolean, default: true },
      requireNumbers: { type: Boolean, default: true },
      requireSymbols: { type: Boolean, default: true },
      lockoutThreshold: { type: Number, default: 5 },
      lockoutMinutes: { type: Number, default: 15 }
    },
    emailNotifications: {
      enabled: { type: Boolean, default: true },
      alertOnCritical: { type: Boolean, default: true },
      alertOnGateFail: { type: Boolean, default: true }
    }
  },
  {
    timestamps: true
  }
);

export const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
