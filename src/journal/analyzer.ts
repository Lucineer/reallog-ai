/**
 * Life Journal Analyzer — core journaling engine.
 * JournalEntry CRUD, MoodTracker, PatternFinder, YearInReview, GratitudeTracker.
 * All data lives in D1; sensitive fields are encrypted client-side before storage.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type Mood = 1 | 2 | 3 | 4 | 5;

export interface JournalEntry {
  id: string;
  userId: string;
  date: string;          // YYYY-MM-DD
  title: string;
  body: string;          // client-encrypted
  mood: Mood;
  tags: string[];
  gratitude: string[];   // things the user is grateful for
  createdAt: string;
  updatedAt: string;
}

export interface MoodSummary {
  date: string;
  avgMood: number;
  count: number;
}

export interface Pattern {
  type: 'mood_trend' | 'tag_cluster' | 'gratitude_theme' | 'streak' | 'anomaly';
  label: string;
  description: string;
  confidence: number;
  data: Record<string, unknown>;
}

export interface YearInReviewData {
  year: number;
  totalEntries: number;
  avgMood: number;
  topTags: string[];
  topGratitudeThemes: string[];
  longestStreak: number;
  moodByMonth: MoodSummary[];
  highlights: string[];
}

// ─── JournalEntry helpers ───────────────────────────────────────────────────

export async function createEntry(
  db: D1Database,
  entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<JournalEntry> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO journal_entries (id, user_id, date, title, body, mood, tags, gratitude, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, entry.userId, entry.date, entry.title, entry.body,
    entry.mood, JSON.stringify(entry.tags), JSON.stringify(entry.gratitude), now, now,
  ).run();

  return { ...entry, id, createdAt: now, updatedAt: now };
}

export async function getEntry(db: D1Database, id: string, userId: string): Promise<JournalEntry | null> {
  const row = await db.prepare(
    `SELECT * FROM journal_entries WHERE id = ? AND user_id = ?`,
  ).bind(id, userId).first<{
    id: string; user_id: string; date: string; title: string; body: string;
    mood: Mood; tags: string; gratitude: string; created_at: string; updated_at: string;
  }>();
  if (!row) return null;
  return {
    id: row.id, userId: row.user_id, date: row.date, title: row.title, body: row.body,
    mood: row.mood, tags: JSON.parse(row.tags || '[]'), gratitude: JSON.parse(row.gratitude || '[]'),
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export async function listEntries(
  db: D1Database, userId: string, opts: { limit?: number; offset?: number; from?: string; to?: string } = {},
): Promise<JournalEntry[]> {
  const { limit = 30, offset = 0, from, to } = opts;
  let sql = `SELECT * FROM journal_entries WHERE user_id = ?`;
  const params: unknown[] = [userId];
  if (from) { sql += ` AND date >= ?`; params.push(from); }
  if (to) { sql += ` AND date <= ?`; params.push(to); }
  sql += ` ORDER BY date DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const rows = await db.prepare(sql).bind(...params).all<{
    id: string; user_id: string; date: string; title: string; body: string;
    mood: Mood; tags: string; gratitude: string; created_at: string; updated_at: string;
  }>();

  return (rows.results ?? []).map(r => ({
    id: r.id, userId: r.user_id, date: r.date, title: r.title, body: r.body,
    mood: r.mood, tags: JSON.parse(r.tags || '[]'), gratitude: JSON.parse(r.gratitude || '[]'),
    createdAt: r.created_at, updatedAt: r.updated_at,
  }));
}

export async function updateEntry(
  db: D1Database, id: string, userId: string, patch: Partial<Pick<JournalEntry, 'title' | 'body' | 'mood' | 'tags' | 'gratitude'>>,
): Promise<boolean> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.title !== undefined) { sets.push('title = ?'); params.push(patch.title); }
  if (patch.body !== undefined) { sets.push('body = ?'); params.push(patch.body); }
  if (patch.mood !== undefined) { sets.push('mood = ?'); params.push(patch.mood); }
  if (patch.tags !== undefined) { sets.push('tags = ?'); params.push(JSON.stringify(patch.tags)); }
  if (patch.gratitude !== undefined) { sets.push('gratitude = ?'); params.push(JSON.stringify(patch.gratitude)); }
  if (sets.length === 0) return false;

  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id, userId);

  const result = await db.prepare(
    `UPDATE journal_entries SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`,
  ).bind(...params).run();
  return result.meta.changes > 0;
}

export async function deleteEntry(db: D1Database, id: string, userId: string): Promise<boolean> {
  const result = await db.prepare(
    `DELETE FROM journal_entries WHERE id = ? AND user_id = ?`,
  ).bind(id, userId).run();
  return result.meta.changes > 0;
}

// ─── MoodTracker ────────────────────────────────────────────────────────────

export async function getMoodHistory(
  db: D1Database, userId: string, days = 30,
): Promise<MoodSummary[]> {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const rows = await db.prepare(
    `SELECT date, AVG(mood) as avg_mood, COUNT(*) as count
     FROM journal_entries
     WHERE user_id = ? AND date >= ?
     GROUP BY date ORDER BY date`,
  ).bind(userId, from.toISOString().slice(0, 10)).all<{ date: string; avg_mood: number; count: number }>();

  return (rows.results ?? []).map(r => ({
    date: r.date,
    avgMood: Math.round(r.avg_mood * 10) / 10,
    count: r.count,
  }));
}

export async function getMoodAverage(
  db: D1Database, userId: string, from?: string, to?: string,
): Promise<{ avg: number; count: number }> {
  let sql = `SELECT AVG(mood) as avg, COUNT(*) as count FROM journal_entries WHERE user_id = ?`;
  const params: unknown[] = [userId];
  if (from) { sql += ` AND date >= ?`; params.push(from); }
  if (to) { sql += ` AND date <= ?`; params.push(to); }

  const row = await db.prepare(sql).bind(...params).first<{ avg: number | null; count: number }>();
  return { avg: row?.avg ?? 0, count: row?.count ?? 0 };
}

// ─── PatternFinder ──────────────────────────────────────────────────────────

export async function findPatterns(db: D1Database, userId: string): Promise<Pattern[]> {
  const patterns: Pattern[] = [];
  const entries = await listEntries(db, userId, { limit: 90 });

  if (entries.length < 3) return patterns;

  // 1. Mood trend over last 30 days
  const recent = entries.filter(e => {
    const d = new Date(e.date);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return d >= cutoff;
  });
  if (recent.length >= 5) {
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));
    const avgFirst = firstHalf.reduce((s, e) => s + e.mood, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, e) => s + e.mood, 0) / secondHalf.length;
    const diff = avgSecond - avgFirst;
    if (Math.abs(diff) >= 0.5) {
      patterns.push({
        type: 'mood_trend',
        label: diff > 0 ? 'Mood improving' : 'Mood declining',
        description: `Your mood has ${diff > 0 ? 'improved' : 'declined'} by ${Math.abs(diff).toFixed(1)} points over the past 30 days.`,
        confidence: Math.min(1, Math.abs(diff) / 2),
        data: { diff, avgFirst, avgSecond },
      });
    }
  }

  // 2. Tag frequency clusters
  const tagCounts: Record<string, number> = {};
  for (const e of entries) {
    for (const tag of e.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (topTags.length > 0) {
    patterns.push({
      type: 'tag_cluster',
      label: 'Recurring themes',
      description: `Most frequent tags: ${topTags.map(([t, c]) => `${t} (${c})`).join(', ')}`,
      confidence: 0.7,
      data: { tags: topTags },
    });
  }

  // 3. Gratitude themes
  const gratitudeWords: Record<string, number> = {};
  for (const e of entries) {
    for (const g of e.gratitude) {
      const words = g.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      for (const w of words) gratitudeWords[w] = (gratitudeWords[w] || 0) + 1;
    }
  }
  const topGratitude = Object.entries(gratitudeWords).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (topGratitude.length > 0) {
    patterns.push({
      type: 'gratitude_theme',
      label: 'Gratitude themes',
      description: `You frequently express gratitude about: ${topGratitude.map(([w]) => w).join(', ')}`,
      confidence: 0.6,
      data: { themes: topGratitude },
    });
  }

  // 4. Journaling streak
  const sortedDates = entries.map(e => e.date).sort().reverse();
  let streak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 1.5) streak++;
    else break;
  }
  if (streak >= 3) {
    patterns.push({
      type: 'streak',
      label: `${streak}-day journaling streak`,
      description: `You've been journaling consistently for ${streak} days in a row.`,
      confidence: 1,
      data: { streak },
    });
  }

  return patterns;
}

// ─── GratitudeTracker ───────────────────────────────────────────────────────

export async function getGratitudeLog(
  db: D1Database, userId: string, limit = 30,
): Promise<Array<{ date: string; items: string[] }>> {
  const rows = await db.prepare(
    `SELECT date, gratitude FROM journal_entries
     WHERE user_id = ? AND gratitude != '[]'
     ORDER BY date DESC LIMIT ?`,
  ).bind(userId, limit).all<{ date: string; gratitude: string }>();

  return (rows.results ?? []).map(r => ({
    date: r.date,
    items: JSON.parse(r.gratitude || '[]'),
  }));
}

export async function getGratitudeStats(
  db: D1Database, userId: string,
): Promise<{ totalDays: number; totalItems: number; avgPerDay: number }> {
  const row = await db.prepare(
    `SELECT COUNT(*) as total_days, SUM(json_array_length(gratitude)) as total_items
     FROM journal_entries WHERE user_id = ? AND gratitude != '[]'`,
  ).bind(userId).first<{ total_days: number; total_items: number | null }>();

  const totalDays = row?.total_days ?? 0;
  const totalItems = row?.total_items ?? 0;
  return { totalDays, totalItems, avgPerDay: totalDays > 0 ? Math.round(totalItems / totalDays * 10) / 10 : 0 };
}

// ─── YearInReview ───────────────────────────────────────────────────────────

export async function generateYearInReview(
  db: D1Database, userId: string, year: number,
): Promise<YearInReviewData> {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const entries = await listEntries(db, userId, { limit: 500, from, to });
  const totalEntries = entries.length;

  if (totalEntries === 0) {
    return { year, totalEntries: 0, avgMood: 0, topTags: [], topGratitudeThemes: [], longestStreak: 0, moodByMonth: [], highlights: [] };
  }

  const avgMood = Math.round(entries.reduce((s, e) => s + e.mood, 0) / totalEntries * 10) / 10;

  // Top tags
  const tagCounts: Record<string, number> = {};
  for (const e of entries) for (const t of e.tags) tagCounts[t] = (tagCounts[t] || 0) + 1;
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t);

  // Gratitude themes
  const gWords: Record<string, number> = {};
  for (const e of entries) for (const g of e.gratitude) {
    for (const w of g.toLowerCase().split(/\s+/).filter(w => w.length > 4)) gWords[w] = (gWords[w] || 0) + 1;
  }
  const topGratitudeThemes = Object.entries(gWords).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w);

  // Longest streak
  const sorted = entries.map(e => e.date).sort();
  let longestStreak = 1;
  let currentStreak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diffDays = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 1.5) { currentStreak++; longestStreak = Math.max(longestStreak, currentStreak); }
    else currentStreak = 1;
  }

  // Mood by month
  const monthMap: Record<string, { sum: number; count: number }> = {};
  for (const e of entries) {
    const m = e.date.slice(0, 7); // YYYY-MM
    if (!monthMap[m]) monthMap[m] = { sum: 0, count: 0 };
    monthMap[m].sum += e.mood;
    monthMap[m].count++;
  }
  const moodByMonth = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({
    date, avgMood: Math.round(v.sum / v.count * 10) / 10, count: v.count,
  }));

  // Highlights — entries with highest mood
  const highlights = entries
    .filter(e => e.mood >= 4)
    .sort((a, b) => b.mood - a.mood)
    .slice(0, 5)
    .map(e => `${e.date}: ${e.title}`);

  return { year, totalEntries, avgMood, topTags, topGratitudeThemes, longestStreak, moodByMonth, highlights };
}
