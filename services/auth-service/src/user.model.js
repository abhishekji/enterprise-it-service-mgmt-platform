import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '@itsm/common';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'requester' },
    department: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};
userSchema.statics.hash = (password) => bcrypt.hash(password, 10);
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
