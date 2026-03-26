/**
 * Provider CRUD endpoints.
 * @see docs/database/SCHEMA-DESIGN.md §1.8
 */
import { Hono } from 'hono';
import type { Env } from '../../src/types.js';

const providers = new Hono<{ Bindings: Env }>();

providers.get('/', async (c) => {
  // TODO: List all providers (admin) or user's providers
  return c.json({ providers: [] });
});

providers.post('/', async (c) => {
  // TODO: Create new provider (encrypt API key)
  return c.json({ id: 'provider-placeholder' });
});

providers.get('/:id', async (c) => {
  const id = c.req.param('id');
  return c.json({ id });
});

providers.patch('/:id', async (c) => {
  // TODO: Update provider config
  const id = c.req.param('id');
  return c.json({ updated: id });
});

providers.delete('/:id', async (c) => {
  // TODO: Soft-delete provider (is_active = false)
  const id = c.req.param('id');
  return c.json({ deleted: id });
});

providers.get('/:id/health', async (c) => {
  // TODO: Return provider health metrics
  const id = c.req.param('id');
  return c.json({ id, health: { healthy: true, latencyMs: 0 } });
});

export default providers;
