import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema(
  {
    number: { type: String, unique: true },
    title: { type: String, required: true, trim: true },
    description: String,
    type: {
      type: String,
      enum: ['access', 'software', 'hardware', 'certificate_renewal', 'other'],
      default: 'other',
    },
    requesterId: { type: String, required: true },
    status: { type: String, enum: ['pending_approval', 'approved', 'rejected', 'fulfilled'], default: 'pending_approval' },
    approverId: String,
    decisionComment: String,
    decidedAt: Date,
  },
  { timestamps: true },
);

requestSchema.pre('validate', function (next) {
  if (!this.number) this.number = `REQ${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 100)}`;
  next();
});

export const ServiceRequest = mongoose.model('ServiceRequest', requestSchema);
