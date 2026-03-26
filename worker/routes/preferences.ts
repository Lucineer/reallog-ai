/**
 * User preferences endpoints.
 * @see docs/database/SCHEMA-DESIGN.md §1.7
 */
import { Hono } from 'hono';
import type { Env } from '../../src/types.js';

const preferences = new Hono<{ Bindings: Env }>();

preferences.get('/', async (c) => {
  // TODO: Get all preferences for current user
  return c.json({ preferences: {} });
});

preferences.get('/:key', async (c) => {
  const key = c.req.param('key');
  return c.json({ key, value: null });
});

preferences.put('/:key', async (c) => {
  // TODO: Set preference key-value pair
  const key = c.req.param('key');
  return c.json({ updated: key });
});

preferences.delete('/:key', async (c) => {
  const key = c.req.param('key');
  return c.json({ deleted: key });
});

export default preferences;
