import Redis from 'ioredis';

let client;

export function getRedis() {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
    });
    client.on('error', (err) => console.error('[redis]', err.message));
  }
  return client;
}

// Cache-aside helper: returns cached JSON or loads and stores it.
export async function cached(key, ttlSeconds, loader) {
  const redis = getRedis();
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit);
  } catch (e) {
    console.error('[redis] cache read failed', e.message);
  }
  const value = await loader();
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (e) {
    console.error('[redis] cache write failed', e.message);
  }
  return value;
}

export async function invalidate(...keys) {
  if (keys.length) await getRedis().del(...keys).catch(() => {});
}
