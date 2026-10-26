import mongoose from 'mongoose';

export const PRIORITIES = ['P1', 'P2', 'P3', 'P4'];
export const STATUSES = ['new', 'in_progress', 'on_hold', 'resolved', 'closed'];

const incidentSchema = new mongoose.Schema(
  {
    number: { type: String, unique: true },
    title: { type: String, required: true, trim: true },
    description: String,
    category: {
      type: String,
      enum: ['api_outage', 'access', 'database', 'certificate', 'network', 'other'],
      default: 'other',
    },
    priority: { type: String, enum: PRIORITIES, default: 'P3' },
    status: { type: String, enum: STATUSES, default: 'new' },
    reporterId: { type: String, required: true },
    assigneeId: String,
    slaDueAt: Date,
    slaBreached: { type: Boolean, default: false },
    resolvedAt: Date,
  },
  { timestamps: true },
);

incidentSchema.index({ status: 1, priority: 1 });

incidentSchema.pre('validate', function (next) {
  if (!this.number) this.number = `INC${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 100)}`;
  next();
});

export const Incident = mongoose.model('Incident', incidentSchema);
