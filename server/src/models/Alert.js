import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low', 'Info'],
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: [
        'Pipeline Gate Failure',
        'Critical Finding',
        'SLA Breach',
        'Compliance Drop',
        'Account Security',
        'System'
      ],
      required: true,
      index: true
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true
    },
    vulnerability: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vulnerability',
      default: null
    },
    pipelineRun: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PipelineRun',
      default: null
    },
    isAcknowledged: {
      type: Boolean,
      default: false,
      index: true
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    acknowledgedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const Alert = mongoose.model('Alert', alertSchema);
export default Alert;
