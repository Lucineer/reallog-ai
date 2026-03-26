# OpenMAIC Deep Research Study

## Executive Summary

**OpenMAIC** (Open Multi-Agent Interactive Classroom) is an open-source AI platform from Tsinghua University that transforms any topic or document into a rich, interactive classroom experience. Powered by multi-agent orchestration, it generates slides, quizzes, interactive simulations, and project-based learning activities delivered by AI teachers and classmates who can speak, draw on whiteboards, and engage in real-time discussions.

### Why OpenMAIC Matters for log-origin

OpenMAIC represents a **paradigm shift** in interactive AI systems that directly aligns with log-origin's goals for DMlog.ai (TTRPG game mastering) and StudyLog.ai (interactive learning):

1. **Multi-Agent Orchestration**: LangGraph-based director system that manages agent turns, discussions, and interactions
2. **Real-time Interactive UI**: Canvas-based slide rendering with live effects (spotlight, laser), whiteboard drawing, and TTS integration
3. **Content Generation Pipeline**: Two-stage generation (outlines → scenes) with rich scene types (slides, quizzes, interactive, PBL)
4. **State Management**: Sophisticated Zustand stores with IndexedDB persistence for session continuity
5. **Extensibility**: Plugin architecture for agents, providers, and media generation

For log-origin, OpenMAIC provides a **blueprint** for:
- **DMlog.ai**: Converting classroom orchestration into game master console (scene management, NPC control, combat tracking)
- **StudyLog.ai**: Adapting interactive presentation system into study sessions with generated slides and quizzes
- **Real-time Collaboration**: Multi-user interaction patterns for TTRPG sessions and study groups

## Architecture Deep Dive

### Component Hierarchy

```
OpenMAIC/
├── app/                        # Next.js App Router
│   ├── api/                    # Server API routes (~18 endpoints)
│   │   ├── generate/           # Scene generation pipeline
│   │   ├── generate-classroom/ # Async classroom job submission
│   │   ├── chat/               # Multi-agent discussion (SSE streaming)
│   │   └── ...                 # quiz-grade, parse-pdf, web-search, etc.
│   ├── classroom/[id]/         # Classroom playback page
│   └── page.tsx                # Home page (generation input)
│
├── lib/                        # Core business logic
│   ├── generation/             # Two-stage lesson generation pipeline
│   ├── orchestration/          # LangGraph multi-agent orchestration
│   ├── playback/               # Playback state machine
│   ├── action/                 # Action execution engine (28+ actions)
│   ├── ai/                     # LLM provider abstraction
│   ├── store/                  # Zustand state stores
│   ├── types/                  # Centralized TypeScript types
│   └── ...                     # audio, media, export, hooks, i18n
│
├── components/                 # React UI components
│   ├── slide-renderer/         # Canvas-based slide editor & renderer
│   ├── scene-renderers/        # Quiz, Interactive, PBL scene renderers
│   ├── generation/             # Lesson generation toolbar & progress
│   ├── chat/                   # Chat area & session management
│   ├── whiteboard/             # SVG-based whiteboard drawing
│   ├── agent/                  # Agent avatar, config, info bar
│   └── ui/                     # Base UI primitives (shadcn/ui + Radix)
│
├── packages/                   # Workspace packages
│   ├── pptxgenjs/              # Customized PowerPoint generation
│   └── mathml2omml/            # MathML → Office Math conversion
│
└── skills/                     # OpenClaw / ClawHub skills
    └── openmaic/               # Guided OpenMAIC setup & generation SOP
```

### Data Flow

```
User Input → Requirements Analysis → Outline Generation → Scene Generation → Playback
     │              │                     │                    │              │
     │              │                     │                    │              │
     ▼              ▼                     ▼                    ▼              ▼
  Text/PDF    Vision/OCR           Scene Outlines        Full Scenes      Interactive
  Upload      Processing           (JSON structure)      (with Actions)    Classroom
                                                                           │
                                                                           │
                                                                           ▼
                                                                     Multi-Agent
                                                                     Discussion
                                                                           │
                                                                           ▼
                                                                     Real-time SSE
                                                                     Streaming
```

### Technical Stack

