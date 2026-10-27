import mongoose from 'mongoose';

const stageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    tool: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['Passed', 'Failed', 'Warning', 'Skipped'],
      default: 'Passed'
    },
    findingsCount: {
      type: Number,
      default: 0
    },
    durationMs: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const pipelineRunSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
      index: true
    },
    provider: {
      type: String,
      default: 'github-actions'
    },
    runId: {
      type: String,
      required: [true, 'CI run ID is required'],
      index: true
    },
    runUrl: {
      type: String,
      default: ''
    },
    branch: {
      type: String,
      default: 'main',
      index: true
    },
    commit: {
      type: String,
      default: '',
      trim: true
    },
    triggeredBy: {
      type: String,
      default: 'system'
    },
    status: {
      type: String,
      enum: ['Passed', 'Failed', 'Warning'],
      required: true,
      index: true
    },
    gateSummary: {
      passed: {
        type: Boolean,
        required: true
      },
      reason: {
        type: String,
        default: ''
      },
      failedConditions: {
        type: [String],
        default: []
      }
    },
    counts: {
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
      info: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    stages: [stageSchema],
    durationSeconds: {
      type: Number,
      default: 0
    },
    completedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

pipelineRunSchema.index({ project: 1, createdAt: -1 });

export const PipelineRun = mongoose.model('PipelineRun', pipelineRunSchema);
export default PipelineRun;
