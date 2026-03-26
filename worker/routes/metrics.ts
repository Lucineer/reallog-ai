/**
 * Usage metrics endpoint.
 */
import { Hono } from 'hono';
import type { Env } from '../../src/types.js';

const metrics = new Hono<{ Bindings: Env }>();

metrics.get('/', async (c) => {
  // TODO: Return usage metrics (tokens, cost, requests) for current user
  return c.json({
    totalTokens: 0,
    totalCost: 0,
    requestCount: 0,
    byProvider: {},
    byModel: {},
  });
});

export default metrics;