- **Frontend**: Next.js 16, React 19, TypeScript 5, Tailwind CSS 4
- **State Management**: Zustand with IndexedDB persistence
- **Multi-Agent**: LangGraph 1.1 with custom director graph
- **UI Components**: shadcn/ui + Radix primitives
- **Slide Rendering**: Custom canvas-based editor (PPTist fork)
- **Audio**: TTS providers (OpenAI, ElevenLabs, Azure, Browser-native), ASR
- **Media Generation**: Image/video providers (Grok, Qwen, Kling, Veo)
- **Export**: PowerPoint (.pptx) and interactive HTML
- **Build**: pnpm workspace, Vercel deployment

## Agent Orchestrator Analysis

### LangGraph Director System

OpenMAIC uses a **unified LangGraph state machine** for both single and multi-agent orchestration:

```typescript
// Graph topology:
// START → director ──(end)──→ END
//            │
//            └─(next)→ agent_generate ──→ director (loop)
```

**Key Components**:

1. **Director Node**: Decides which agent speaks next
   - Single agent: Pure code logic (no LLM)
   - Multi agent: LLM-based decision with code fast-paths
   - Turn limit enforcement

2. **Agent Generate Node**: Runs one agent's generation
   - Streams `agent_start`, `text_delta`, `action`, `agent_end` events
   - Enforces action permissions based on scene type
   - Maintains whiteboard action ledger

3. **State Management**:
   ```typescript
   const OrchestratorState = Annotation.Root({
     messages: Annotation<StatelessChatRequest['messages']>,
     storeState: Annotation<StatelessChatRequest['storeState']>,
     availableAgentIds: Annotation<string[]>,
     maxTurns: Annotation<number>,
     currentAgentId: Annotation<string | null>,
     turnCount: Annotation<number>,
     agentResponses: Annotation<AgentTurnSummary[]>,
     whiteboardLedger: Annotation<WhiteboardActionRecord[]>,
     shouldEnd: Annotation<boolean>,
     totalActions: Annotation<number>,
   });
   ```

### Agent Registry System

```typescript
interface AgentConfig {
  id: string;
  name: string; // Display name
  role: string; // Short role description
  persona: string; // Full system prompt
  avatar: string; // Emoji or image URL
  color: string; // UI theme color
  allowedActions: string[]; // Action types this agent can use
  priority: number; // Priority for director selection (1-10)
  voiceConfig?: { providerId: TTSProviderId; voiceId: string };
  isDefault: boolean;
  isGenerated?: boolean; // For LLM-generated agents
  boundStageId?: string; // Stage ID this agent was generated for
}
```

**Action Categories**:
- `WHITEBOARD_ACTIONS`: `wb_open`, `wb_draw_text`, `wb_draw_shape`, etc.
- `SLIDE_ACTIONS`: `spotlight`, `laser`, `play_video`
- Role-based mapping: Teachers get slide + whiteboard, others get whiteboard only

### Stateless Chat API

**Key Innovation**: Fully stateless server with client-maintained state:

```typescript
interface StatelessChatRequest {
  messages: UIMessage<ChatMessageMetadata>[]; // Conversation history
  storeState: { stage, scenes, currentSceneId, mode, whiteboardOpen }; // App state
  config: { agentIds, sessionType?, discussionTopic?, triggerAgentId? };
  directorState?: DirectorState; // Accumulated director state
  userProfile?: { nickname?, bio? };
  apiKey: string;
}
```

**SSE Events**:
```typescript
type StatelessEvent =
  | { type: 'agent_start'; data: { messageId, agentId, agentName, agentAvatar, agentColor } }
  | { type: 'agent_end'; data: { messageId, agentId } }
  | { type: 'text_delta'; data: { content: string; messageId?: string } }
  | { type: 'action'; data: { actionId, actionName, params, agentId, messageId? } }
  | { type: 'thinking'; data: { stage: 'director' | 'agent_loading'; agentId? } }
  | { type: 'cue_user'; data: { fromAgentId?: string; prompt?: string } }
  | { type: 'done'; data: { totalActions, totalAgents, directorState? } }
  | { type: 'error'; data: { message: string } };
```

### TTRPG Adaptation Mapping

