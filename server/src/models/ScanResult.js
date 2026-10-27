import mongoose from 'mongoose';

const scanResultSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    pipelineRun: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PipelineRun',
      default: null
    },
    tool: {
      type: String,
      required: true,
      index: true
    },
    scanType: {
      type: String,
      required: true
    },
    rawReportSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    findingsCount: {
      type: Number,
      default: 0
    },
    newFindings: {
      type: Number,
      default: 0
    },
    updatedFindings: {
      type: Number,
      default: 0
    },
    reopenedFindings: {
      type: Number,
      default: 0
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    ingestionMethod: {
      type: String,
      enum: ['webhook', 'manual'],
      default: 'webhook'
    }
  },
  {
    timestamps: true
  }
);

export const ScanResult = mongoose.model('ScanResult', scanResultSchema);
export default ScanResult;
