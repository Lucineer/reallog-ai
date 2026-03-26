import type { RoutingAction, Classification } from '../types';

// ─── Static rule definition ────────────────────────────────────────────────

interface StaticRule {
  name: string;
  pattern: RegExp;
  action: RoutingAction;
  confidence: number;
}

const STATIC_RULES: StaticRule[] = [
  // 1. Code Generation
  {
    name: 'code_generation',
    pattern:
      /\b(write|create|implement|build|code|program|script)\b.*\b(function|class|module|component|api|endpoint|handler)\b/i,
    action: 'escalation',
    confidence: 0.85,
  },

  // 2. Debug Request
  {
    name: 'debug_request',
    pattern:
      /\b(debug|fix|error|bug|issue|broken|crash|traceback|exception)\b/i,
    action: 'escalation',
    confidence: 0.85,
  },

  // 3. Code Review
  {
    name: 'code_review',
    pattern:
      /\b(review|refactor|optimize|improve|clean up)\b.*\b(code|function|class|module)\b/i,
    action: 'escalation',
    confidence: 0.8,
  },

  // 4. Mathematical Reasoning
  {
    name: 'math_reasoning',
    pattern:
      /\b(calculate|compute|solve|prove|derive|equation|formula|integral)\b/i,
    action: 'escalation',
    confidence: 0.9,
  },

  // 5. Complex Analysis
  {
    name: 'complex_analysis',
    pattern:
      /\b(analyze|compare|evaluate|assess|critique|synthesize)\b/i,
    action: 'escalation',
    confidence: 0.7,
  },

  // 6. Creative Writing
  {
    name: 'creative_writing',
    pattern:
      /\b(write|compose|draft|create)\b.*\b(story|poem|essay|article|blog|song|script)\b/i,
    action: 'escalation',
    confidence: 0.75,
  },

  // 7. Translation (cheap — small models handle this well)
  {
    name: 'translation',
    pattern:
      /\b(translate|convert)\b.*\b(to|into|from)\b.*\b(spanish|french|german|chinese|japanese|korean|russian|arabic)\b/i,
    action: 'cheap',
    confidence: 0.8,
  },

  // 8. Summarization
  {
    name: 'summarization',
    pattern:
      /\b(summarize|summarise|tldr|tl;dr|brief|recap|outline|condense)\b/i,
    action: 'cheap',
    confidence: 0.8,
  },

  // 9. Simple Q&A
  {
    name: 'simple_qa',
    pattern:
      /\b(what is|what are|who is|where is|when is|how do|how does|define|explain)\b/i,
    action: 'cheap',
    confidence: 0.6,
  },

  // 10. Factual Lookup
  {
    name: 'factual_lookup',
    pattern: /^(what|who|where|when|how many|how much)\?/i,
    action: 'cheap',
    confidence: 0.7,
  },

  // 11. Chat/Social
  {
    name: 'chat_social',
    pattern:
      /\b(hello|hi|hey|thanks|thank you|bye|good morning|good night|how are you)\b/i,
    action: 'cheap',
    confidence: 0.9,
  },

  // 12. List/Enumeration
  {
    name: 'list_enumeration',
    pattern:
      /\b(list|enumerate|give me|name)\b.*\b(\d+|few|some|all|top)\b/i,
    action: 'cheap',
    confidence: 0.7,
  },

  // 13. Instruction Following
  {
    name: 'instruction_following',
    pattern: /\b(set up|configure|install|deploy|how to)\b/i,
    action: 'escalation',
    confidence: 0.75,
  },

  // 14. Privacy-Sensitive
  {
    name: 'privacy_sensitive',
    pattern:
      /\b(password|ssn|social security|credit card|bank account|medical|diagnosis|prescription)\b/i,
    action: 'local',
    confidence: 0.85,
  },
];

// ─── Command prefix detection ──────────────────────────────────────────────

interface PrefixEntry {
  prefix: string;
  action: RoutingAction;
}

const COMMAND_PREFIXES: PrefixEntry[] = [
  { prefix: '/draft ', action: 'draft' },
  { prefix: '/local ', action: 'local' },
  { prefix: '/compare ', action: 'compare' },
  { prefix: '/manual ', action: 'manual' },
];

/**
 * Check for command prefix. Returns classification + stripped message or null.
 */
export function checkCommandPrefix(message: string): { classification: Classification; stripped: string } | null {
  const trimmed = message.trim();

  for (const { prefix, action } of COMMAND_PREFIXES) {
    if (trimmed.toLowerCase().startsWith(prefix) || trimmed.startsWith(prefix)) {
      const actualPrefix = trimmed.startsWith(prefix) ? prefix : prefix;
      return {
        classification: {
          action,
          confidence: 1.0,
          reason: `Command prefix: ${prefix.trim()}`,
        },
        stripped: trimmed.substring(actualPrefix.length).trim(),
      };
    }
  }

  return null;
}

// ─── Static rule matching ──────────────────────────────────────────────────

/**
 * Evaluate static rules against message. First match wins. Returns null if no match.
 */
export function checkStaticRules(message: string): Classification | null {
  for (const rule of STATIC_RULES) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(message)) {
      return {
        action: rule.action,
        confidence: rule.confidence,
        reason: `Static rule: ${rule.name}`,
      };
    }
  }
  return null;
}

// ─── Default fallback ──────────────────────────────────────────────────────

function defaultClassification(): Classification {
  return { action: 'cheap', confidence: 0.3, reason: 'Default fallback' };
}

// ─── Main classify function ────────────────────────────────────────────────

/**
 * Classify a message through the routing pipeline.
 *
 * Pipeline order:
 * 1. Command prefix check
 * 2. Static regex rules (14 patterns)
 * 3. Default fallback → 'cheap'
 *
 * Returns { classification, message } where message has prefix stripped if applicable.
 */
export function classify(message: string): { classification: Classification; message: string } {
  // Step 1: Command prefix
  const prefixResult = checkCommandPrefix(message);
  if (prefixResult) {
    return {
      classification: prefixResult.classification,
      message: prefixResult.stripped,
    };
  }

  // Step 2: Static rules
  const staticResult = checkStaticRules(message);
  if (staticResult) {
    return { classification: staticResult, message };
  }

  // Step 3: Default fallback
  return { classification: defaultClassification(), message };
}

/**
 * Simple classify that returns just the Classification (for quick checks).
 */
export function classifyOnly(message: string): Classification {
  return classify(message).classification;
}

// ─── Export for testing ────────────────────────────────────────────────────

export { STATIC_RULES };
