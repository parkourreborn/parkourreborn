import 'server-only';

import { limits } from '@/lib/reborn-ai/limits';
import { swrCache } from '@/lib/server/swr';
import type { ComboCategory, WasansTrial } from '@/lib/wasans-data';

// Client for the public Wasans API (https://wasans.tully.sh/v2/). Routes and
// shapes come from github.com/parkourreborn/wasans (src/app/v2). Every call is
// cached: Wasans itself caches 60 to 300 seconds and allows 300 requests a
// minute per route, so there is no point asking more often than that.

const base = 'https://wasans.tully.sh/v2/';
const cache = swrCache<unknown>({ freshMs: 60_000, maxStaleMs: 30 * 60_000, maxEntries: 400 });

type Envelope<T> = { data?: T; meta?: { total?: number; count?: number } };

export class WasansError extends Error {}

async function request<T>(path: string, freshSeconds = 60): Promise<{ data: T; total?: number }> {
  const response = await fetch(`${base}${path}`, {
    signal: AbortSignal.timeout(limits.toolTimeoutMs),
    next: { revalidate: freshSeconds },
  } as RequestInit);
  if (!response.ok) throw new WasansError(`wasans ${path.split('?')[0]} responded ${response.status}`);
  const body = await response.json() as Envelope<T>;
  if (body.data === undefined) throw new WasansError(`wasans ${path.split('?')[0]} returned no data`);
  return { data: body.data, total: body.meta?.total ?? body.meta?.count };
}

async function cached<T>(path: string, freshSeconds = 60) {
  const { value, at } = await cache.get(path, () => request<T>(path, freshSeconds));
  return { ...(value as { data: T; total?: number }), checkedAt: new Date(at).toISOString() };
}

const trialPath = (trial: string) => encodeURIComponent(trial);

export type WasansRecord = {
  trial_name: string;
  submission_uuid?: string;
  player_uuid?: string;
  player_name?: string;
  time: number;
  date?: number;
  player_score?: number;
  moderator_username?: string;
};

export type WasansRun = WasansRecord & { uuid?: string; state?: string; video_status?: string };

export type WasansLeaderRow = {
  player_uuid: string;
  player_name: string;
  time: number;
  submission_uuid?: string;
  date?: number;
  rank: number;
  score?: number;
  is_world_record?: boolean;
};

export type WasansPlayer = {
  uuid: string;
  player_name: string;
  discord_id?: string;
  score?: number;
  rank?: number;
  position?: number;
  date_joined?: number;
  pbs?: { trial_name: string; time: number; submission_uuid?: string; date?: number; rank?: number; holders?: number; old_version?: number }[];
  combo_pbs?: { category?: string; combo_count?: number; rank?: number; date?: number }[];
  recent_submissions?: WasansRun[];
};

export type WasansPlayerAnalytics = {
  player_found?: boolean;
  trial_distributions?: { trial_name: string; player_score: number; mean: number; stddev: number; sample_size: number; percentile: number }[];
  score_history?: { score: number; recorded_at: number }[];
  rank_history?: { rank: number; score: number; snapshot_date: string }[];
  last_pb_at?: number;
  peak_rank?: { rank: number; date: string };
};

export type WasansTrialStats = {
  trial_name: string;
  wr_history?: WasansRun[];
  monthly?: { t: number; runs: number; best: number; median: number; players: number }[];
  volume?: Record<string, unknown>;
  top_grinders?: { player_uuid: string; player_name: string; runs: number; best: number }[];
  grind?: Record<string, unknown>;
};

export type WasansSiteStats = {
  range: string;
  trials?: { trial_name: string; status: string; wr?: { time: number; player_name: string; date: number }; wr_changes?: number; wr_holders?: number; submitted?: number; approved?: number; pbs_set?: number; new_players?: number }[];
  activity?: { totals?: Record<string, number>; previous?: Record<string, number> };
  players?: {
    with_pb?: number;
    counted_trials?: number;
    improvers?: { player_name: string; score_change: number }[];
    wr_holders?: { player_name: string; count: number }[];
    churn?: { from: string; to: string; climbers?: { player_name: string; from: number; to: number }[] };
  };
};

