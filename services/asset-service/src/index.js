import { z } from 'zod';
import {
  createApp, listen, connectMongo, initProducer, publish, TOPICS,
  authenticate, requireRole, asyncHandler, cached, invalidate,
} from '@itsm/common';
import { Asset } from './asset.model.js';

const NAME = 'asset-service';
const PORT = process.env.PORT || 4004;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27020/itsm_asset';
const EXPIRY_WINDOW_DAYS = Number(process.env.EXPIRY_WINDOW_DAYS || 30);
const EXPIRING_KEY = 'asset:expiring';

const assetSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['server', 'database', 'application', 'laptop', 'network_device', 'ssl_certificate']),
  serialOrId: z.string().optional(),
  ownerId: z.string().optional(),
  status: z.enum(['active', 'maintenance', 'retired']).optional(),
  environment: z.enum(['production', 'staging', 'development']).optional(),
  expiresAt: z.coerce.date().optional(),
});

const app = createApp(NAME);
app.use('/api/assets', authenticate);

app.get('/api/assets', asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;
  res.json(await Asset.find(filter).sort({ name: 1 }).limit(500));
}));

// Assets (e.g. SSL certificates) expiring within the configured window.
app.get('/api/assets/expiring', asyncHandler(async (_req, res) => {
  res.json(await cached(EXPIRING_KEY, 300, () => findExpiring()));
}));

app.post('/api/assets', requireRole('admin', 'agent'), asyncHandler(async (req, res) => {
  const asset = await Asset.create(assetSchema.parse(req.body));
  await invalidate(EXPIRING_KEY);
  await publish(TOPICS.ASSET_UPDATED, { action: 'created', asset: asset.toObject() }, asset.id);
  res.status(201).json(asset);
}));

app.patch('/api/assets/:id', requireRole('admin', 'agent'), asyncHandler(async (req, res) => {
  const asset = await Asset.findByIdAndUpdate(req.params.id, assetSchema.partial().parse(req.body), { new: true });
  if (!asset) return res.status(404).json({ message: 'Asset not found' });
  await invalidate(EXPIRING_KEY);
  await publish(TOPICS.ASSET_UPDATED, { action: 'updated', asset: asset.toObject() }, asset.id);
  res.json(asset);
}));

app.delete('/api/assets/:id', requireRole('admin'), asyncHandler(async (req, res) => {
  const asset = await Asset.findByIdAndDelete(req.params.id);
  if (!asset) return res.status(404).json({ message: 'Asset not found' });
  await invalidate(EXPIRING_KEY);
  res.status(204).end();
}));

function findExpiring() {
  const until = new Date(Date.now() + EXPIRY_WINDOW_DAYS * 86400000);
  return Asset.find({ expiresAt: { $lte: until }, status: { $ne: 'retired' } }).sort({ expiresAt: 1 });
}

await connectMongo(MONGO_URI, NAME);
await initProducer(NAME);
listen(app, NAME, PORT);
