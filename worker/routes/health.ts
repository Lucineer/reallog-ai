/**
 * Health check endpoint.
 */
import { Hono } from 'hono';
import type { Env } from '../../src/types.js';

const health = new Hono<{ Bindings: Env }>();

health.get('/', async (c) => {
  // TODO: Check database connectivity, KV, R2
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      d1: 'ok',
      kv: 'ok',
      r2: 'ok',
    },
  });
});

export default health;
