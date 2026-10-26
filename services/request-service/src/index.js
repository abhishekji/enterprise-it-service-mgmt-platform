import { z } from 'zod';
import {
  createApp, listen, connectMongo, initProducer, publish, TOPICS,
  authenticate, requireRole, asyncHandler,
} from '@itsm/common';
import { ServiceRequest } from './request.model.js';

const NAME = 'request-service';
const PORT = process.env.PORT || 4003;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27019/itsm_request';

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  type: z.enum(['access', 'software', 'hardware', 'certificate_renewal', 'other']).optional(),
});
const decisionSchema = z.object({ decision: z.enum(['approved', 'rejected']), comment: z.string().optional() });

const app = createApp(NAME);
app.use('/api/requests', authenticate);

app.get('/api/requests', asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.user.role === 'requester') filter.requesterId = req.user.sub;
  res.json(await ServiceRequest.find(filter).sort({ createdAt: -1 }).limit(200));
}));

app.post('/api/requests', asyncHandler(async (req, res) => {
  const body = createSchema.parse(req.body);
  const request = await ServiceRequest.create({ ...body, requesterId: req.user.sub });
  await publish(TOPICS.REQUEST_CREATED, request.toObject(), request.id);
  res.status(201).json(request);
}));

app.post('/api/requests/:id/decision', requireRole('admin', 'approver'), asyncHandler(async (req, res) => {
  const { decision, comment } = decisionSchema.parse(req.body);
  const request = await ServiceRequest.findOneAndUpdate(
    { _id: req.params.id, status: 'pending_approval' },
    { status: decision, approverId: req.user.sub, decisionComment: comment, decidedAt: new Date() },
    { new: true },
  );
  if (!request) return res.status(409).json({ message: 'Request not found or already decided' });
  await publish(TOPICS.REQUEST_DECISION, request.toObject(), request.id);
  res.json(request);
}));

app.post('/api/requests/:id/fulfill', requireRole('admin', 'agent'), asyncHandler(async (req, res) => {
  const request = await ServiceRequest.findOneAndUpdate(
    { _id: req.params.id, status: 'approved' },
    { status: 'fulfilled' },
    { new: true },
  );
  if (!request) return res.status(409).json({ message: 'Only approved requests can be fulfilled' });
  res.json(request);
}));

await connectMongo(MONGO_URI, NAME);
await initProducer(NAME);
listen(app, NAME, PORT);
