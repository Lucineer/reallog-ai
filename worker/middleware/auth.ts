/**
 * JWT validation middleware.
 */
import { createMiddleware } from 'hono/factory';
import type { Env } from '../../src/types.js';

export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  // TODO: Extract JWT from Authorization header
  // TODO: Validate JWT signature using env.JWT_SECRET
  // TODO: Set user_id in context
  await next();
});
