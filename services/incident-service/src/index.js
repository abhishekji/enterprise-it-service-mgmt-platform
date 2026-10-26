import { z } from 'zod';
import {
  createApp, listen, connectMongo, initProducer, publish, startConsumer, TOPICS,
  authenticate, requireRole, asyncHandler, cached, invalidate,
} from '@itsm/common';
import { Incident, PRIORITIES, STATUSES } from './incident.model.js';

const NAME = 'incident-service';
const PORT = process.env.PORT || 4002;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27018/itsm_incident';

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  category: z.enum(['api_outage', 'access', 'database', 'certificate', 'network', 'other']).optional(),
  priority: z.enum(PRIORITIES).optional(),
});
const updateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().optional(),
  description: z.string().optional(),
});

const STATS_KEY = 'incident:stats';
const app = createApp(NAME);
app.use('/api/incidents', authenticate);

app.get('/api/incidents', asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.user.role === 'requester') filter.reporterId = req.user.sub;
  res.json(await Incident.find(filter).sort({ createdAt: -1 }).limit(200));
}));

app.get('/api/incidents/stats', requireRole('admin', 'agent'), asyncHandler(async (_req, res) => {
  res.json(await cached(STATS_KEY, 30, async () => {
    const rows = await Incident.aggregate([{ $group: { _id: { status: '$status', priority: '$priority' }, count: { $sum: 1 } } }]);
    const breached = await Incident.countDocuments({ slaBreached: true });
    return { breakdown: rows, slaBreached: breached };
  }));
}));

app.get('/api/incidents/:id', asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.id);
  if (!incident) return res.status(404).json({ message: 'Incident not found' });
  if (req.user.role === 'requester' && incident.reporterId !== req.user.sub) return res.status(403).json({ message: 'Forbidden' });
  res.json(incident);
}));

app.post('/api/incidents', asyncHandler(async (req, res) => {
  const body = createSchema.parse(req.body);
  const incident = await Incident.create({ ...body, reporterId: req.user.sub });
  await invalidate(STATS_KEY);
  await publish(TOPICS.INCIDENT_CREATED, incident.toObject(), incident.id);
  res.status(201).json(incident);
}));

app.patch('/api/incidents/:id', requireRole('admin', 'agent'), asyncHandler(async (req, res) => {
  const patch = updateSchema.parse(req.body);
  if (patch.status === 'resolved') patch.resolvedAt = new Date();
  const incident = await Incident.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
  if (!incident) return res.status(404).json({ message: 'Incident not found' });
  await invalidate(STATS_KEY);
  await publish(TOPICS.INCIDENT_UPDATED, incident.toObject(), incident.id);
  res.json(incident);
}));

await connectMongo(MONGO_URI, NAME);
await initProducer(NAME);
await startConsumer(NAME, 'incident-service', {
  [TOPICS.INCIDENT_SLA_BREACHED]: async ({ incidentId }) => {
    await Incident.findByIdAndUpdate(incidentId, { slaBreached: true });
    await invalidate(STATS_KEY);
  },
});
listen(app, NAME, PORT);
