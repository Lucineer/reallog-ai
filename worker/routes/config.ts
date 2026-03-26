/**
 * Runtime configuration endpoint.
 */
import { Hono } from 'hono';
import type { Env } from '../../src/types.js';

const config = new Hono<{ Bindings: Env }>();

config.get('/', async (c) => {
  // TODO: Return runtime config (feature flags, limits, etc.)
  return c.json({
    environment: c.env.ENVIRONMENT,
    maxTokensPerRequest: 4096,
    supportedModels: ['deepseek-chat', 'deepseek-reasoner'],
    draftProfiles: [],
  });
});

export default config;
