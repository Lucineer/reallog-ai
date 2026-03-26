/**
 * Session management endpoints.
 * @see docs/database/SCHEMA-DESIGN.md §1.1
 */
import { Hono } from 'hono';
import type { Env } from '../../src/types.js';

const sessions = new Hono<{ Bindings: Env }>();

sessions.get('/', async (c) => {
  // TODO: List user's sessions, ordered by last_message_at
  return c.json({ sessions: [] });
});

sessions.post('/', async (c) => {
  // TODO: Create new session
  return c.json({ id: 'session-placeholder' });
});

sessions.get('/:id', async (c) => {
  // TODO: Get session details and paginated messages
  const id = c.req.param('id');
  return c.json({ id, messages: [] });
});

sessions.patch('/:id', async (c) => {
  // TODO: Update session title or metadata
  const id = c.req.param('id');
  return c.json({ updated: id });
});

sessions.delete('/:id', async (c) => {
  // TODO: Soft-delete session (status = 'deleted')
  const id = c.req.param('id');
  return c.json({ deleted: id });
});

export default sessions;
