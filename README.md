# log-origin

> Privacy-first, self-improving AI gateway. Cloudflare-native, forkable, embeddable.

## What Is This

log-origin is the white-label core that powers [LOG.ai](https://github.com/CedarBeach2019/log-origin) — a platform of themed AI gateways (studylog.ai, makerlog.ai, DMlog.ai, etc.). It's also a standalone library you can embed in your own applications.

**The core idea:** Every interaction builds a log. The log trains the routing. The routing gets better. Your AI has a memory.

## Status

🔄 **Architecture Phase** — We're writing the design documents before writing any code. Every table, endpoint, component, threat model, and tradeoff is debated and documented.

See `docs/` for the complete design blueprint.

## Design Documents

| Document | What It Covers |
|----------|---------------|
| [Platform Vision](docs/PLATFORM-VISION.md) | The big picture: LOG.ai concept, domains as hubs, omni-bot, flywheel |
| [Master Plan](docs/MASTER-PLAN.md) | 7-phase roadmap, architecture overview, privacy model |
| [Database Schema](docs/database/SCHEMA-DESIGN.md) | Every table, column, index, migration strategy, D1 constraints |
| [Intelligence Design](docs/routing/INTELLIGENCE-DESIGN.md) | Routing, classification, adaptive learning, draft rounds, agent routing |
| [Security Model](docs/security/SECURITY-MODEL.md) | 17-threat matrix, auth, authorization, API security, Worker security |
| [Privacy Architecture](docs/privacy/PRIVACY-ARCHITECTURE.md) | Encryption flows, PII detection, zero-knowledge analysis, compliance |
| [API Design](docs/api/API-DESIGN.md) | Every endpoint, request/response schemas, streaming, error handling |
| [Protocol Spec](docs/api/PROTOCOL-SPEC.md) | MCP integration, agent communication, local tunnels, federation |
| [UX Design](docs/ux/UX-DESIGN.md) | Personas, wireframes, theming, accessibility, information architecture |
| [Component Spec](docs/ux/COMPONENT-SPEC.md) | Preact components, state management, streaming, performance |
| [Initial Design](docs/architecture/initial-design.md) | Original design from the research phase |

## Key Design Decisions

- **Cloudflare Workers** — edge deployment, $0 on free tier, scale to zero
- **D1 (SQLite)** — our current Python prototype uses SQLite, D1 ports directly
- **Preact** — 4KB, no build step, ships as static Worker assets
- **Hono** — typed HTTP framework for Workers
- **Client-side encryption** — AES-256-GCM, PBKDF2 key derivation, zero-knowledge at rest
- **Regex-first routing** — 5ms classification on Workers, ML optimizes rules over time
- **OpenAI-compatible API** — drop-in replacement for existing SDKs

## Themed Forks

log-origin is the engine. Themed forks add personality:

- **DMlog.ai** — TTRPG world-builder's AI (first themed variant)
- **studylog.ai** — AI tutor that remembers what you've learned
- **makerlog.ai** — AI pair programmer that learns your style
- **businesslog.ai** — AI assistant for operations and analytics
- **RealLog.ai** — Life journal vessel for daily reflection, mood tracking, and personal growth

Each fork customizes: system prompts, UI theme, routing rules, and feature set.

## Life Journal (RealLog.ai)

A privacy-first life journal with mood tracking, pattern insights, and year-in-review.

### Journal Features

- **Daily Journal** — Write entries with title, body, mood, tags, and gratitude
- **Mood Tracker** — Track mood over time with visual charts and averages
- **Pattern Insights** — Automatic detection of mood trends, recurring themes, and streaks
- **Year in Review** — Annual summary with highlights, top tags, and monthly mood breakdown
- **Gratitude Tracker** — Dedicated gratitude log with statistics
- **Privacy Controls** — Client-side encryption, PII redaction, data retention policies
- **Anomaly Detection** — Alerts for unusual mood changes and journaling gaps
- **Life Metrics** — Composite wellbeing, consistency, positivity, and self-awareness scores

### Journal API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/journal` | List journal entries |
| `POST` | `/v1/journal` | Create a new entry |
| `GET` | `/v1/journal/:id` | Get a single entry |
| `PUT` | `/v1/journal/:id` | Update an entry |
| `DELETE` | `/v1/journal/:id` | Delete an entry |
| `GET` | `/v1/journal/year-in-review` | Generate year-in-review summary |
| `GET` | `/v1/mood` | Get mood history and averages |
| `GET` | `/v1/insights/metrics` | Life metrics (wellbeing, consistency, etc.) |
| `GET` | `/v1/insights/patterns` | Detected patterns and trends |
| `GET` | `/v1/insights/anomalies` | Anomaly alerts |
| `GET` | `/v1/insights/privacy` | Get privacy settings |
| `PUT` | `/v1/insights/privacy` | Update privacy settings |
| `GET` | `/v1/gratitude` | Gratitude log |
| `GET` | `/v1/gratitude/stats` | Gratitude statistics |

### Journal UI

Access the journal interface at `/journal.html` — warm cream (`#FFFBF0`), brown (`#78350F`), and sage green (`#6B8E6B`) theme.

## Research

See `.research/` for the raw research that informed the design:

- `cloudflare-arch.md` — Cloudflare services, limits, pricing
- `privacy-vault.md` — Encryption research, threat model
- `agent-tunnels.md` — Cloudflare Tunnel, MCP, A2A protocols
- `forkable-repo.md` — Fork patterns, update mechanism, personality packs
- `log-platform.md` — LOG.ai brand concept, omni-bot design
- `multi-tenant.md` — Workers for Platforms, scaling tiers
- `agent-network.md` — Agent identity, discovery, communication

## License

MIT
