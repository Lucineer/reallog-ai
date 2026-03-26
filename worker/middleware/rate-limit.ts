/**
 * Token bucket rate limiter middleware.
 */
import { createMiddleware } from 'hono/factory';
import type { Env } from '../../src/types.js';

export const rateLimitMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  // TODO: Implement token bucket rate limiting using KV
  // - Key: user_id or IP
  // - Refill rate: X tokens per minute
  // - Return 429 if bucket empty
  await next();
});
