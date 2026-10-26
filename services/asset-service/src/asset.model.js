import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['server', 'database', 'application', 'laptop', 'network_device', 'ssl_certificate'],
      required: true,
    },
    serialOrId: { type: String, unique: true, sparse: true },
    ownerId: String,
    status: { type: String, enum: ['active', 'maintenance', 'retired'], default: 'active' },
    environment: { type: String, enum: ['production', 'staging', 'development'], default: 'production' },
    expiresAt: Date,
  },
  { timestamps: true },
);

assetSchema.index({ expiresAt: 1 });

export const Asset = mongoose.model('Asset', assetSchema);
