import mongoose from 'mongoose';

const slaTimerSchema = new mongoose.Schema(
  {
    incidentId: { type: String, required: true, unique: true },
    number: String,
    priority: String,
    dueAt: { type: Date, required: true },
    state: { type: String, enum: ['running', 'met', 'breached'], default: 'running' },
  },
  { timestamps: true },
);
slaTimerSchema.index({ state: 1, dueAt: 1 });

const auditSchema = new mongoose.Schema(
  {
    topic: String,
    entityId: String,
    summary: String,
    payload: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

export const SlaTimer = mongoose.model('SlaTimer', slaTimerSchema);
export const AuditLog = mongoose.model('AuditLog', auditSchema);
