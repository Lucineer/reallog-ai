/**
 * Cloudflare Worker entry point (Hono app).
 * Serves web UI and API routes.
 * @see docs/api/API-DESIGN.md
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/cloudflare-workers';

import type { Env } from '../src/types.js';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Static assets (web UI)
app.get('*', serveStatic({ root: './web/dist' }));

// API routes
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// TODO: Mount route modules
// app.route('/v1/auth', authRoutes);
// app.route('/v1/chat', chatRoutes);
// app.route('/v1/sessions', sessionsRoutes);
// app.route('/v1/providers', providersRoutes);
// app.route('/v1/preferences', preferencesRoutes);
// app.route('/v1/metrics', metricsRoutes);

export default app;
