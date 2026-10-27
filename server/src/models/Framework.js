import mongoose from 'mongoose';

const frameworkSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Framework name is required'],
      unique: true,
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Framework code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    version: {
      type: String,
      default: '1.0'
    },
    description: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      default: 'Application Security'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for controls count
frameworkSchema.virtual('controlsCount', {
  ref: 'Control',
  localField: '_id',
  foreignField: 'framework',
  count: true
});

export const Framework = mongoose.model('Framework', frameworkSchema);
export default Framework;
