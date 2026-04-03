import { loadBYOKConfig, saveBYOKConfig, callLLM, generateSetupHTML } from './lib/byok.js';

const BRAND = '#dc2626';
const NAME = 'RealLog.ai';
const TAGLINE = 'Organize Your Content Universe';

const FEATURES = [
  { icon: '🎬', title: 'Video Organization', desc: 'Auto-tag, transcribe, and organize video libraries with AI' },
  { icon: '📝', title: 'Story Pipeline', desc: 'From tip to published — manage your entire editorial workflow' },
  { icon: '🔍', title: 'Research Board', desc: 'Collect, clip, and synthesize research from across the web' },
  { icon: '🤖', title: 'Repo-Agent Content Manager', desc: 'Autonomous agents that manage your media pipeline 24/7' },
  { icon: '🔑', title: 'Multi-Provider BYOK', desc: 'Bring OpenAI, Anthropic, DeepSeek, or any OpenAI-compatible provider' },
];

const SEED_DATA = {
  journalism: {
    frameworks: ['Inverted Pyramid', 'Narrative Arc', 'Five Ws + H', 'AP Style', 'Investigative Series'],
    contentTypes: ['Breaking News', 'Feature Story', 'Op-Ed', 'Analysis', 'Investigative', 'Review', 'Interview'],
    editorialPipeline: ['Tip → Verify → Research → Draft → Edit → Publish → Distribute'],
    mediaFormats: ['Text', 'Video', 'Audio/Podcast', 'Photo Essay', 'Interactive', 'Data Visualization'],
    sourcingPrinciples: ['Primary Sources First', 'Cross-Reference', 'On-Record Preference', 'Fact-Check Chain'],
  },
};

const FLEET = { name: NAME, tier: 2, domain: 'journalism-content', fleetVersion: '2.0.0', builtBy: 'Superinstance & Lucineer (DiGennaro et al.)' };

function landingHTML(): string {
  const featureCards = FEATURES.map(f =>
    `<div class="feature"><div class="feat-icon">${f.icon}</div><div class="feat-title">${f.title}</div><div class="feat-desc">${f.desc}</div></div>`
  ).join('');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${NAME} — ${TAGLINE}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0a1a;color:#e0e0e0;font-family:'Inter',system-ui,sans-serif}
.hero{text-align:center;padding:4rem 1rem 2rem;max-width:800px;margin:0 auto}
.hero h1{font-size:2.5rem;color:${BRAND};margin-bottom:.5rem}.hero p{color:#888;font-size:1.1rem}
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;max-width:800px;margin:2rem auto;padding:0 1rem}
.feature{background:#1a1a2e;border-radius:12px;padding:1.5rem;border:1px solid #222}
.feat-icon{font-size:2rem;margin-bottom:.5rem}.feat-title{font-weight:700;margin-bottom:.25rem}.feat-desc{color:#888;font-size:.85rem}
.cta{text-align:center;padding:2rem 1rem 4rem}.cta a{background:${BRAND};color:#fff;text-decoration:none;padding:.75rem 2rem;border-radius:8px;font-weight:700}
</style></head><body><div class="hero"><h1>📰 ${NAME}</h1><p>${TAGLINE}</p></div>
<div class="features">${featureCards}</div><div class="cta"><a href="/setup">Get Started</a></div></body></html>`;
}

const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*;";

function confidenceScore(context: string): number {
  const cues = ['verified', 'source', 'confirmed', 'official', 'reported', 'evidence', 'documented'];
  const hits = cues.filter(c => context.toLowerCase().includes(c)).length;
  return Math.min(0.5 + hits * 0.1, 1.0);
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const headers = { 'Content-Type': 'text/html;charset=utf-8', 'Content-Security-Policy': CSP };
    const jsonHeaders = { 'Content-Type': 'application/json' };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } });
    }
    if (url.pathname === '/') return new Response(landingHTML(), { headers });
    if (url.pathname === '/health') return new Response(JSON.stringify({ status: 'ok', service: NAME, fleet: FLEET }), { headers: jsonHeaders });
    if (url.pathname === '/setup') return new Response(generateSetupHTML(NAME, BRAND), { headers });

    // ── Seed Route ──
    if (url.pathname === '/api/seed') {
      return new Response(JSON.stringify({ service: NAME, seed: SEED_DATA }, null, 2), { headers: jsonHeaders });
    }

    // ── BYOK Config ──
    if (url.pathname === '/api/byok/config') {
      if (request.method === 'GET') {
        const config = await loadBYOKConfig(request, env);
        return new Response(JSON.stringify(config), { headers: jsonHeaders });
      }
      if (request.method === 'POST') {
        const config = await request.json();
        await saveBYOKConfig(config, request, env);
        return new Response(JSON.stringify({ saved: true }), { headers: jsonHeaders });
      }
    }

    // ── Chat with confidence + memory ──
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      const config = await loadBYOKConfig(request, env);
      if (!config) return new Response(JSON.stringify({ error: 'No provider configured. Visit /setup' }), { status: 401, headers: jsonHeaders });
      const body = await request.json();
      const lastMsg = (body.messages || []).slice(-1)[0]?.content || '';
      const conf = confidenceScore(lastMsg);
      // Save summary to KV if available
      if (env?.REALLOG_KV) {
        try {
          const summary = lastMsg.slice(0, 200);
          await env.REALLOG_KV.put(`chat:${Date.now()}`, JSON.stringify({ summary, confidence: conf, ts: new Date().toISOString() }), { expirationTtl: 86400 });
        } catch {}
      }
      return callLLM(config, body.messages || [], { stream: body.stream, maxTokens: body.maxTokens, temperature: body.temperature });
    }

    // ── Stories ──
    if (url.pathname === '/api/stories') {
      if (request.method === 'GET') {
        const stories = env?.REALLOG_KV ? JSON.parse(await env.REALLOG_KV.get('stories') || '[]') : [];
        return new Response(JSON.stringify({ stories }), { headers: jsonHeaders });
      }
      if (request.method === 'POST') {
        const data = await request.json();
        const stories = env?.REALLOG_KV ? JSON.parse(await env.REALLOG_KV.get('stories') || '[]') : [];
        const story = { id: Date.now().toString(36), ...data, createdAt: new Date().toISOString() };
        stories.push(story);
        if (env?.REALLOG_KV) await env.REALLOG_KV.put('stories', JSON.stringify(stories));
        return new Response(JSON.stringify({ story }), { headers: jsonHeaders });
      }
    }

    // ── Media ──
    if (url.pathname === '/api/media') {
      if (request.method === 'GET') {
        const media = env?.REALLOG_KV ? JSON.parse(await env.REALLOG_KV.get('media') || '[]') : [];
        return new Response(JSON.stringify({ media }), { headers: jsonHeaders });
      }
      if (request.method === 'POST') {
        const data = await request.json();
        const media = env?.REALLOG_KV ? JSON.parse(await env.REALLOG_KV.get('media') || '[]') : [];
        const item = { id: Date.now().toString(36), ...data, createdAt: new Date().toISOString() };
        media.push(item);
        if (env?.REALLOG_KV) await env.REALLOG_KV.put('media', JSON.stringify(media));
        return new Response(JSON.stringify({ item }), { headers: jsonHeaders });
      }
    }

    // ── Research (stub) ──
    if (url.pathname === '/api/research') {
      return new Response(JSON.stringify({ service: NAME, endpoint: '/api/research', message: 'Research board — coming soon' }), { headers: jsonHeaders });
    }

    return new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
