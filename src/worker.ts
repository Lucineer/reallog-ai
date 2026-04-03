import { addNode, addEdge, traverse, crossDomainQuery, findPath, domainStats, getDomainNodes } from './lib/knowledge-graph.js';
import { loadSeedIntoKG, FLEET_REPOS, loadAllSeeds } from './lib/seed-loader.js';
import { evapPipeline, getEvapReport, getLockStats } from './lib/evaporation-pipeline.js';
import { selectModel } from './lib/model-router.js';
import { trackConfidence, getConfidence } from './lib/confidence-tracker.js';
import { loadBYOKConfig, saveBYOKConfig, callLLM, generateSetupHTML } from './lib/byok.js';
import { evapPipeline } from './lib/evaporation-pipeline.js';
import { deadbandCheck, deadbandStore, getEfficiencyStats } from './lib/deadband.js';
import { logResponse } from './lib/response-logger.js';

import { storePattern, findSimilar, getNeighborhood, crossRepoTransfer, listPatterns } from './lib/structural-memory.js';
import { exportPatterns, importPatterns, fleetSync } from './lib/cross-cocapn-bridge.js';


const BRAND = '#dc2626';
const NAME = 'RealLog.ai';
const TAGLINE = 'Watch AI investigate a story';

const FLEET = { name: NAME, tier: 2, domain: 'journalism-content', fleetVersion: '2.0.0', builtBy: 'Superinstance & Lucineer (DiGennaro et al.)' };

const SEED_DATA = {
  journalism: {
    frameworks: ['Inverted Pyramid', 'Narrative Arc', 'Five Ws + H', 'AP Style', 'Investigative Series'],
    contentTypes: ['Breaking News', 'Feature Story', 'Op-Ed', 'Analysis', 'Investigative', 'Review', 'Interview'],
    editorialPipeline: ['Tip → Verify → Research → Draft → Edit → Publish → Distribute'],
    mediaFormats: ['Text', 'Video', 'Audio/Podcast', 'Photo Essay', 'Interactive', 'Data Visualization'],
    sourcingPrinciples: ['Primary Sources First', 'Cross-Reference', 'On-Record Preference', 'Fact-Check Chain'],
  },
};

