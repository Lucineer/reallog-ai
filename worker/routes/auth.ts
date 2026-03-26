/**
 * Authentication routes (login/logout, JWT issuance).
 * @see docs/api/API-DESIGN.md
 */
import { Hono } from 'hono';
import type { Env } from '../../src/types.js';

const auth = new Hono<{ Bindings: Env }>();

auth.post('/login', async (c) => {
  // TODO: Implement passphrase-based authentication
  // - Derive master key from passphrase
  // - Verify HMAC verifier
  // - Issue JWT
  return c.json({ token: 'jwt-placeholder' });
});

auth.post('/logout', (c) => {
  // TODO: Invalidate JWT (stateless JWT means client-side deletion)
  return c.json({ message: 'Logged out' });
});

auth.post('/register', async (c) => {
  // TODO: Create new tenant with PBKDF2 salt and verifier
  return c.json({ userId: 'user-placeholder' });
});

export default auth;
