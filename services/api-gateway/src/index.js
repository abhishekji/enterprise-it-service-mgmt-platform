import { createApp, listen, getRedis } from '@itsm/common';
import { createProxyMiddleware } from 'http-proxy-middleware';

const PORT = process.env.PORT || 4000;
const routes = {
  '/api/auth': process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
  '/api/users': process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
  '/api/incidents': process.env.INCIDENT_SERVICE_URL || 'http://localhost:4002',
  '/api/requests': process.env.REQUEST_SERVICE_URL || 'http://localhost:4003',
  '/api/assets': process.env.ASSET_SERVICE_URL || 'http://localhost:4004',
  '/api/workflows': process.env.WORKFLOW_SERVICE_URL || 'http://localhost:4005',
};

// The gateway proxies raw bodies, so JSON parsing is disabled here.
const app = createApp('api-gateway', { json: false });

// Fixed-window rate limit per IP, backed by Redis. Fails open if Redis is down.
const LIMIT = Number(process.env.RATE_LIMIT_PER_MIN || 300);
app.use('/api', async (req, res, next) => {
  try {
    const key = `rl:${req.ip}:${Math.floor(Date.now() / 60000)}`;
    const redis = getRedis();
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 60);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, LIMIT - count));
    if (count > LIMIT) return res.status(429).json({ message: 'Too many requests' });
  } catch (e) {
    console.error('[gateway] rate limiter unavailable:', e.message);
  }
  next();
});

for (const [prefix, target] of Object.entries(routes)) {
  app.use(createProxyMiddleware({ target, changeOrigin: true, pathFilter: prefix }));
}

listen(app, 'api-gateway', PORT);
