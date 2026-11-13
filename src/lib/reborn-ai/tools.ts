import 'server-only';

import { z } from 'zod';
import { searchTechs } from '@/lib/pages/techlist';
import { formatTime } from '@/lib/pages/time';
import { wrVideoURL } from '@/lib/pages/timetrials';
import { scoreForTime, tierInfo, timeGaps, timeNeededForScore, xpProgress } from '@/lib/reborn-ai/calculators';
import { focusVersions, matchRecipes } from '@/lib/reborn-ai/kb-search';
import { knowledge } from '@/lib/reborn-ai/knowledge-retriever';
import { limits } from '@/lib/reborn-ai/limits';
import type { ToolName } from '@/lib/reborn-ai/planner';
import { recipeBlock } from '@/lib/reborn-ai/recipes';
import type { AssistantBlock } from '@/lib/reborn-ai/types';
import { loadCommunityResources, loadTechs, loadTimeTrials } from '@/lib/server/reborn-ai-data';
import { findPlayer, playerByDiscord, wasans } from '@/lib/server/wasans';
import type { WasansRecord } from '@/lib/server/wasans';
import { cleanPathPart } from '@/lib/url';
import { comboCategories, isWasansTrial, tierForScore, wasansBronze, wasansPlatinum, wasansTrials } from '@/lib/wasans-data';
import type { WasansTrial } from '@/lib/wasans-data';

export type Viewer = { discordId: string; name: string } | null;

const count = z.number().int().min(1).max(limits.maxToolResultItems).optional();
const bigCount = z.number().int().min(1).max(200).optional();
const term = z.string().trim().min(1).max(80);
const trialName = z.string().refine((value): value is WasansTrial => isWasansTrial(value), 'unknown trial');
const playerName = z.string().trim().min(1).max(64);
const range = z.enum(['7d', '30d', '90d', '1y', 'all']).optional();

const schemas = {
  search_knowledge: z.object({ query: term, limit: count }),
  search_techs: z.object({ query: term, kind: z.enum(['tech', 'concept', 'basic']).optional(), exact: z.boolean().optional(), limit: count }),
  get_time_trials: z.object({ query: term.optional(), district: term.optional(), limit: count }),
  get_world_records: z.object({ trial: trialName.optional(), query: term.optional(), limit: count, summary: z.boolean().optional() }),
  get_wr_history: z.object({ trial: trialName }),
  get_trial_leaderboard: z.object({ trial: trialName, limit: bigCount, player: playerName.optional() }),
  get_overall_leaderboard: z.object({ limit: bigCount, player: playerName.optional() }),
  get_combo_leaderboard: z.object({ category: z.enum(comboCategories).optional(), limit: count }),
  get_player: z.object({ player: playerName }),
  get_player_analytics: z.object({ player: playerName }),
  get_trial_stats: z.object({ trial: trialName, range }),
  get_site_stats: z.object({ range }),
  get_recent_runs: z.object({ player: playerName.optional(), trial: trialName.optional(), limit: count }),
  get_wasans_announcements: z.object({}),
  wasans_score: z.object({ trial: trialName, time: z.number().positive().max(600) }),
  time_for_score: z.object({ trial: trialName, score: z.number().min(0).max(1) }),
  tier_for_score: z.object({ score: z.number().min(0).max(1) }),
  time_gaps: z.object({ trial: trialName, time: z.number().positive().max(600).optional() }),
  xp_progress: z.object({
    level: z.number().int().min(1).max(999).optional(),
    target: z.number().int().min(1).max(999).optional(),
    percent: z.number().min(0).max(100).optional(),
    multiplier: z.number().min(0).max(100).optional(),
    vip: z.boolean().optional(),
  }),
  search_community: z.object({ query: term.optional(), type: z.enum(['gif', 'file', 'link']).optional(), limit: count }),
} satisfies Record<ToolName, z.ZodType>;

const key = (value: string) => value.trim().toLowerCase();
const phrase = (value: string) => key(value).replace(/[^a-z0-9]+/g, ' ').trim();
const mentions = (query: string, name: string) => Boolean(phrase(name) && ` ${phrase(query)} `.includes(` ${phrase(name)} `));
const words = (value: string) => key(value).split(/[^a-z0-9]+/).filter((word) => word.length > 2);
const queryNoise = new Set(['about', 'does', 'from', 'have', 'help', 'what', 'when', 'where', 'which', 'with', 'work', 'works']);

