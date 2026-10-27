import mongoose from 'mongoose';

const assessmentSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
      index: true
    },
    framework: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Framework',
      required: [true, 'Framework is required'],
      index: true
    },
    control: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Control',
      required: [true, 'Control is required'],
      index: true
    },
    status: {
      type: String,
      enum: ['Compliant', 'Non-Compliant', 'Partially Compliant', 'Not Applicable'],
      default: 'Non-Compliant',
      index: true
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    evidenceNotes: {
      type: String,
      default: ''
    },
    evidenceUrls: {
      type: [String],
      default: []
    },
    lastEvaluatedAt: {
      type: Date,
      default: Date.now
    },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    mappedVulnerabilities: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vulnerability'
      }
    ]
  },
  {
    timestamps: true
  }
);

// One assessment per control per project
assessmentSchema.index({ project: 1, control: 1 }, { unique: true });
assessmentSchema.index({ project: 1, framework: 1 });

export const Assessment = mongoose.model('Assessment', assessmentSchema);
export default Assessment;
