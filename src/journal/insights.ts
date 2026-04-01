/**
 * Life Journal Insights — metrics, reflection prompts, anomaly detection, privacy guard.
 * Complements analyzer.ts with analytical and privacy-aware features.
 */

import type { Mood, JournalEntry } from './analyzer.js';
import { listEntries, getMoodHistory } from './analyzer.js';

// ─── LifeMetrics ────────────────────────────────────────────────────────────

export interface LifeMetrics {
  wellbeing: number;       // 0-100 composite
  consistency: number;     // journaling frequency score
  positivity: number;      // mood distribution skew
  gratitude: number;       // gratitude practice frequency
  selfAwareness: number;   // tag diversity / reflection depth
  trend: 'improving' | 'stable' | 'declining';
}

export async function computeLifeMetrics(
  db: D1Database, userId: string,
): Promise<LifeMetrics> {
  const entries = await listEntries(db, userId, { limit: 90 });
  if (entries.length === 0) {
    return { wellbeing: 50, consistency: 0, positivity: 50, gratitude: 0, selfAwareness: 0, trend: 'stable' };
  }

  // Consistency: how many of the last 30 days have entries (max 100)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentEntries = entries.filter(e => new Date(e.date) >= thirtyDaysAgo);
  const uniqueDays = new Set(recentEntries.map(e => e.date)).size;
  const consistency = Math.min(100, Math.round(uniqueDays / 30 * 100));

  // Positivity: average mood normalized to 0-100
  const avgMood = entries.reduce((s, e) => s + e.mood, 0) / entries.length;
  const positivity = Math.round((avgMood - 1) / 4 * 100);

  // Gratitude: fraction of entries with gratitude items
  const entriesWithGratitude = entries.filter(e => e.gratitude.length > 0).length;
  const gratitude = Math.round(entriesWithGratitude / entries.length * 100);

  // Self-awareness: tag diversity
  const uniqueTags = new Set(entries.flatMap(e => e.tags));
  const selfAwareness = Math.min(100, uniqueTags.size * 10);

  // Wellbeing: weighted composite
  const wellbeing = Math.round(
    positivity * 0.35 + consistency * 0.25 + gratitude * 0.2 + selfAwareness * 0.2,
  );

  // Trend: compare first half vs second half mood
  let trend: LifeMetrics['trend'] = 'stable';
  if (entries.length >= 6) {
    const mid = Math.floor(entries.length / 2);
    const older = entries.slice(mid).reduce((s, e) => s + e.mood, 0) / (entries.length - mid);
    const newer = entries.slice(0, mid).reduce((s, e) => s + e.mood, 0) / mid;
    if (newer - older > 0.3) trend = 'improving';
    else if (older - newer > 0.3) trend = 'declining';
  }

  return { wellbeing, consistency, positivity, gratitude, selfAwareness, trend };
}

// ─── ReflectionPrompts ──────────────────────────────────────────────────────

const PROMPT_POOL = [
  'What made you smile today?',
  'What challenged you this week, and what did you learn?',
  'Describe a moment of peace you experienced recently.',
  'What are three things you are grateful for right now?',
  'How did you show kindness to yourself today?',
  'What is something you are looking forward to?',
  'Describe a conversation that left an impression on you.',
  'What habit would you like to build or break?',
  'What does a perfect day look like for you?',
  'Write about someone who has influenced your life positively.',
  'What is one thing you would do differently if you could relive today?',
  'What brings you energy and what drains it?',
  'Describe your ideal morning routine.',
  'What is a fear you would like to overcome?',
  'Write a letter to your future self.',
];

export function getReflectionPrompt(): string {
  return PROMPT_POOL[Math.floor(Math.random() * PROMPT_POOL.length)];
}

export function getPromptForMood(mood: Mood): string {
  if (mood <= 2) return 'It sounds like things are tough. What would make tomorrow a little better?';
  if (mood === 3) return 'A neutral day can be grounding. What is one small win from today?';
  if (mood === 4) return 'Great to hear you are doing well! What contributed to that?';
  return 'Wonderful! What is the highlight of your day?';
}

