/**
 * Draft comparison endpoints.
 * @see docs/routing/INTELLIGENCE-DESIGN.md §6
 */
import { Hono } from 'hono';
import type { Env } from '../../src/types.js';

const drafts = new Hono<{ Bindings: Env }>();

drafts.post('/compare', async (c) => {
  // TODO: Run multiple providers in parallel (draft round)
  // - Fetch enabled draft profiles
  // - Call each provider concurrently
  // - Collect responses with timeouts
  // - Store draft results
  // - Return all responses for user selection
  return c.json({ drafts: [] });
});

drafts.post('/winner/:draftId', async (c) => {
  // TODO: Record user's winner selection
  // - Update draft_results.winner = 1
  // - Potentially create learned routing rule
  const draftId = c.req.param('draftId');
  return c.json({ updated: draftId });
});

export default drafts;