**DMlog.ai Adaptation**:
```
OpenMAIC Agent → TTRPG NPC/Character
  │                    │
  ▼                    ▼
Teacher Agent   → Game Master
Student Agents  → Player Characters
Discussion      → In-game dialogue
Whiteboard      → Battle map / Scene visualization
Spotlight/Laser → Focus on character/object
Slides          → Scene descriptions / Handouts
Quiz            → Skill checks / Puzzles
```

**Key Translation Patterns**:
1. **Agent → Character**: Each TTRPG character gets agent config with persona, voice, allowed actions
2. **Director → Initiative Tracker**: LangGraph director manages combat turns
3. **Whiteboard → Battle Map**: SVG-based drawing for maps, tokens, fog of war
4. **Actions → Game Mechanics**: `roll_dice`, `apply_damage`, `cast_spell`, `move_token`
5. **Discussion → Roleplay**: Multi-agent conversations with character voices

## Interactive Presentation System

### Playback Engine State Machine

```typescript
// State machine:
//                  start()                  pause()
//   idle ──────────────────→ playing ──────────────→ paused
//     ▲                         ▲                       │
//     │                         │  resume()             │
//     │                         └───────────────────────┘
//     │
//     │  handleEndDiscussion()
//     │                         confirmDiscussion()
//     │                         / handleUserInterrupt()
//     │                              │
//     │                              ▼         pause()
//     └──────────────────────── live ──────────────→ paused
//                                 ▲                    │
//                                 │ resume / user msg  │
//                                 └────────────────────┘
```

**Key Features**:
1. **Unified Action Consumption**: Direct execution of `Scene.actions[]` via `ActionEngine`
2. **Speech Timing**: TTS integration with browser-native fallback, reading time estimation
3. **Discussion Triggers**: Proactive cards with 3s delay before showing
4. **State Persistence**: Snapshot system for resume/restore
5. **Browser TTS Workarounds**: Chrome bug handling (15s cutoff), Firefox compatibility

### Action Engine

**28+ Action Types** in two categories:

**Fire-and-forget** (immediate):
- `spotlight`: Focus on element with dimming
- `laser`: Point at element with laser effect

**Synchronous** (await completion):
- `speech`: TTS narration
- `wb_*`: Whiteboard operations (draw text/shape/chart/latex/table/line, clear, delete)
- `play_video`: Video playback
- `discussion`: Trigger roundtable discussion

**Execution Pattern**:
```typescript
class ActionEngine {
  async execute(action: Action): Promise<void> {
    switch (action.type) {
      case 'spotlight':
        this.executeSpotlight(action); // Fire-and-forget
        return;
      case 'speech':
        return this.executeSpeech(action); // Synchronous
      // ...
    }
  }
}
```

### Slide Renderer Architecture

**Canvas-based Editor** (`components/slide-renderer/`):
- Fork of PPTist presentation editor
- Real-time element manipulation (text, image, shape, table, chart, latex, video)
- SVG-based rendering with interactive editing
- Theme system with gradients, shadows, outlines
- Export to PowerPoint via customized `pptxgenjs`

**Element Types**:
```typescript
enum ElementTypes {
  TEXT = 'text',
  IMAGE = 'image',
  SHAPE = 'shape',
  LINE = 'line',
  CHART = 'chart',
  TABLE = 'table',
  LATEX = 'latex',
  VIDEO = 'video',
  AUDIO = 'audio',
}
```

### Roundtable Component

**2,094 lines** of interactive UI (`components/roundtable/index.tsx`):
- Multi-agent discussion interface
- Audio indicators for speaking agents
- Presentation speech overlay
- Proactive discussion cards
- Playback controls (pause, resume, speed)
- Microphone input for user participation
- Thinking state visualization

**Key UI Patterns**:
1. **Animated Transitions**: Motion animations for agent switching
2. **Audio Visualization**: Real-time audio level indicators
3. **Responsive Layout**: Adapts to different screen sizes
4. **Accessibility**: Keyboard shortcuts, screen reader support
5. **Internationalization**: Chinese/English support via i18n hooks

### Real-time Features

**TTS Integration**:
- Multiple providers: OpenAI, ElevenLabs, Azure, Browser-native
- Per-agent voice configuration
- Speed/volume controls
- Browser-native TTS with Chrome bug workarounds

