import mongoose from 'mongoose';

const timelineEntrySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true
    },
    notes: {
      type: String,
      default: ''
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    performedByName: {
      type: String,
      default: ''
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const incidentSchema = new mongoose.Schema(
  {
    incidentId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    severity: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'High',
      index: true
    },
    status: {
      type: String,
      enum: ['Detected', 'Triaged', 'Contained', 'Resolved', 'Post-mortem'],
      default: 'Detected',
      index: true
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    relatedVulnerabilities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vulnerability'
      }
    ],
    timeline: [timelineEntrySchema],
    postMortem: {
      rootCause: { type: String, default: '' },
      impactSummary: { type: String, default: '' },
      preventativeActions: { type: String, default: '' },
      completedAt: { type: Date, default: null }
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

incidentSchema.index({ project: 1, status: 1 });
incidentSchema.index({ severity: 1, status: 1 });

export const Incident = mongoose.model('Incident', incidentSchema);
export default Incident;