function score(value: string, search: string) {
  const hay = key(value);
  if (!hay) return 0;
  if (hay.includes(key(search))) return 100;
  return words(search).filter((word) => hay.includes(word)).length;
}

const shuffle = <T>(items: T[]) => items
  .map((item) => ({ item, order: Math.random() }))
  .sort((a, b) => a.order - b.order)
  .map((entry) => entry.item);

function bestMatches<T>(scored: { item: T; hit: number }[]) {
  const best = Math.max(...scored.map((entry) => entry.hit));
  return scored.filter((entry) => entry.hit === best).map((entry) => entry.item);
}

const day = (unix?: number) => (unix ? new Date(unix * 1000).toISOString().slice(0, 10) : null);
const daysSince = (unix?: number) => (unix ? Math.max(0, Math.floor((Date.now() / 1000 - unix) / 86400)) : null);
const time3 = (value: number) => value.toFixed(3);
const score3 = (value?: number | null) => (typeof value === 'number' ? value.toFixed(3) : null);
const submissionUrl = (id?: string) => (cleanPathPart(id ?? '') ? `https://wasans.tully.sh/submissions/${cleanPathPart(id ?? '')}` : '');
const playerUrl = (uuid: string) => `https://wasans.tully.sh/players/${encodeURIComponent(uuid)}`;

const trialPlaces = new Map(knowledge.trials.map((trial) => [key(trial.name), trial]));

// Our Firestore medal times and Wasans' own constants should agree, or the AI
// would quote one set of numbers and Wasans would score with another.
let medalDriftChecked = false;
function checkMedalDrift(trials: { name: string; bronzeTime: string; platinumTime: string }[]) {
  if (medalDriftChecked) return;
  medalDriftChecked = true;
  const drift = trials.flatMap((trial) => {
    if (!isWasansTrial(trial.name)) return [];
    const issues = [];
    if (Number(trial.platinumTime) && Number(trial.platinumTime) !== wasansPlatinum[trial.name]) issues.push(`${trial.name} platinum ${trial.platinumTime} vs wasans ${wasansPlatinum[trial.name]}`);
    if (Number(trial.bronzeTime) && Number(trial.bronzeTime) !== wasansBronze[trial.name]) issues.push(`${trial.name} bronze ${trial.bronzeTime} vs wasans ${wasansBronze[trial.name]}`);
    return issues;
  });
  if (drift.length) console.warn('reborn-ai medal times differ between Firestore and Wasans', { drift });
}

type Resolved = { ok: true; uuid: string; name: string } | { ok: false; note: string };