**WebSocket/SSE**:
- Server-Sent Events for streaming agent responses
- Heartbeat mechanism (15s intervals) to prevent connection timeout
- AbortController integration for cancellation

**Media Generation**:
- Image providers: Grok, Qwen, Seedream
- Video providers: Kling, Veo, Seedance
- Async job polling with progress tracking

## Content Generation Pipeline

### Two-Stage Generation

**Stage 1: Outline Generation** (`lib/generation/outline-generator.ts`):
```
User Requirements → AI Analysis → Scene Outlines (JSON)
```

**Stage 2: Scene Generation** (`lib/generation/scene-generator.ts`):
```
Scene Outline → Content Generation → Actions Generation → Full Scene
```

### Prompt System

**Template-based Prompts** (`lib/generation/prompts/`):
```
templates/
├── requirements-to-outlines/
│   ├── system.md
│   └── user.md
├── slide-content/
│   ├── system.md
│   └── user.md
├── slide-actions/
│   ├── system.md
│   └── user.md
├── quiz-content/
│   ├── system.md
│   └── user.md
└── ...
```

**Prompt Building**:
```typescript
const prompts = buildPrompt(PROMPT_IDS.REQUIREMENTS_TO_OUTLINES, {
  requirement: requirements.requirement,
  language: requirements.language,
  pdfContent: pdfText ? pdfText.substring(0, MAX_PDF_CONTENT_CHARS) : 'None',
  availableImages: availableImagesText,
  userProfile: userProfileText,
  mediaGenerationPolicy,
  researchContext: options?.researchContext || 'None',
  teacherContext: options?.teacherContext || '',
});
```

### Scene Types

1. **Slide Scenes**:
   - Canvas-based presentations
   - Rich media elements (images, videos, charts, LaTeX)
   - Animations and transitions
   - Export to PowerPoint

2. **Quiz Scenes**:
   - Single/multiple choice, short answer
   - Real-time AI grading
   - Answer analysis and feedback
   - Points system

3. **Interactive Scenes**:
   - HTML-based simulations
   - Physics engines, flowcharts, experiments
   - Iframe embedding with communication

4. **PBL Scenes** (Project-Based Learning):
   - Role selection (manager, designer, developer, etc.)
   - Issue board with milestones
   - Multi-agent collaboration
   - Deliverable tracking

### Media Generation Pipeline

**Placeholder System**:
```typescript
// In outlines: "gen_img_1", "gen_vid_1"
// During generation: Replace with actual media URLs
const result = uniquifyMediaElementIds(enriched);
```

**Async Job Processing**:
- Media generation jobs submitted to queue
- Polling API for completion status
- Fallback to placeholder images
- Progress tracking with callbacks

## TTRPG Adaptation Blueprint

### DM's Game Master Console

**Core Components**:

1. **Scene Management**:
   ```typescript
   // Adapted from OpenMAIC's Stage/Scene system
   interface GameScene {
     id: string;
     type: 'combat' | 'social' | 'exploration' | 'puzzle';
     title: string;
     content: SceneContent;
     npcs: NPCConfig[];
     triggers: Trigger[];
     music?: string; // Background music URL
     lighting?: 'bright' | 'dim' | 'dark';
   }
   ```

2. **NPC Control System**:
   ```typescript
   // Adapted from AgentRegistry
   interface NPCConfig {
     id: string;
     name: string;
     race: string;
     class?: string;
     stats: { str, dex, con, int, wis, cha };
     personality: string; // Agent persona
     voice: VoiceConfig;
     portrait: string; // Avatar image
     allowedActions: NPC_ACTION[];
     initiative?: number;
     hp: { current: number; max: number };
     conditions: Condition[];
   }
   ```

3. **Combat Tracker**:
   ```typescript
   // Adapted from LangGraph Director
   class CombatDirector {
     private graph: StateGraph<CombatState>;
     
     async nextTurn(): Promise<TurnResult> {
       // Initiative order management
       // Action resolution
       // Status effect updates
     }
   }
   ```

4. **Battle Map**:
   ```typescript
   // Adapted from Whiteboard component
   interface BattleMap {
     grid: { size: number; type: 'square' | 'hex' };
     tokens: MapToken[];
     fogOfWar: FogArea[];
     layers: MapLayer[]; // Terrain, objects, tokens
