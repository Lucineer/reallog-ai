/**
 * RealLog.ai custom configuration loader.
 * Loads personality, rules, theme, and templates from KV.
 */
import type { Env } from '../src/types.js';

export interface RealLogConfig {
  personality: string;
  rules: any;
  theme: string;
  templates: Record<string, string>;
}

/**
 * Load RealLog.ai custom configuration from KV.
 */
export async function loadRealLogConfig(env: Env): Promise<RealLogConfig> {
  try {
    const [personality, rulesRaw, theme] = await Promise.all([
      env.KV.get('config:personality') || '',
      env.KV.get('config:rules') || '[]',
      env.KV.get('config:theme') || '',
    ]);

    let rules: any[] = [];
    try {
      rules = JSON.parse(rulesRaw);
    } catch (e) {
      console.error('Failed to parse rules JSON:', e);
    }

    // Load templates
    const templateKeys = [
      'template:morning_reflection', 'template:daily_journal', 'template:goal_checkin',
      'template:gratitude', 'template:mindfulness', 'template:weekly_review',
      'template:habit_tracking', 'template:mood_check',
    ];
    const templates: Record<string, string> = {};
    const templateResults = await Promise.all(templateKeys.map(k => env.KV.get(k)));
    for (let i = 0; i < templateKeys.length; i++) {
      const key = templateKeys[i].replace('template:', '');
      if (templateResults[i]) templates[key] = templateResults[i]!;
    }

    return { personality, rules, theme, templates };
  } catch (error) {
    console.error('Failed to load RealLog config from KV:', error);
    return getDefaultConfig();
  }
}

/**
 * Get the default system prompt for RealLog.ai.
 */
export async function getSystemPrompt(env: Env): Promise<string> {
  const config = await loadRealLogConfig(env);
  return config.personality || getDefaultConfig().personality;
}

/**
 * Get routing rules for RealLog.ai commands.
 */
export async function getRoutingRules(env: Env): Promise<any[]> {
  const config = await loadRealLogConfig(env);
  return config.rules;
}

/**
 * Get theme CSS for RealLog.ai.
 */
export async function getThemeCSS(env: Env): Promise<string> {
  const config = await loadRealLogConfig(env);
  return config.theme;
}

/**
 * Get template by key.
 */
export async function getTemplate(key: string, env: Env): Promise<string | null> {
  const val = await env.KV.get(`template:${key}`);
  return val;
}

/**
 * Default fallback configuration.
 */
function getDefaultConfig(): RealLogConfig {
  return {
    personality: `# RealLog.ai System Prompt

You are RealLog.ai — an AI journal companion for daily reflection, goal tracking, and personal growth.
Help with mindful journaling, habit building, gratitude practice, and self-awareness.
Be supportive and thoughtful, encouraging growth while honoring each person's unique journey. Remember reflection history via the LOG.`,
    rules: [],
    theme: `/* RealLog.ai Theme - Fallback */
body.reallog-theme {
  background-color: #f8f9fa;
  color: #2c3e50;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}`,
    templates: {}
  };
}