export const wasans = {
  worldRecords: () => cached<WasansRecord[]>('records/world'),
  wrHistory: (trial: WasansTrial) => cached<WasansRun[]>(`records/world/history/${trialPath(trial)}`),
  trials: () => cached<{ name: string; sort_order: number; status: string }[]>('trials', 300),
  trialLeaderboard: (trial: WasansTrial, limit: number, player?: string) => cached<{ wr?: { time: number }; results: WasansLeaderRow[]; player?: WasansLeaderRow | null }>(
    `leaderboards/trials/${trialPath(trial)}?page=1&limit=${Math.min(200, Math.max(1, limit))}${player ? `&player=${encodeURIComponent(player)}` : ''}`,
  ),
  overall: (limit: number) => cached<{ player_uuid: string; player_name: string; overall_score: number }[]>(
    `leaderboards/overall?page=1&limit=${Math.min(200, Math.max(1, limit))}`,
  ),
  comboCategories: () => cached<{ slug: string; label: string; status: string }[]>('combo-categories', 300),
  comboLeaderboard: (category: ComboCategory, limit: number) => cached<{ results: { player_uuid: string; player_name: string; combo_count: number; date?: number; rank?: number }[] }>(
    `leaderboards/combos/${category}?page=1&limit=${Math.min(500, Math.max(1, limit))}`,
  ),
  player: (uuid: string) => cached<{ player: WasansPlayer | null }>(
    `players/${encodeURIComponent(uuid)}?include=pbs,combo_pbs,recent_submissions&submissions_limit=5`,
  ),
  playerAnalytics: (uuid: string) => cached<WasansPlayerAnalytics>(`players/${encodeURIComponent(uuid)}/analytics`, 120),
  trialStats: (trial: WasansTrial, range: string) => cached<WasansTrialStats>(`analytics/trials/${trialPath(trial)}?range=${range}`, 300),
  siteStats: (range: string) => cached<WasansSiteStats>(`analytics?range=${range}`, 300),
  recentRuns: (options: { player?: string; trial?: string; limit: number }) => cached<WasansRun[]>(
    `submissions?state=approved&order=desc&page=1&limit=${Math.min(100, Math.max(1, options.limit))}`
      + `${options.player ? `&player_uuid=${encodeURIComponent(options.player)}` : ''}`
      + `${options.trial ? `&trial_search=${encodeURIComponent(options.trial.toLowerCase())}` : ''}`,
  ),
  announcements: () => cached<{ body: string; link_url?: string | null; created_at?: number; created_by_name?: string }[]>('announcements', 300),
};

type IndexedPlayer = { uuid: string; name: string; discordId: string; score: number; rank: number };

// Every player Wasans knows (a few hundred), for turning a name or a Discord
// id into a player. Two pages of 200 cover today's list with room to grow.
export async function playerIndex(): Promise<IndexedPlayer[]> {
  const pages = await Promise.all([1, 2, 3].map((page) => cached<WasansPlayer[]>(`players?page=${page}&limit=200`, 300).catch(() => null)));
  const seen = new Set<string>();
  const players: IndexedPlayer[] = [];
  for (const page of pages) {
    for (const player of page?.data ?? []) {
      if (!player.uuid || seen.has(player.uuid)) continue;
      seen.add(player.uuid);
      players.push({
        uuid: player.uuid,
        name: player.player_name,
        discordId: player.discord_id ?? '',
        score: player.score ?? 0,
        rank: player.rank ?? player.position ?? 0,
      });
    }
  }
  return players;
}

export async function findPlayer(name: string) {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return null;
  const players = await playerIndex();
  return players.find((player) => player.name.toLowerCase() === wanted)
    ?? players.find((player) => player.name.toLowerCase().replace(/[^a-z0-9]/g, '') === wanted.replace(/[^a-z0-9]/g, ''))
    ?? null;
}

export async function playerByDiscord(discordId: string) {
  if (!discordId) return null;
  return (await playerIndex()).find((player) => player.discordId === discordId) ?? null;
}

// Raw world records in the shape /api/wrs has always returned.
export async function worldRecordsRaw() {
  const { data, checkedAt } = await wasans.worldRecords();
  return { raw: { data }, checkedAt };
}