// ─── AnomalyDetector ────────────────────────────────────────────────────────

export interface Anomaly {
  date: string;
  type: 'mood_spike' | 'mood_drop' | 'unusual_tags' | 'gap';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export async function detectAnomalies(
  db: D1Database, userId: string,
): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];
  const entries = await listEntries(db, userId, { limit: 60 });
  if (entries.length < 5) return anomalies;

  const avgMood = entries.reduce((s, e) => s + e.mood, 0) / entries.length;
  const stdDev = Math.sqrt(
    entries.reduce((s, e) => s + (e.mood - avgMood) ** 2, 0) / entries.length,
  );

  // Mood spikes / drops (>2 std dev from mean)
  for (const e of entries) {
    const deviation = Math.abs(e.mood - avgMood);
    if (deviation > stdDev * 2) {
      anomalies.push({
        date: e.date,
        type: e.mood > avgMood ? 'mood_spike' : 'mood_drop',
        severity: deviation > stdDev * 2.5 ? 'high' : 'medium',
        description: e.mood > avgMood
          ? `Unusually high mood (${e.mood}/5) on ${e.date}`
          : `Unusually low mood (${e.mood}/5) on ${e.date}`,
      });
    }
  }

  // Gaps in journaling (>5 days between entries)
  const sorted = entries.map(e => e.date).sort();
  for (let i = 1; i < sorted.length; i++) {
    const gapDays = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / (1000 * 60 * 60 * 24);
    if (gapDays > 5) {
      anomalies.push({
        date: sorted[i - 1],
        type: 'gap',
        severity: gapDays > 14 ? 'high' : gapDays > 8 ? 'medium' : 'low',
        description: `${Math.round(gapDays)}-day gap in journaling after ${sorted[i - 1]}`,
      });
    }
  }

  return anomalies.slice(0, 10);
}

// ─── PrivacyGuard ───────────────────────────────────────────────────────────

export interface PrivacySettings {
  encryptJournal: boolean;       // client-side encrypt body field
  shareMoodData: boolean;        // allow anonymized mood aggregation
  retentionDays: number;         // auto-delete entries after N days (0 = never)
  redactPII: boolean;            // auto-redact PII in entries
}

const DEFAULT_PRIVACY: PrivacySettings = {
  encryptJournal: true,
  shareMoodData: false,
  retentionDays: 0,
  redactPII: true,
};

export async function getPrivacySettings(db: D1Database, userId: string): Promise<PrivacySettings> {
  const row = await db.prepare(
    `SELECT value FROM user_preferences WHERE user_id = ? AND key = 'journal_privacy'`,
  ).bind(userId).first<{ value: string }>();
  if (!row) return { ...DEFAULT_PRIVACY };
  try { return { ...DEFAULT_PRIVACY, ...JSON.parse(row.value) }; } catch { return { ...DEFAULT_PRIVACY }; }
}

export async function savePrivacySettings(
  db: D1Database, userId: string, settings: Partial<PrivacySettings>,
): Promise<void> {
  const current = await getPrivacySettings(db, userId);
  const merged = { ...current, ...settings };
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO user_preferences (user_id, key, value, updated_at)
     VALUES (?, 'journal_privacy', ?, ?)
     ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).bind(userId, JSON.stringify(merged), now).run();
}

/**
 * Purge entries older than the user's retention period.
 * Returns number of deleted entries.
 */
export async function enforceRetention(
  db: D1Database, userId: string,
): Promise<number> {
  const settings = await getPrivacySettings(db, userId);
  if (settings.retentionDays === 0) return 0;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - settings.retentionDays);
  const result = await db.prepare(
    `DELETE FROM journal_entries WHERE user_id = ? AND date < ?`,
  ).bind(userId, cutoff.toISOString().slice(0, 10)).run();
  return result.meta.changes;
}
