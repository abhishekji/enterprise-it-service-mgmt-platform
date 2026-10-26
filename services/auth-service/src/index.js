import { z } from 'zod';
import {
  createApp, listen, connectMongo, initProducer, publish, TOPICS,
  authenticate, requireRole, signToken, asyncHandler, ROLES,
} from '@itsm/common';
import { User } from './user.model.js';

const NAME = 'auth-service';
const PORT = process.env.PORT || 4001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27022/itsm_auth';

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  department: z.string().optional(),
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

const app = createApp(NAME);

// Public self-registration always creates a "requester"; elevated roles are assigned by admins.
app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const body = registerSchema.parse(req.body);
  const user = await User.create({
    name: body.name,
    email: body.email,
    department: body.department,
    passwordHash: await User.hash(body.password),
    role: 'requester',
  });
  await publish(TOPICS.USER_REGISTERED, { id: user.id, email: user.email, name: user.name }, user.id).catch(() => {});
  res.status(201).json({ user, token: signToken(user) });
}));

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email, active: true }).select('+passwordHash');
  if (!user || !(await user.verifyPassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  res.json({ user, token: signToken(user) });
}));

app.get('/api/auth/me', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
}));

app.get('/api/users', authenticate, requireRole('admin', 'agent'), asyncHandler(async (_req, res) => {
  res.json(await User.find().sort({ name: 1 }));
}));

app.patch('/api/users/:id/role', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const { role } = z.object({ role: z.enum(ROLES) }).parse(req.body);
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
}));

await connectMongo(MONGO_URI, NAME);
await initProducer(NAME);
listen(app, NAME, PORT);