function landingHTML(): string {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${NAME} — ${TAGLINE}</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',system-ui;background:#0a0a0a;color:#e0e0e0;overflow-x:hidden}
.hero{background:linear-gradient(135deg,#dc2626,#991b1b);padding:3rem 2rem 2rem;text-align:center;position:relative}
.hero::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(255,255,255,.08) 0%,transparent 60%);pointer-events:none}
.hero h1{font-size:2.8rem;color:#fecaca;margin-bottom:.5rem;font-weight:800}.hero p{color:#fca5a5;font-size:1.1rem}
.badge{display:inline-block;background:rgba(255,255,255,.12);padding:.4rem 1rem;border-radius:20px;font-size:.8rem;color:#fecaca;margin-top:1rem;border:1px solid rgba(255,255,255,.15)}

.demo{max-width:860px;margin:2rem auto;padding:0 1rem}
.demo-label{text-align:center;color:#dc2626;font-size:.85rem;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:1rem}
.terminal{background:#111;border:1px solid #1f1f1f;border-radius:12px;overflow:hidden;font-family:'JetBrains Mono',monospace;font-size:.82rem;line-height:1.7}
.term-bar{background:#1a1a1a;padding:.6rem 1rem;display:flex;gap:.5rem;align-items:center}
.dot{width:10px;height:10px;border-radius:50%}.r{background:#ff5f57}.y{background:#febc2e}.g{background:#28c840}
.term-title{margin-left:.75rem;color:#555;font-size:.75rem}
.term-body{padding:1rem 1.25rem;max-height:520px;overflow-y:auto}
.msg{margin-bottom:.85rem;animation:fadein .4s ease both}
@keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.msg:nth-child(1){animation-delay:.1s}.msg:nth-child(2){animation-delay:.4s}.msg:nth-child(3){animation-delay:.7s}.msg:nth-child(4){animation-delay:1s}.msg:nth-child(5){animation-delay:1.3s}.msg:nth-child(6){animation-delay:1.6s}.msg:nth-child(7){animation-delay:1.9s}.msg:nth-child(8){animation-delay:2.2s}.msg:nth-child(9){animation-delay:2.5s}
.ts{color:#555;font-size:.72rem}
.msg-user{color:#fca5a5}.msg-user strong{color:#fff}
.msg-agent{color:#f87171}.msg-agent strong{color:#fbbf24}
.msg-board{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:.75rem 1rem;margin-top:.5rem}
.board-title{color:#fbbf24;font-size:.75rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:.5rem}
.board-row{display:flex;gap:1rem;margin-bottom:.3rem;font-size:.8rem}
.board-label{color:#888;min-width:80px}.board-val{color:#e0e0e0}
.msg-success{color:#34d399;padding:.5rem .75rem;background:rgba(52,211,153,.06);border-left:3px solid #34d399;border-radius:0 6px 6px 0}
.msg-sys{color:#666;font-style:italic}

.research{max-width:860px;margin:2rem auto;padding:0 1rem}
.research h2{color:#dc2626;font-size:1.1rem;margin-bottom:1rem}
.board-grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
@media(max-width:600px){.board-grid{grid-template-columns:1fr}}
.bcard{background:#111;border:1px solid #1f1f1f;border-radius:10px;padding:1rem}
.bcard h3{font-size:.8rem;color:#fbbf24;margin-bottom:.5rem;text-transform:uppercase;letter-spacing:1px}
.bcard ul{list-style:none;padding:0}.bcard li{color:#aaa;font-size:.82rem;padding:.25rem 0;border-bottom:1px solid #1a1a1a}.bcard li:last-child{border:none}
.tag{display:inline-block;background:#dc262622;color:#f87171;padding:.15rem .5rem;border-radius:4px;font-size:.7rem;margin:.1rem}

.byok{max-width:560px;margin:2.5rem auto;padding:0 1rem;text-align:center}
.byok h2{color:#fca5a5;font-size:1.2rem;margin-bottom:.75rem}
.byok p{color:#666;font-size:.85rem;margin-bottom:1rem}
.byok form{display:flex;gap:.5rem}
.byok input{flex:1;background:#111;border:1px solid #2a2a2a;color:#e0e0e0;padding:.7rem 1rem;border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:.8rem;outline:none}
.byok input:focus{border-color:#dc2626}
.byok button{background:#dc2626;color:#fff;border:none;padding:.7rem 1.5rem;border-radius:8px;font-weight:700;cursor:pointer}

.fork-bar{max-width:860px;margin:2rem auto;padding:0 1rem;display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap}
.fork-bar a{display:inline-flex;align-items:center;gap:.5rem;padding:.6rem 1.2rem;background:#111;border:1px solid #2a2a2a;border-radius:8px;color:#fca5a5;text-decoration:none;font-size:.85rem;font-weight:600;transition:border-color .2s}
.fork-bar a:hover{border-color:#dc2626}

.footer{text-align:center;padding:2rem;color:#333;font-size:.75rem;border-top:1px solid #1a1a1a}
</style></head><body>
<div class="hero">
  <h1>${NAME}</h1>
  <p>${TAGLINE}</p>
  <div class="badge">🔍 AI-Powered Journalism · BYOK · Fleet Protocol</div>
</div>

<div class="demo">
  <div class="demo-label">⚡ Live Investigation Demo</div>
  <div class="terminal">
    <div class="term-bar"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><div class="term-title">reallog://investigation</div></div>
    <div class="term-body">
      <div class="msg msg-user"><span class="ts">14:01:02</span> <strong>You:</strong> https://example.com/breaking-climate-report-2026 — Can you investigate this story?</div>
      <div class="msg msg-agent"><span class="ts">14:01:05</span> <strong>RealLog Agent:</strong> Received. Fetching article and initiating investigation pipeline...</div>
      <div class="msg msg-sys"><span class="ts">14:01:07</span> ── Source fetched: "Global Climate Report Shows Accelerating Sea Level Rise" (Reuters, 2026-04-01)</div>
      <div class="msg msg-agent"><span class="ts">14:01:12</span> <strong>Fact-Check Engine:</strong> Cross-referencing claims against 23 authoritative sources. Found 4 related reports from NOAA, NASA, Nature, and IPCC.</div>
      <div class="msg msg-agent"><span class="ts">14:01:18</span> <strong>Bias Analysis:</strong> Article tone: <span style="color:#34d399">Neutral/Scientific</span>. No loaded language detected. Sources cited: 12 peer-reviewed studies, 3 government datasets.</div>
      <div class="msg msg-board"><span class="ts">14:01:22</span> <strong>📋 Research Board Created</strong>
        <div class="board-grid" style="margin-top:.5rem">
          <div class="bcard"><h3>Key Claims</h3><ul><li>Sea levels rising 4.5mm/yr (up from 3.1mm)</li><li>Arctic ice loss accelerating 18%</li><li>2025 was hottest year on record</li></ul></div>
          <div class="bcard"><h3>Evidence Rating</h3><ul><li>Claim 1: <span class="tag">✅ Verified (NOAA)</span></li><li>Claim 2: <span class="tag">✅ Verified (NASA)</span></li><li>Claim 3: <span class="tag">✅ Verified (WMO)</span></li></ul></div>
        </div>
      </div>
      <div class="msg msg-agent"><span class="ts">14:01:28</span> <strong>Related Coverage:</strong> Found 8 articles from other outlets. Consensus: 7/8 corroborate. 1 op-ed disputes methodology (Wall Street Journal editorial).</div>
      <div class="msg msg-success"><span class="ts">14:01:32</span> ✓ Balanced summary generated. Research board saved with 23 sources, 4 claims, and confidence ratings.</div>
    </div>
  </div>
</div>

<div class="research">
  <h2>📊 Research Board Preview</h2>
  <div class="board-grid">
    <div class="bcard"><h3>Sources (23)</h3><ul><li>Reuters — Original article</li><li>NOAA — Sea level data</li><li>NASA — Ice sheet measurements</li><li>Nature — Peer-reviewed study</li><li>IPCC — AR7 Summary</li></ul></div>
    <div class="bcard"><h3>Coverage Map</h3><ul><li>NYT — Corroborates <span class="tag">✅</span></li><li>BBC — Corroborates <span class="tag">✅</span></li><li>Guardian — Corroborates <span class="tag">✅</span></li><li>WSJ — Disputes method <span class="tag">⚠️</span></li><li>AP — Corroborates <span class="tag">✅</span></li></ul></div>
  </div>
</div>

<div class="byok">
  <h2>🔑 Bring Your Own Key</h2>
  <p>Add your LLM API key to start investigating stories yourself.</p>
  <form action="/setup" method="get"><input type="text" placeholder="sk-... or your provider key" readonly><button type="submit">Configure</button></form>
</div>

<div class="fork-bar">
  <a href="https://github.com/Lucineer/reallog-ai" target="_blank">⭐ Star</a>
  <a href="https://github.com/Lucineer/reallog-ai/fork" target="_blank">🔀 Fork</a>
  <a href="https://github.com/Lucineer/reallog-ai" target="_blank">📋 git clone https://github.com/Lucineer/reallog-ai.git</a>
</div>

<div class="footer">${NAME} — Built by Superinstance & Lucineer (DiGennaro et al.) · Part of the Cocapn Fleet</div>
</body></html>`;
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const headers = { 'Content-Type': 'text/html;charset=utf-8' };
    const jsonHeaders = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } });
    }

    if (url.pathname === '/') return new Response(landingHTML(), { headers });
    if (url.pathname === '/api/efficiency') return new Response(JSON.stringify({ totalCached: 0, totalHits: 0, cacheHitRate: 0, tokensSaved: 0, repo: 'reallog-ai', timestamp: Date.now() }), { headers: { ...cors, 'Content-Type': 'application/json' } });
      try {
      } catch (e) {
        return new Response(JSON.stringify({ totalCached: 0, totalHits: 0, cacheHitRate: 0, tokensSaved: 0, repo: 'reallog-ai', timestamp: Date.now(), error: 'efficiency tracking not initialized' }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }
    if (url.pathname === '/setup') return new Response(generateSetupHTML(NAME, BRAND), { headers });

    if (url.pathname === '/api/seed') {
      return new Response(JSON.stringify({ service: NAME, seed: SEED_DATA, fleet: FLEET }), { headers: jsonHeaders });
    }
    if (url.pathname === '/api/byok/config') {
      if (request.method === 'GET') {
        const config = await loadBYOKConfig(env);
        return new Response(JSON.stringify({ configured: !!config, provider: config?.provider || null }), { headers: jsonHeaders });
      }
      if (request.method === 'POST') {
        const body = await request.json();
        await saveBYOKConfig(env, body);
        return new Response(JSON.stringify({ saved: true }), { headers: jsonHeaders });
      }
    }
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const config = await loadBYOKConfig(env);
        if (!config) return new Response(JSON.stringify({ error: 'No provider configured. Visit /setup' }), { status: 401, headers: jsonHeaders });
        const body = await request.json();
        const messages = [{ role: 'system', content: 'You are RealLog.ai, an AI journalism and content analysis agent.' }, ...(body.messages || [{ role: 'user', content: body.message || '' }])];
        const userMessage = (body.messages || [{ role: 'user', content: body.message || '' }]).map((m) => m.content).join(' ');
        const result = await evapPipeline(env, userMessage, () => callLLM(config.apiKey, messages, config.provider, config.model), 'reallog-ai');
        return new Response(JSON.stringify({ response: result.response, source: result.source, tokensUsed: result.tokensUsed }), { headers: jsonHeaders });
      } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: jsonHeaders }); }
    }
    if (url.pathname === '/api/stories') {
      return new Response(JSON.stringify({ service: NAME, stories: [], message: 'Story management — coming soon' }), { headers: jsonHeaders });
    }
    if (url.pathname === '/api/media') {
      return new Response(JSON.stringify({ service: NAME, media: [], message: 'Media pipeline — coming soon' }), { headers: jsonHeaders });
    }
    if (url.pathname === '/api/research') {
      return new Response(JSON.stringify({ service: NAME, endpoint: '/api/research', message: 'Research board — coming soon' }), { headers: jsonHeaders });
    }

    if (url.pathname === '/api/confidence') {
      const scores = await getConfidence(env);
      return new Response(JSON.stringify(scores), { headers: jsonHeaders });
    }
    // ── Phase 4: Structural Memory Routes ──
    if (url.pathname === '/api/memory' && request.method === 'GET') {
      const source = url.searchParams.get('source') || undefined;
      const patterns = await listPatterns(env, source);
      return new Response(JSON.stringify(patterns), { headers: jsonHeaders });
    }
    if (url.pathname === '/api/memory' && request.method === 'POST') {
      const body = await request.json();
      await storePattern(env, body);
      return new Response(JSON.stringify({ ok: true, id: body.id }), { headers: jsonHeaders });
    }
    if (url.pathname === '/api/memory/similar') {
      const structure = url.searchParams.get('structure') || '';
      const threshold = parseFloat(url.searchParams.get('threshold') || '0.7');
      const similar = await findSimilar(env, structure, threshold);
      return new Response(JSON.stringify(similar), { headers: jsonHeaders });
    }
    if (url.pathname === '/api/memory/transfer') {
      const fromRepo = url.searchParams.get('from') || '';
      const toRepo = url.searchParams.get('to') || '';
      const problem = url.searchParams.get('problem') || '';
      const transfers = await crossRepoTransfer(env, fromRepo, toRepo, problem);
      return new Response(JSON.stringify(transfers), { headers: jsonHeaders });
    }
    if (url.pathname === '/api/memory/sync' && request.method === 'POST') {
      const body = await request.json();
      const repos = body.repos || [];
      const result = await fleetSync(env, repos);
      return new Response(JSON.stringify(result), { headers: jsonHeaders });
    }

    return new Response('{"error":"Not Found"}', { status: 404, headers: jsonHeaders });
  },
};