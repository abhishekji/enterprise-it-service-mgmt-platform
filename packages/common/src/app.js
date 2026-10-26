import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';

export function createApp(name, { json = true } = {}) {
  const app = express();
  const origins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
  app.use(helmet());
  app.use(cors({ origin: origins.length ? origins : true }));
  app.use(morgan('tiny'));
  if (json) app.use(express.json({ limit: '1mb' }));
  app.get('/health', (_req, res) =>
    res.json({ service: name, status: 'ok', mongo: mongoose.connection.readyState === 1 }),
  );
  return app;
}

export function errorHandler(err, _req, res, _next) {
  console.error(err);
  if (err.name === 'ZodError') return res.status(400).json({ message: 'Validation failed', issues: err.issues });
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
  if (err.code === 11000) return res.status(409).json({ message: 'Duplicate key', keys: err.keyValue });
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function listen(app, name, port) {
  app.use((_req, res) => res.status(404).json({ message: 'Not found' }));
  app.use(errorHandler);
  app.listen(port, () => console.log(`[${name}] listening on :${port}`));
}
