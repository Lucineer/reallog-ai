/**
 * Chat completions endpoint (OpenAI-compatible).
 * @see docs/api/API-DESIGN.md
 */
import { Hono } from 'hono';
import type { Env } from '../../src/types.js';

const chat = new Hono<{ Bindings: Env }>();

chat.post('/completions', async (c) => {
  // TODO: Implement OpenAI-compatible /v1/chat/completions
  // - Authenticate via JWT
  // - Classify intent (Router)
  // - Detect/replace PII (PIIEngine)
  // - Route to provider (Provider selection)
  // - Store interaction and message
  // - Return response
  return c.json({
    id: 'chatcmpl-placeholder',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'gpt-4',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: 'Hello from log-origin!' },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });
});

export default chat;
