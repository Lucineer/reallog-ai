# reallog-ai

You write a journal. This tool reads it, looking for subtle, factual patterns in your own words over time. It is a self-hosted, private assistant for your thoughts.

[Live instance](https://reallog-ai.casey-digennaro.workers.dev)

## Why This Exists

Many journal apps store your data or only play it back. This one acts as a quiet reader. It processes your entries to point out recurring topics, timing, and connections you might have missed, based solely on the text you provide.

## Quick Start

1.  **Fork** this repository.
2.  **Deploy** it to Cloudflare Workers:
    ```bash
    npx wrangler deploy
    ```
3.  Set your `DEEPSEEK_API_KEY` (or key for another compatible LLM provider) as a Cloudflare secret.

The application is now yours. You own the code and the data.

## What It Does

*   **Pattern Recognition:** It identifies mentions of specific people, topics, or emotions and notes their frequency and context (e.g., "mentioned 'procrastination' three times, each following a log about late work").
*   **Private Analysis:** Your journal entries are stored as plain text in your own Cloudflare KV storage and are only processed when you actively use the site.
*   **Self-Hosted:** You control the API keys, logic, and data. You can export all entries at any time.
*   **Adaptable:** You can modify the analysis prompts and logic in the source code to focus on what matters to you.

## One Specific Limitation

Pattern recognition is most effective after you have accumulated at least 10-15 entries. With fewer entries, the connections it can surface will be limited.

## Technical Notes

*   Built for Cloudflare Workers. Zero npm dependencies.
*   Uses a simple vector similarity search for topic matching.
*   Compatible with any LLM API that follows the OpenAI format (e.g., DeepSeek, OpenAI, Anthropic).
*   MIT Licensed.

<div style="text-align:center;padding:16px;color:#64748b;font-size:.8rem"><a href="https://the-fleet.casey-digennaro.workers.dev" style="color:#64748b">The Fleet</a> &middot; <a href="https://cocapn.ai" style="color:#64748b">Cocapn</a></div>