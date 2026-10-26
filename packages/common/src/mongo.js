import mongoose from 'mongoose';

export async function connectMongo(uri, name) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log(`[${name}] MongoDB connected: ${mongoose.connection.name}`);
}
