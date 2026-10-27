import mongoose from 'mongoose';

const controlSchema = new mongoose.Schema(
  {
    framework: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Framework',
      required: [true, 'Framework reference is required'],
      index: true
    },
    controlId: {
      type: String,
      required: [true, 'Control ID is required'],
      trim: true
    },
    title: {
      type: String,
      required: [true, 'Control title is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    domain: {
      type: String,
      default: 'General Security'
    },
    mappedCwEs: {
      type: [String],
      default: []
    },
    severityWeight: {
      type: Number,
      default: 1,
      min: 1,
      max: 5
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index per framework
controlSchema.index({ framework: 1, controlId: 1 }, { unique: true });

export const Control = mongoose.model('Control', controlSchema);
export default Control;
