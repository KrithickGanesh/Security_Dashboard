import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'API Key name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    keyId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    encryptedSecret: {
      type: String,
      required: true,
      select: false
    },
    hashedSecret: {
      type: String,
      required: true,
      select: false
    },
    allowedTools: {
      type: [String],
      default: ['trivy', 'gitleaks', 'npm-audit', 'semgrep']
    },
    autoCreateProject: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastUsedAt: {
      type: Date,
      default: null
    },
    revoked: {
      type: Boolean,
      default: false,
      index: true
    },
    revokedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const ApiKey = mongoose.model('ApiKey', apiKeySchema);
export default ApiKey;
