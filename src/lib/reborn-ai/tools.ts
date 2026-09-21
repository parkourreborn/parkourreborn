import 'server-only';

import { z } from 'zod';
import { searchTechs } from '@/lib/pages/techlist';
import { formatTime } from '@/lib/pages/time';
import { wrVideoURL } from '@/lib/pages/timetrials';
import { knowledgeRetriever } from '@/lib/reborn-ai/knowledge-retriever';
import { limits } from '@/lib/reborn-ai/limits';
import { hideRecipes, parseRecipes, recipeBlock } from '@/lib/reborn-ai/recipes';
import type { Recipe } from '@/lib/reborn-ai/recipes';
import type { AssistantBlock } from '@/lib/reborn-ai/types';
import { loadCommunityResources, loadTechs, loadTimeTrials, loadWorldRecords } from '@/lib/server/reborn-ai-data';
import { cleanPathPart } from '@/lib/url';

const count = z.number().int().min(1).max(limits.maxToolResultItems).optional();
const term = z.string().trim().min(1).max(80);
const schemas = {
  search_knowledge: z.object({ query: term, limit: count }),
  search_techs: z.object({ query: term, kind: z.enum(['tech', 'concept', 'basic']).optional(), limit: count }),
  get_time_trials: z.object({ query: term.optional(), district: term.optional(), limit: count }),
  get_world_records: z.object({ trial: term.optional(), limit: count }),
  search_community: z.object({ query: term.optional(), type: z.enum(['gif', 'file', 'link']).optional(), limit: count }),
};

const key = (value: string) => value.trim().toLowerCase();
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

let recipeCache: Promise<Recipe[]> | null = null;
function getRecipes() {
  if (!recipeCache) recipeCache = knowledgeRetriever.docs().then(parseRecipes).catch(() => [] as Recipe[]);
  return recipeCache;
}

export function createToolkit() {
  const autoBlocks: AssistantBlock[] = [];
  const sourceTimes = new Map<string, string>();
  const suggest = (blocks: AssistantBlock[]) => {
    const room = limits.maxAutoBlocks - autoBlocks.length;
    if (room > 0) autoBlocks.push(...blocks.slice(0, room));
  };

  const getTechs = () => loadTechs().then((loaded) => {
    sourceTimes.set('search_techs', loaded.checkedAt);
    return loaded.data;
  });
  const getTrials = () => loadTimeTrials().then((loaded) => {
    sourceTimes.set('get_time_trials', loaded.checkedAt);
    return loaded.data;
  });
  const getResources = () => loadCommunityResources().then((loaded) => {
    sourceTimes.set('search_community', loaded.checkedAt);
    return loaded.data;
  });
  const getRecords = () => loadWorldRecords().then((loaded) => {
    sourceTimes.set('get_world_records', loaded.checkedAt);
    return loaded.data.records;
  });

  async function suggestRecipes(query: string) {
    const scored = (await getRecipes())
      .map((recipe) => ({ item: recipe, hit: score(recipe.item, query) }))
      .filter((entry) => entry.hit > 0);
    if (scored.length) suggest(bestMatches(scored).map(recipeBlock));
  }

  async function runKnowledge(args: z.infer<typeof schemas.search_knowledge>) {
    const found = await knowledgeRetriever.search(args.query, args.limit ?? limits.maxKnowledgeDocs);
    const results: { id: string; title: string; category: string; body: string }[] = [];
    let left = limits.maxKnowledgeChars;

    for (const { doc } of found) {
      if (left <= 0) break;
      const text = doc.category === 'crafting' ? hideRecipes(doc.body) : doc.body;
      const body = text.length > left ? `${text.slice(0, left)}...` : text;
      left -= body.length;
      results.push({ id: doc.id, title: doc.title, category: doc.category, body });
    }
    if (results.some((result) => result.category === 'crafting')) await suggestRecipes(args.query);
    return results;
  }

  async function runTechs(args: z.infer<typeof schemas.search_techs>) {
    const entries = await getTechs();
    let results = searchTechs(entries, args.query, args.kind ?? 'all');
    if (!results.length) {
      const seen = new Set<string>();
      results = words(args.query)
        .filter((word) => !queryNoise.has(word))
        .flatMap((word) => searchTechs(entries, word, args.kind ?? 'all'))
        .filter(({ entry }) => {
          if (seen.has(entry.name)) return false;
          seen.add(entry.name);
          return true;
        });
    }
    const mentioned = results.filter(({ entry }) => [entry.name, ...entry.aliases].some((name) => key(args.query).includes(key(name))));
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
      bronze: formatTime(trial.bronzeTime),
      silver: formatTime(trial.silverTime),
      gold: formatTime(trial.goldTime),
      platinum: formatTime(trial.platinumTime),
      videoUrl: trial.videoURL,
      videoUrl2: trial.videoURL2,
    }));
    suggest(results.map((trial) => ({ type: 'time_trial', ...trial })));
    return results;
  }

  async function runRecords(args: z.infer<typeof schemas.get_world_records>) {
    const records = await getRecords();
    let found = (args.trial
      ? records
        .map((record) => ({ record, hit: score(record.trialName, args.trial as string) }))
        .filter((entry) => entry.hit > 0)
        .sort((a, b) => b.hit - a.hit)
        .map(({ record }) => record)
      : records
    ).slice(0, args.limit ?? 6);
    const mentioned = args.trial ? found.filter((record) => key(args.trial as string).includes(key(record.trialName))) : [];
    if (mentioned.length) found = mentioned;

    const results = found.map((record) => {
      const id = cleanPathPart(record.submissionUuid);
      return {
        trial: record.trialName,
        player: record.playerName,
        time: formatTime(record.time),
        wasansScore: record.playerScore === null ? null : record.playerScore.toFixed(3),
        submissionUrl: id ? `https://wasans.tully.sh/submissions/${id}` : '',
        videoUrl: wrVideoURL(record.submissionUuid),
      };
    });
    suggest(results.map((record) => ({
      type: 'world_record',
      ...record,
      wasansScore: record.wasansScore ?? '',
    })));
    return results;
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

  async function execute(name: string, args: unknown) {
    if (name === 'search_knowledge') return runKnowledge(schemas.search_knowledge.parse(args));
    if (name === 'search_techs') return runTechs(schemas.search_techs.parse(args));
    if (name === 'get_time_trials') return runTrials(schemas.get_time_trials.parse(args));
    if (name === 'get_world_records') return runRecords(schemas.get_world_records.parse(args));
    if (name === 'search_community') return runCommunity(schemas.search_community.parse(args));
    throw new Error('unknown source');
  }

  return {
    autoBlocks,
    async lookup(name: string, args: unknown) {
      try {
        const result = await execute(name, args);
        return { status: 'ok' as const, result, checkedAt: sourceTimes.get(name) ?? new Date().toISOString() };
      } catch (error) {
        return {
          status: 'unavailable' as const,
          error: error instanceof z.ZodError ? 'invalid request' : `${name} is unavailable right now`,
          checkedAt: new Date().toISOString(),
        };
      }
    },
  };
}