export function createToolkit(viewer: Viewer = null) {
  const autoBlocks: AssistantBlock[] = [];
  const sourceTimes = new Map<string, string>();
  const suggest = (blocks: AssistantBlock[]) => {
    const room = limits.maxAutoBlocks - autoBlocks.length;
    if (room > 0) autoBlocks.push(...blocks.slice(0, room));
  };
  const seen = (name: string, checkedAt: string) => {
    if (!sourceTimes.has(name)) sourceTimes.set(name, checkedAt);
  };

  const getTechs = () => loadTechs().then((loaded) => {
    seen('search_techs', loaded.checkedAt);
    return loaded.data;
  });
  const getTrials = () => loadTimeTrials().then((loaded) => {
    seen('get_time_trials', loaded.checkedAt);
    checkMedalDrift(loaded.data);
    return loaded.data;
  });
  const getResources = () => loadCommunityResources().then((loaded) => {
    seen('search_community', loaded.checkedAt);
    return loaded.data;
  });

  let records: Promise<WasansRecord[]> | null = null;
  const getRecords = (tool: string) => {
    records ??= wasans.worldRecords().then((loaded) => {
      seen('wasans', loaded.checkedAt);
      return loaded.data.filter((record) => record.trial_name && typeof record.time === 'number');
    });
    return records.then((list) => {
      sourceTimes.set(tool, sourceTimes.get('wasans') ?? new Date().toISOString());
      return list;
    });
  };
  const recordFor = async (trial: WasansTrial, tool: string) => (await getRecords(tool)).find((record) => record.trial_name === trial) ?? null;

  async function resolvePlayer(who: string): Promise<Resolved> {
    if (who === 'me') {
      if (!viewer) return { ok: false, note: 'The asker is not logged in on Parkour Reborn Hub, so their Wasans profile is unknown. They can log in with Discord or say their Wasans name.' };
      const linked = await playerByDiscord(viewer.discordId);
      return linked
        ? { ok: true, uuid: linked.uuid, name: linked.name }
        : { ok: false, note: `No Wasans player is linked to the asker's Discord account (${viewer.name || 'logged in'}). They may not have submitted a run yet, or can say their Wasans name.` };
    }
    const found = await findPlayer(who);
    return found ? { ok: true, uuid: found.uuid, name: found.name } : { ok: false, note: `No Wasans player is named "${who}".` };
  }

  function suggestRecipes(query: string) {
    const recipes = matchRecipes(query, knowledge.recipes);
    if (recipes.length) suggest(recipes.map(recipeBlock));
  }

  async function runKnowledge(args: z.infer<typeof schemas.search_knowledge>) {
    const found = knowledge.search(args.query, args.limit ?? limits.maxKnowledgeDocs);
    const results: { id: string; title: string; section: string; category: string; body: string }[] = [];
    let left = limits.maxKnowledgeChars;

    for (const { chunk } of found) {
      if (left <= 0) break;
      const text = focusVersions(chunk.text, args.query);
      const body = text.length > left ? `${text.slice(0, left)}...` : text;
      left -= body.length;
      results.push({ id: chunk.id, title: chunk.title, section: chunk.section, category: chunk.category, body });
    }
    if (results.some((result) => result.category === 'crafting')) suggestRecipes(args.query);
    return results;
  }

  async function runTechs(args: z.infer<typeof schemas.search_techs>) {
    const entries = await getTechs();
    let results = args.exact
      ? searchTechs(entries, '', args.kind ?? 'all').filter(({ entry }) => [entry.name, ...entry.aliases].some((name) => mentions(args.query, name)))
      : searchTechs(entries, args.query, args.kind ?? 'all');
    if (!results.length && !args.exact) {
      const unique = new Set<string>();
      results = words(args.query)
        .filter((word) => !queryNoise.has(word))
        .flatMap((word) => searchTechs(entries, word, args.kind ?? 'all'))
        .filter(({ entry }) => {
          if (unique.has(entry.name)) return false;
          unique.add(entry.name);
          return true;
        });
    }
    const mentioned = results.filter(({ entry }) => [entry.name, ...entry.aliases].some((name) => mentions(args.query, name)));
    if (mentioned.length) results = mentioned;
    const found = results.slice(0, args.limit ?? 5).map(({ entry }) => entry);
    suggest(found.map((entry) => ({
      type: 'tech',
      name: entry.name,
      kind: entry.kind,
      aliases: entry.aliases,
      steps: entry.steps,
      videoUrl: entry.videoUrl,
      tutorialUrl: entry.tutorialUrl,
    })));
    return found;
  }

  async function runTrials(args: z.infer<typeof schemas.get_time_trials>) {
    const trials = await getTrials();
    let found = trials
      .map((trial) => ({
        trial,
        hit: (args.query ? score(trial.name, args.query) : 0) + (args.district ? score(trial.district, args.district) : 0),
      }))
      .filter(({ trial }) => (args.query ? score(trial.name, args.query) > 0 : true))
      .filter(({ trial }) => (args.district ? score(trial.district, args.district) > 0 : true))
      .sort((a, b) => b.hit - a.hit)
      .map(({ trial }) => trial)
      .slice(0, args.limit ?? 6);
    const mentioned = args.query ? found.filter((trial) => key(args.query as string).includes(key(trial.name))) : [];
    if (mentioned.length) found = mentioned;

    const results = found.map((trial) => ({
      name: trial.name,
      district: trial.district,
      difficulty: trial.difficulty,
      location: trialPlaces.get(key(trial.name))?.location ?? '',
      bronze: formatTime(trial.bronzeTime),
      silver: formatTime(trial.silverTime),
      gold: formatTime(trial.goldTime),
      platinum: formatTime(trial.platinumTime),
      videoUrl: trial.videoURL,
      videoUrl2: trial.videoURL2,
    }));
    suggest(results.map((trial) => ({
      type: 'time_trial',
      name: trial.name,
      district: trial.district,
      difficulty: trial.difficulty,
      location: trial.location,
      bronze: trial.bronze,
      silver: trial.silver,
      gold: trial.gold,
      platinum: trial.platinum,
      videoUrl: trial.videoUrl,
    })));
    return results;
  }

  function recordView(record: WasansRecord) {
    return {
      trial: record.trial_name,
      player: record.player_name ?? 'Unknown',
      time: time3(record.time),
      wasansScore: score3(record.player_score),
      setOn: day(record.date),
      standingForDays: daysSince(record.date),
      submissionUrl: submissionUrl(record.submission_uuid),
      videoUrl: wrVideoURL(record.submission_uuid ?? ''),
    };
  }

  async function runRecords(args: z.infer<typeof schemas.get_world_records>) {
    const all = await getRecords('get_world_records');
    let found: WasansRecord[] = [];
    if (args.trial) found = all.filter((record) => record.trial_name === args.trial);
    else if (args.query) {
      const scored = all.map((record) => ({ item: record, hit: mentions(args.query as string, record.trial_name) ? 100 : 0 })).filter((entry) => entry.hit > 0);
      found = scored.length ? bestMatches(scored) : [];
    }

    const results = found.slice(0, args.limit ?? 6).map(recordView);
    suggest(results.map((record) => ({
      type: 'world_record',
      trial: record.trial,
      player: record.player,
      time: record.time,
      wasansScore: record.wasansScore ?? '',
      submissionUrl: record.submissionUrl,
      videoUrl: record.videoUrl,
    })));
    if (results.length || !args.summary) return results;

    // No single trial asked about: hand over the whole board plus the
    // aggregates people ask for (most records, oldest standing record).
    const holders = new Map<string, number>();
    for (const record of all) holders.set(record.player_name ?? 'Unknown', (holders.get(record.player_name ?? 'Unknown') ?? 0) + 1);
    const ranked = Array.from(holders.entries()).sort((a, b) => b[1] - a[1]).map(([player, count]) => ({ player, records: count }));
    const dated = all.filter((record) => record.date).sort((a, b) => (a.date ?? 0) - (b.date ?? 0));
    suggest([{
      type: 'leaderboard',
      title: 'World record holders',
      subtitle: `${all.length} trials`,
      rows: ranked.slice(0, 10).map((row, index) => ({ rank: index + 1, name: row.player, value: `${row.records} WR${row.records === 1 ? '' : 's'}` })),
      url: 'https://wasans.tully.sh/leaderboard',
    }]);
    return {
      totalRecords: all.length,
      recordsPerPlayer: ranked,
      oldestStandingRecord: dated[0] ? recordView(dated[0]) : null,
      newestRecord: dated.at(-1) ? recordView(dated.at(-1) as WasansRecord) : null,
      records: all.map(recordView).map((record) => ({
        trial: record.trial,
        player: record.player,
        time: record.time,
        wasansScore: record.wasansScore,
        setOn: record.setOn,
        standingForDays: record.standingForDays,
      })),
    };
  }

  async function runWrHistory(args: z.infer<typeof schemas.get_wr_history>) {
    const { data, checkedAt } = await wasans.wrHistory(args.trial);
    seen('get_wr_history', checkedAt);
    const history = [...data].sort((a, b) => (a.date ?? 0) - (b.date ?? 0)).map((run) => ({ player: run.player_name ?? 'Unknown', time: time3(run.time), setOn: day(run.date) }));
    suggest([{
      type: 'leaderboard',
      title: `${args.trial} world record history`,
      subtitle: `${history.length} records`,
      rows: history.slice(-8).reverse().map((run, index) => ({ rank: index + 1, name: run.player, value: run.time, note: run.setOn ?? undefined })),
      url: 'https://wasans.tully.sh/archive',
    }]);
    return { trial: args.trial, timesBeaten: Math.max(0, history.length - 1), firstRecord: history[0] ?? null, current: history.at(-1) ?? null, history };
  }

  async function runTrialLeaderboard(args: z.infer<typeof schemas.get_trial_leaderboard>) {
    const who = args.player ? await resolvePlayer(args.player) : null;
    const { data, total, checkedAt } = await wasans.trialLeaderboard(args.trial, args.limit ?? 10, who?.ok ? who.uuid : undefined);
    seen('get_trial_leaderboard', checkedAt);
    const top = data.results.map((row) => ({ rank: row.rank, player: row.player_name, time: time3(row.time), wasansScore: score3(row.score), setOn: day(row.date) }));
    const mine = who?.ok && data.player
      ? { player: who.name, rank: data.player.rank, time: time3(data.player.time), wasansScore: score3(data.player.score), outOf: total ?? null }
      : null;
    suggest([{
      type: 'leaderboard',
      title: `${args.trial} leaderboard`,
      subtitle: total ? `${total} players` : undefined,
      rows: [
        ...top.slice(0, 10).map((row) => ({ rank: row.rank, name: row.player, value: row.time, highlight: mine?.rank === row.rank })),
        ...(mine && mine.rank > 10 ? [{ rank: mine.rank, name: mine.player, value: mine.time, highlight: true }] : []),
      ],
      url: `https://wasans.tully.sh/trials/${encodeURIComponent(args.trial.toLowerCase().replace(/\s+/g, '-'))}`,
    }]);
    return {
      trial: args.trial,
      playersWithATime: total ?? null,
      worldRecord: data.wr ? time3(data.wr.time) : null,
      top,
      ...(who ? (who.ok ? { asked: mine ?? { player: who.name, note: 'has no time on this trial' } } : { asked: { note: who.note } }) : {}),
    };
  }

  async function runOverall(args: z.infer<typeof schemas.get_overall_leaderboard>) {
    const limit = args.limit ?? 10;
    const { data, total, checkedAt } = await wasans.overall(limit);
    seen('get_overall_leaderboard', checkedAt);
    const top = data.map((row, index) => ({ rank: index + 1, player: row.player_name, wasansScore: score3(row.overall_score), tier: tierForScore(row.overall_score ?? 0).name }));
    let asked: Record<string, unknown> | null = null;
    if (args.player) {
      const who = await resolvePlayer(args.player);
      if (!who.ok) asked = { note: who.note };
      else {
        const detail = (await wasans.player(who.uuid)).data.player;
        asked = detail ? { player: detail.player_name, rank: detail.rank ?? detail.position ?? null, wasansScore: score3(detail.score), tier: tierForScore(detail.score ?? 0).name } : { note: `${who.name} has no overall score yet.` };
      }
    }
    suggest([{
      type: 'leaderboard',
      title: 'Overall Wasans leaderboard',
      subtitle: total ? `${total} players` : undefined,
      rows: top.slice(0, 10).map((row) => ({ rank: row.rank, name: row.player, value: row.wasansScore ?? '', note: row.tier })),
      url: 'https://wasans.tully.sh/leaderboard',
    }]);
    return { players: total ?? null, top, ...(asked ? { asked } : {}) };
  }

  async function runCombos(args: z.infer<typeof schemas.get_combo_leaderboard>) {
    const categories = args.category ? [args.category] : comboCategories;
    const limit = args.category ? args.limit ?? 10 : 3;
    const boards = await Promise.all(categories.map(async (category) => {
      const { data, total, checkedAt } = await wasans.comboLeaderboard(category, limit);
      seen('get_combo_leaderboard', checkedAt);
      return {
        category,
        players: total ?? null,
        top: data.results
          .filter((row) => typeof row.combo_count === 'number')
          .map((row, index) => ({ rank: row.rank ?? index + 1, player: row.player_name, combo: row.combo_count.toLocaleString('en-US'), setOn: day(row.date) })),
      };
    }));
    suggest(boards.map((board) => ({
      type: 'leaderboard',
      title: `${board.category.charAt(0).toUpperCase()}${board.category.slice(1)} combo leaderboard`,
      subtitle: board.players ? `${board.players} players` : undefined,
      rows: board.top.slice(0, 10).map((row) => ({ rank: row.rank, name: row.player, value: row.combo })),
      url: 'https://wasans.tully.sh/combos',
    })));
    return boards;
  }

  async function runPlayer(args: z.infer<typeof schemas.get_player>) {
    const who = await resolvePlayer(args.player);
    if (!who.ok) return { found: false, note: who.note };
    const { data, checkedAt } = await wasans.player(who.uuid);
    seen('get_player', checkedAt);
    const player = data.player;
    if (!player) return { found: false, note: `${who.name} has no Wasans profile data.` };

    const current = (player.pbs ?? []).filter((pb) => !pb.old_version);
    const pbs = current
      .map((pb) => ({ trial: pb.trial_name, time: time3(pb.time), rank: pb.rank ?? null, outOf: pb.holders ?? null, setOn: day(pb.date) }))
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    const tier = tierForScore(player.score ?? 0);
    suggest([{
      type: 'player',
      name: player.player_name,
      rank: player.rank ? `#${player.rank}` : '',
      score: score3(player.score) ?? '',
      tier: tier.name,
      pbs: pbs.slice(0, 6).map((pb) => ({ trial: pb.trial, time: pb.time, rank: pb.rank ? `#${pb.rank}` : '' })),
      url: playerUrl(player.uuid),
    }]);
    return {
      found: true,
      isAsker: args.player === 'me',
      player: player.player_name,
      overallRank: player.rank ?? player.position ?? null,
      wasansScore: score3(player.score),
      tier: tier.name,
      joined: day(player.date_joined),
      worldRecords: pbs.filter((pb) => pb.rank === 1).map((pb) => pb.trial),
      trialsWithATime: pbs.length,
      trialsWithoutATime: wasansTrials.filter((trial) => !pbs.some((pb) => pb.trial === trial)),
      personalBests: pbs,
      comboBests: (player.combo_pbs ?? []).map((pb) => ({ category: pb.category, combo: pb.combo_count?.toLocaleString('en-US'), rank: pb.rank ?? null })),
      recentRuns: (player.recent_submissions ?? []).slice(0, 5).map((run) => ({ trial: run.trial_name, time: time3(run.time), on: day(run.date), state: run.state })),
      profileUrl: playerUrl(player.uuid),
    };
  }

  async function runPlayerAnalytics(args: z.infer<typeof schemas.get_player_analytics>) {
    const who = await resolvePlayer(args.player);
    if (!who.ok) return { found: false, note: who.note };
    const { data, checkedAt } = await wasans.playerAnalytics(who.uuid);
    seen('get_player_analytics', checkedAt);
    if (data.player_found === false) return { found: false, note: `${who.name} has no analytics yet.` };
    const trials = [...(data.trial_distributions ?? [])].sort((a, b) => b.percentile - a.percentile);
    const ranks = data.rank_history ?? [];
    const monthAgo = ranks.length > 30 ? ranks[ranks.length - 31] : ranks[0];
    return {
      found: true,
      player: who.name,
      peakRank: data.peak_rank ?? null,
      lastPersonalBest: day(data.last_pb_at),
      rankNow: ranks.at(-1)?.rank ?? null,
      rankAboutAMonthAgo: monthAgo?.rank ?? null,
      strongestTrials: trials.slice(0, 3).map((trial) => ({ trial: trial.trial_name, percentile: Math.round(trial.percentile), trialScore: score3(trial.player_score) })),
      weakestTrials: trials.slice(-3).reverse().map((trial) => ({ trial: trial.trial_name, percentile: Math.round(trial.percentile), trialScore: score3(trial.player_score) })),
      allTrials: trials.map((trial) => ({ trial: trial.trial_name, percentile: Math.round(trial.percentile), trialScore: score3(trial.player_score), averageScore: score3(trial.mean) })),
    };
  }

  async function runTrialStats(args: z.infer<typeof schemas.get_trial_stats>) {
    const rangeName = args.range ?? '30d';
    const { data, checkedAt } = await wasans.trialStats(args.trial, rangeName);
    seen('get_trial_stats', checkedAt);
    const history = data.wr_history ?? [];
    // Volume comes as day-by-day series; totals are what people ask for.
    const volume = Object.fromEntries(Object.entries(data.volume ?? {}).map(([name, series]) => [
      name,
      Array.isArray(series) ? series.reduce((total, point) => total + (Number((point as { v?: number }).v) || 0), 0) : series,
    ]));
    return {
      trial: args.trial,
      range: rangeName,
      worldRecordChanges: Math.max(0, history.length - 1),
      firstRecordedWr: history[0] ? { player: history[0].player_name, time: time3(history[0].time), on: day(history[0].date) } : null,
      totalsInRange: volume,
      byMonth: (data.monthly ?? []).slice(-4).map((month) => ({ month: day(month.t)?.slice(0, 7), runs: month.runs, players: month.players, best: time3(month.best), median: time3(month.median) })),
      topGrinders: (data.top_grinders ?? []).slice(0, 5).map((grinder) => ({ player: grinder.player_name, runs: grinder.runs, best: time3(grinder.best) })),
      grind: data.grind ?? null,
    };
  }

  async function runSiteStats(args: z.infer<typeof schemas.get_site_stats>) {
    const rangeName = args.range ?? '30d';
    const { data, checkedAt } = await wasans.siteStats(rangeName);
    seen('get_site_stats', checkedAt);
    const busiest = [...(data.trials ?? [])].sort((a, b) => (b.submitted ?? 0) - (a.submitted ?? 0)).slice(0, 5);
    return {
      range: rangeName,
      totals: data.activity?.totals ?? null,
      previousPeriod: data.activity?.previous ?? null,
      playersWithAPersonalBest: data.players?.with_pb ?? null,
      trialsCountedInScore: data.players?.counted_trials ?? null,
      mostWorldRecords: (data.players?.wr_holders ?? []).slice(0, 5).map((holder) => ({ player: holder.player_name, records: holder.count })),
      biggestImprovers: (data.players?.improvers ?? []).slice(0, 5).map((player) => ({ player: player.player_name, scoreGain: score3(player.score_change) })),
      biggestClimbers: (data.players?.churn?.climbers ?? []).slice(0, 5).map((player) => ({ player: player.player_name, fromRank: player.from, toRank: player.to })),
      busiestTrials: busiest.map((trial) => ({ trial: trial.trial_name, runsSubmitted: trial.submitted ?? 0, newPersonalBests: trial.pbs_set ?? 0, wrChanges: trial.wr_changes ?? 0 })),
    };
  }

  async function runRecentRuns(args: z.infer<typeof schemas.get_recent_runs>) {
    const who = args.player ? await resolvePlayer(args.player) : null;
    if (who && !who.ok) return { found: false, note: who.note };
    const { data, checkedAt } = await wasans.recentRuns({ player: who?.ok ? who.uuid : undefined, trial: args.trial, limit: args.limit ?? 8 });
    seen('get_recent_runs', checkedAt);
    const runs = data
      .filter((run) => !args.trial || run.trial_name === args.trial)
      .map((run) => ({ player: run.player_name ?? 'Unknown', trial: run.trial_name, time: time3(run.time), on: day(run.date), wasansScore: score3(run.player_score) }));
    suggest([{
      type: 'leaderboard',
      title: `Recent runs${args.trial ? ` on ${args.trial}` : ''}${who?.ok ? ` by ${who.name}` : ''}`,
      rows: runs.slice(0, 8).map((run, index) => ({ rank: index + 1, name: args.trial ? run.player : `${run.player} · ${run.trial}`, value: run.time, note: run.on ?? undefined })),
      url: 'https://wasans.tully.sh/submissions/trials',
    }]);
    return runs;
  }

  async function runAnnouncements() {
    const { data, checkedAt } = await wasans.announcements();
    seen('get_wasans_announcements', checkedAt);
    return data.map((item) => ({ text: item.body, by: item.created_by_name ?? null, on: day(item.created_at), link: item.link_url ?? null }));
  }

  async function runScore(args: z.infer<typeof schemas.wasans_score>) {
    const record = await recordFor(args.trial, 'wasans_score');
    if (!record) return { note: `No world record is known for ${args.trial}, so a Wasans score cannot be worked out.` };
    return scoreForTime(args.trial, args.time, record.time);
  }

  async function runTimeForScore(args: z.infer<typeof schemas.time_for_score>) {
    const record = await recordFor(args.trial, 'time_for_score');
    if (!record) return { note: `No world record is known for ${args.trial}.` };
    return timeNeededForScore(args.trial, args.score, record.time);
  }

  async function runGaps(args: z.infer<typeof schemas.time_gaps>) {
    const [trials, record] = await Promise.all([getTrials(), recordFor(args.trial, 'time_gaps')]);
    const trial = trials.find((item) => item.name === args.trial);
    return timeGaps(args.trial, {
      bronze: trial?.bronzeTime,
      silver: trial?.silverTime,
      gold: trial?.goldTime,
      platinum: trial?.platinumTime,
    }, record?.time ?? null, args.time);
  }

  function runXp(args: z.infer<typeof schemas.xp_progress>) {
    const result = xpProgress(args);
    sourceTimes.set('xp_progress', new Date().toISOString());
    return result ?? { note: 'Need at least the current level to work out XP.' };
  }

  async function runCommunity(args: z.infer<typeof schemas.search_community>) {
    const resources = (await getResources()).filter((item) => (args.type ? item.type === args.type : true));
    const scored = args.query
      ? resources
        .map((item) => ({ item, hit: score(item.name, args.query as string) * 3 + score(item.description ?? '', args.query as string) }))
        .filter((entry) => entry.hit > 0)
        .sort((a, b) => b.hit - a.hit)
      : [];
    const found = (args.query ? scored.map(({ item }) => item) : shuffle(resources)).slice(0, args.limit ?? 6);
    const carded = (args.query ? bestMatches(scored) : found).slice(0, args.limit ?? 6);
    suggest(carded.map((item) => item.type === 'gif'
      ? { type: 'gif', url: item.link, title: item.name }
      : { type: 'link', title: item.name, url: item.link }));
    return found.map((item) => ({
      name: item.name,
      type: item.type,
      url: item.link,
      openUrl: item.redirect ?? item.link,
      description: item.description ?? '',
    }));
  }

  async function execute(name: ToolName, args: unknown): Promise<unknown> {
    switch (name) {
      case 'search_knowledge': return runKnowledge(schemas.search_knowledge.parse(args));
      case 'search_techs': return runTechs(schemas.search_techs.parse(args));
      case 'get_time_trials': return runTrials(schemas.get_time_trials.parse(args));
      case 'get_world_records': return runRecords(schemas.get_world_records.parse(args));
      case 'get_wr_history': return runWrHistory(schemas.get_wr_history.parse(args));
      case 'get_trial_leaderboard': return runTrialLeaderboard(schemas.get_trial_leaderboard.parse(args));
      case 'get_overall_leaderboard': return runOverall(schemas.get_overall_leaderboard.parse(args));
      case 'get_combo_leaderboard': return runCombos(schemas.get_combo_leaderboard.parse(args));
      case 'get_player': return runPlayer(schemas.get_player.parse(args));
      case 'get_player_analytics': return runPlayerAnalytics(schemas.get_player_analytics.parse(args));
      case 'get_trial_stats': return runTrialStats(schemas.get_trial_stats.parse(args));
      case 'get_site_stats': return runSiteStats(schemas.get_site_stats.parse(args));
      case 'get_recent_runs': return runRecentRuns(schemas.get_recent_runs.parse(args));
      case 'get_wasans_announcements': return runAnnouncements();
      case 'wasans_score': return runScore(schemas.wasans_score.parse(args));
      case 'time_for_score': return runTimeForScore(schemas.time_for_score.parse(args));
      case 'tier_for_score': return tierInfo(schemas.tier_for_score.parse(args).score);
      case 'time_gaps': return runGaps(schemas.time_gaps.parse(args));
      case 'xp_progress': return runXp(schemas.xp_progress.parse(args));
      case 'search_community': return runCommunity(schemas.search_community.parse(args));
    }
  }

  return {
    autoBlocks,
    async lookup(name: ToolName, args: unknown) {
      try {
        const result = await execute(name, args);
        return { status: 'ok' as const, result, checkedAt: sourceTimes.get(name) ?? sourceTimes.get('wasans') ?? new Date().toISOString() };
      } catch (error) {
        if (!(error instanceof z.ZodError)) console.warn('reborn-ai tool failed', { tool: name, error: error instanceof Error ? error.message : String(error) });
        return {
          status: 'unavailable' as const,
          error: error instanceof z.ZodError ? 'invalid request' : `${name} is unavailable right now`,
          checkedAt: new Date().toISOString(),
        };
      }
    },
  };
}
