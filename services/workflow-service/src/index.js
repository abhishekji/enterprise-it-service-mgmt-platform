import {
  createApp, listen, connectMongo, initProducer, publish, startConsumer, TOPICS,
  authenticate, requireRole, asyncHandler,
} from '@itsm/common';
import { SlaTimer, AuditLog } from './models.js';

const NAME = 'workflow-service';
const PORT = process.env.PORT || 4005;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27021/itsm_workflow';
const SLA_CHECK_MS = Number(process.env.SLA_CHECK_INTERVAL_MS || 30000);

// Resolution targets in hours per priority.
const SLA_HOURS = { P1: 1, P2: 4, P3: 8, P4: 24 };

const audit = (topic, entityId, summary, payload) => AuditLog.create({ topic, entityId, summary, payload });

const app = createApp(NAME);
app.use('/api/workflows', authenticate, requireRole('admin', 'agent'));

app.get('/api/workflows/sla', asyncHandler(async (req, res) => {
  const filter = req.query.state ? { state: req.query.state } : {};
  res.json(await SlaTimer.find(filter).sort({ dueAt: 1 }).limit(200));
}));

app.get('/api/workflows/audit', asyncHandler(async (_req, res) => {
  res.json(await AuditLog.find().sort({ createdAt: -1 }).limit(200).select('-payload'));
}));

async function checkSlaBreaches() {
  const overdue = await SlaTimer.find({ state: 'running', dueAt: { $lte: new Date() } });
  for (const timer of overdue) {
    const updated = await SlaTimer.findOneAndUpdate({ _id: timer._id, state: 'running' }, { state: 'breached' });
    if (!updated) continue;
    await publish(TOPICS.INCIDENT_SLA_BREACHED, { incidentId: timer.incidentId, number: timer.number, priority: timer.priority }, timer.incidentId);
    await audit(TOPICS.INCIDENT_SLA_BREACHED, timer.incidentId, `SLA breached for ${timer.number}`);
  }
}

await connectMongo(MONGO_URI, NAME);
await initProducer(NAME);
await startConsumer(NAME, 'workflow-service', {
  [TOPICS.INCIDENT_CREATED]: async (incident) => {
    const hours = SLA_HOURS[incident.priority] ?? SLA_HOURS.P3;
    const dueAt = new Date(new Date(incident.createdAt).getTime() + hours * 3600000);
    await SlaTimer.updateOne(
      { incidentId: String(incident._id) },
      { $setOnInsert: { number: incident.number, priority: incident.priority, dueAt } },
      { upsert: true },
    );
    await audit(TOPICS.INCIDENT_CREATED, String(incident._id), `SLA timer started for ${incident.number}`);
  },
  [TOPICS.INCIDENT_UPDATED]: async (incident) => {
    if (['resolved', 'closed'].includes(incident.status)) {
      await SlaTimer.updateOne({ incidentId: String(incident._id), state: 'running' }, { state: 'met' });
    }
  },
  [TOPICS.REQUEST_CREATED]: async (r) => audit(TOPICS.REQUEST_CREATED, String(r._id), `Approval pending for ${r.number}`),
  [TOPICS.REQUEST_DECISION]: async (r) => audit(TOPICS.REQUEST_DECISION, String(r._id), `${r.number} ${r.status}`),
  [TOPICS.ASSET_UPDATED]: async ({ action, asset }) => audit(TOPICS.ASSET_UPDATED, String(asset._id), `Asset ${asset.name} ${action}`),
});

setInterval(() => checkSlaBreaches().catch((e) => console.error('[sla] check failed', e.message)), SLA_CHECK_MS);
listen(app, NAME, PORT);
