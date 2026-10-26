import mongoose from 'mongoose';
import { connectMongo } from '@itsm/common';
import { User } from './user.model.js';

const users = [
  { name: 'Admin', email: 'admin@itsm.local', role: 'admin', department: 'IT' },
  { name: 'Alex Agent', email: 'agent@itsm.local', role: 'agent', department: 'IT Operations' },
  { name: 'Ari Approver', email: 'approver@itsm.local', role: 'approver', department: 'Management' },
  { name: 'Riley Requester', email: 'user@itsm.local', role: 'requester', department: 'Finance' },
];

await connectMongo(process.env.MONGO_URI || 'mongodb://localhost:27022/itsm_auth', 'seed');
for (const u of users) {
  await User.updateOne(
    { email: u.email },
    { $setOnInsert: { ...u, passwordHash: await User.hash('Password123!') } },
    { upsert: true },
  );
}
console.log('Seeded users (password: Password123!):', users.map((u) => u.email).join(', '));
await mongoose.disconnect();
