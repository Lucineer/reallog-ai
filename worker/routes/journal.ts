/**
 * Journal API routes — /journal, /mood, /insights, /gratitude
 */
import { Hono } from 'hono';
import type { Env, Variables } from '../../src/types.js';
import {
  createEntry, getEntry, listEntries, updateEntry, deleteEntry,
  getMoodHistory, getMoodAverage, findPatterns, getGratitudeLog,
  getGratitudeStats, generateYearInReview,
} from '../../src/journal/analyzer.js';
import {
  computeLifeMetrics, detectAnomalies,
  getPrivacySettings, savePrivacySettings,
} from '../../src/journal/insights.js';

const journalRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Journal CRUD ────────────────────────────────────────────────────────

// List entries
journalRoutes.get('/journal', async (c) => {
  const userId = c.get('userId');
  const from = c.req.query('from');
  const to = c.req.query('to');
  const limit = parseInt(c.req.query('limit') || '30');
  const offset = parseInt(c.req.query('offset') || '0');
  const entries = await listEntries(c.env.DB, userId, { limit, offset, from, to });
  return c.json({ entries });
});

// Create entry
journalRoutes.post('/journal', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const entry = await createEntry(c.env.DB, {
    userId,
    date: body.date,
    title: body.title,
    body: body.body,
    mood: body.mood,
    tags: body.tags || [],
    gratitude: body.gratitude || [],
  });
  return c.json(entry, 201);
});

// Get single entry
journalRoutes.get('/journal/:id', async (c) => {
  const userId = c.get('userId');
  const entry = await getEntry(c.env.DB, c.req.param('id'), userId);
  if (!entry) return c.json({ error: 'Entry not found' }, 404);
  return c.json(entry);
});

// Update entry
journalRoutes.put('/journal/:id', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const ok = await updateEntry(c.env.DB, c.req.param('id'), userId, body);
  if (!ok) return c.json({ error: 'Entry not found or no changes' }, 404);
  return c.json({ ok: true });
});

// Delete entry
journalRoutes.delete('/journal/:id', async (c) => {
  const userId = c.get('userId');
  const ok = await deleteEntry(c.env.DB, c.req.param('id'), userId);
  if (!ok) return c.json({ error: 'Entry not found' }, 404);
  return c.json({ ok: true });
});

// Year in review
journalRoutes.get('/journal/year-in-review', async (c) => {
  const userId = c.get('userId');
  const year = parseInt(c.req.query('year') || String(new Date().getFullYear()));
  const data = await generateYearInReview(c.env.DB, userId, year);
  return c.json(data);
});

// ─── Mood ────────────────────────────────────────────────────────────────

journalRoutes.get('/mood', async (c) => {
  const userId = c.get('userId');
  const days = parseInt(c.req.query('days') || '30');
  const [history, avgData] = await Promise.all([
    getMoodHistory(c.env.DB, userId, days),
    getMoodAverage(c.env.DB, userId),
  ]);
  return c.json({ history, avg: avgData.avg, count: avgData.count });
});

// ─── Insights ────────────────────────────────────────────────────────────

journalRoutes.get('/insights/metrics', async (c) => {
  const userId = c.get('userId');
  const metrics = await computeLifeMetrics(c.env.DB, userId);
  return c.json(metrics);
});

journalRoutes.get('/insights/patterns', async (c) => {
  const userId = c.get('userId');
  const patterns = await findPatterns(c.env.DB, userId);
  return c.json({ patterns });
});

journalRoutes.get('/insights/anomalies', async (c) => {
  const userId = c.get('userId');
  const anomalies = await detectAnomalies(c.env.DB, userId);
  return c.json({ anomalies });
});

journalRoutes.get('/insights/privacy', async (c) => {
  const userId = c.get('userId');
  const settings = await getPrivacySettings(c.env.DB, userId);
  return c.json(settings);
});

journalRoutes.put('/insights/privacy', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  await savePrivacySettings(c.env.DB, userId, body);
  return c.json({ ok: true });
});

// ─── Gratitude ───────────────────────────────────────────────────────────

journalRoutes.get('/gratitude', async (c) => {
  const userId = c.get('userId');
  const log = await getGratitudeLog(c.env.DB, userId);
  return c.json({ log });
});

journalRoutes.get('/gratitude/stats', async (c) => {
  const userId = c.get('userId');
  const stats = await getGratitudeStats(c.env.DB, userId);
  return c.json(stats);
});

export default journalRoutes;
