import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      unique: true,
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters']
    },
    key: {
      type: String,
      required: [true, 'Project key is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9_-]{2,20}$/, 'Key must be 2-20 uppercase alphanumeric, dash, or underscore characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: ''
    },
    repositoryUrl: {
      type: String,
      trim: true,
      default: ''
    },
    criticality: {
      type: String,
      enum: {
        values: ['Critical', 'High', 'Medium', 'Low'],
        message: '{VALUE} is not a valid criticality'
      },
      default: 'Medium'
    },
    securityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    assignedTeam: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    gatePolicy: {
      failOnCritical: {
        type: Boolean,
        default: true
      },
      maxHighAllowed: {
        type: Number,
        default: 5
      },
      maxMediumAllowed: {
        type: Number,
        default: 20
      },
      blockOnFailedGate: {
        type: Boolean,
        default: true
      }
    },
    autoResolveMissing: {
      type: Boolean,
      default: false
    },
    lastScanAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
projectSchema.index({ criticality: 1 });
projectSchema.index({ securityScore: 1 });

export const Project = mongoose.model('Project', projectSchema);
export default Project;
