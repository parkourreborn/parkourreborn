import 'server-only';

import { z } from 'zod';
import { limits } from '@/lib/reborn-ai/limits';
import { knowledgeRetriever } from '@/lib/reborn-ai/knowledge-retriever';
import { showSchema, verifyBlocks } from '@/lib/reborn-ai/blocks';
import type { BlockInput } from '@/lib/reborn-ai/blocks';
import { hideRecipes, parseRecipes, recipeBlock } from '@/lib/reborn-ai/recipes';
import type { Recipe } from '@/lib/reborn-ai/recipes';
import type { AssistantBlock } from '@/lib/reborn-ai/types';
import type { CommunityResource } from '@/lib/pages/search';
import type { MovementEntry } from '@/lib/pages/techlist';
import { searchTechs } from '@/lib/pages/techlist';
import type { TimeTrial, WorldRecord } from '@/lib/pages/timetrials';
import { wrVideoURL } from '@/lib/pages/timetrials';
import { formatTime } from '@/lib/pages/time';
import { cleanPathPart } from '@/lib/url';

export type ToolDefinition = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ToolOutcome = {
  content: string;
  blocks: AssistantBlock[];
};

type WrItem = {
  trial_name?: string;
  player_name?: string;
  time?: number;
  submission_uuid?: string;
  player_score?: number;
};

const stepNotation = 'Steps come back raw. A step ending in * is optional. A step ending in - or + is an advanced-mode toggle: with advanced mode on the - steps drop out and the + steps come in. Read the markers, do not show them raw to the user.';

const count = z.number().int().min(1).max(limits.maxToolResultItems).optional();
const term = z.string().trim().min(1).max(80);

const schemas = {
  search_knowledge: z.object({ query: term, limit: count }),
  search_techs: z.object({ query: term, kind: z.enum(['tech', 'concept', 'basic']).optional(), limit: count }),
  get_time_trials: z.object({ query: term.optional(), district: term.optional(), limit: count }),
  get_world_records: z.object({ trial: term.optional(), limit: count }),
  search_community: z.object({ query: term.optional(), type: z.enum(['gif', 'file', 'link']).optional(), limit: count }),
  show: showSchema,
};

export type ToolName = keyof typeof schemas;

const blockFields = {
  type: { type: 'string', enum: ['text', 'link', 'video', 'image', 'gif', 'tech', 'time_trial', 'world_record', 'recipe'] },
  content: { type: 'string', description: 'text blocks only' },
  title: { type: 'string', description: 'link, video and gif blocks' },
  url: { type: 'string', description: 'link, video, image and gif blocks. Must be a url you actually got from a tool' },
  alt: { type: 'string', description: 'image blocks only' },
  name: { type: 'string', description: 'tech and time_trial blocks: the exact name from the tool result' },
  trial: { type: 'string', description: 'world_record blocks: the exact trial name from the tool result' },
  item: { type: 'string', description: 'recipe blocks: the exact name of the thing being crafted, like Base Glove or Climber Glove II. Nothing else, the grid and every resource in it get filled in for you' },
};

export const toolDefinitions: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description: 'Everything you know about Parkour Reborn: crafting recipes and where resources come from, gear, districts and locations, missions, npcs, progression, cosmetics, easter eggs, rules and how systems work. Hands back the full text of every page that matches, so whatever it returns is the answer. Search this for any game question that is not a tech, a time trial, a world record or a community link. Every question about making, crafting, building, upgrading or getting a piece of gear lands here, so "how do i make a grappler", "how do i get the mag rail" and "recipe for climber glove ii" are all this tool. Search it again with different wording before you ever say you do not know.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'plain keywords, the name of the thing you want' },
          limit: { type: 'integer', minimum: 1, maximum: limits.maxToolResultItems },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_techs',
      description: `Search the tech list for techs, concepts and basics. Matches names, aliases and steps. Use this for anything about how a specific movement is performed, what it is called, or what it chains from. Hands back the full step list, the other names it goes by, a clip of the tech being done and a tutorial link, so this answers "how do i do x" completely. Movement only: gear like a grappler, glove, mag rail or springhook is not a tech, and making or getting one is the knowledge tool. ${stepNotation}`,
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'name, alias or partial name' },
          kind: { type: 'string', enum: ['tech', 'concept', 'basic'] },
          limit: { type: 'integer', minimum: 1, maximum: limits.maxToolResultItems },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_time_trials',
      description: 'Medal times live here and nowhere else. Use this for anything about bronze, silver, gold, platinum or plat on a trial, and for a trial district or difficulty. Hands back all four medal times, the district, the difficulty and a video of someone running the whole trial, so this is also how you answer a route question or "how do i clear x". Not for world records. Leave query empty to list trials.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'trial name or part of it' },
          district: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: limits.maxToolResultItems },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_world_records',
      description: 'The fastest run an actual player has submitted for a trial. Hands back the holder, the time, the Wasans score, the submission page and a video of the record run itself. Only for world record, record holder or fastest ever questions, never from memory. These are not medal times, so never use this for a bronze, silver, gold, platinum or plat question. Leave trial empty to get the newest records.',
      parameters: {
        type: 'object',
        properties: {
          trial: { type: 'string', description: 'trial name or part of it' },
          limit: { type: 'integer', minimum: 1, maximum: limits.maxToolResultItems },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_community',
      description: 'Search the community library for gifs, files and links. Use this for anyone\'s discord, a community doc, a meme or a clip. Hands back the real name, description and url of each one. Query is optional: leave it out and set type to browse what is there, which is how you handle "any funny gif" or "show me something cool". Searching a person or thing on its own name works better than a whole sentence: query olmy, not olmy discord server, because the generic words drag in everyone else\'s links too. Set limit to how many things the user actually asked for, so 1 when they asked about one person or one link.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'optional. a name or keywords, as few words as possible. leave out to browse' },
          type: { type: 'string', enum: ['gif', 'file', 'link'] },
          limit: { type: 'integer', minimum: 1, maximum: limits.maxToolResultItems, description: 'how many results you want. use 1 for one specific thing' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show',
      description: `Cards for techs, trials, records, gifs and links already attach on their own after a tool runs, so the main job of this tool is recipes. Every single time you talk about crafting something, call this with a recipe block naming what is being crafted, and it draws the crafting grid with every resource in it. One block per recipe. Otherwise only call this to pick specific cards when the automatic ones would be wrong, and never for plain chat. Max ${limits.maxBlocks} blocks.`,
      parameters: {
        type: 'object',
        properties: {
          blocks: {
            type: 'array',
            maxItems: limits.maxBlocks,
            items: { type: 'object', properties: blockFields, required: ['type'] },
          },
        },
        required: ['blocks'],
      },
    },
  },
];

const key = (value: string) => value.trim().toLowerCase();
const words = (value: string) => key(value).split(/[^a-z0-9]+/).filter((word) => word.length > 2);

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

// Every tool hop is an http round trip back into our own api, so the answers live
// on the instance for a bit. One person asking three things in a row only pays once.
const store = new Map<string, { at: number; value: Promise<unknown> }>();

function shared<T>(path: string, load: () => Promise<T>): Promise<T> {
  const hit = store.get(path);
  if (hit && Date.now() - hit.at < limits.dataCacheMs) return hit.value as Promise<T>;

  const value: Promise<T> = load().catch((error) => {
    if (store.get(path)?.value === value) store.delete(path);
    throw error;
  });

  store.set(path, { at: Date.now(), value });
  return value;
}

// Knowledge files are baked into the bundle, so parsing them twice is pure waste.
let recipeCache: Promise<Recipe[]> | null = null;

function getRecipes() {
  if (!recipeCache) recipeCache = knowledgeRetriever.docs().then(parseRecipes).catch(() => [] as Recipe[]);
  return recipeCache;
}

const maybe = <T>(want: boolean, get: () => Promise<T[]>): Promise<T[]> => (
  want ? get().catch(() => [] as T[]) : Promise.resolve([] as T[])
);

export function createToolkit(origin: string) {
  const seenUrls = new Set<string>();
  const blocks: AssistantBlock[] = [];
  const autoBlocks: AssistantBlock[] = [];

  const suggest = (found: number, make: () => AssistantBlock[]) => {
    if (found < 1 || autoBlocks.length >= limits.maxAutoBlocks) return;
    autoBlocks.push(...make().slice(0, limits.maxAutoBlocks - autoBlocks.length));
  };

  const track = (...urls: (string | undefined)[]) => {
    for (const url of urls) if (url) seenUrls.add(url);
  };

  const trackKnowledgeUrls = (text: string) => {
    for (const match of text.matchAll(/https?:\/\/[^\s)>\]]+/g)) seenUrls.add(match[0]);
  };

  function load<T>(path: string, pick: (data: unknown) => T): Promise<T> {
    const url = `${origin}${path}`;

    return shared(url, async () => {
      const response = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(limits.toolTimeoutMs),
      });
      if (!response.ok) throw new Error(`${path} failed`);
      return pick(await response.json());
    });
  }

  const getTechs = () => load('/api/techs', (data) => (Array.isArray(data) ? data as MovementEntry[] : []));
  const getTrials = () => load('/api/timetrials', (data) => (Array.isArray(data) ? data as TimeTrial[] : []));
  const getResources = () => load('/api/community/search', (data) => (Array.isArray(data) ? data as CommunityResource[] : []));

  const getRecords = () => load('/api/wrs', (data) => {
    const items = (data as { data?: WrItem[] })?.data ?? [];

    return items
      .filter((item): item is WrItem & { trial_name: string; time: number } => Boolean(item.trial_name) && typeof item.time === 'number')
      .map<WorldRecord>((item) => ({
        trialName: item.trial_name,
        playerName: item.player_name ?? 'Unknown',
        time: item.time,
        submissionUuid: item.submission_uuid ?? '',
        playerScore: typeof item.player_score === 'number' ? item.player_score : null,
      }));
  });

  // A crafting question ends up as a grid whether or not the model remembers to ask for one.
  // Searching the same recipe under two names is normal, so the same card must not stack up.
  async function suggestRecipes(query: string) {
    const shown = new Set(autoBlocks.filter((block) => block.type === 'recipe').map((block) => block.item));

    const scored = (await getRecipes())
      .filter((recipe) => !shown.has(recipe.item))
      .map((recipe) => ({ item: recipe, hit: score(recipe.item, query) }))
      .filter((entry) => entry.hit > 0);

    if (!scored.length) return;

    const picked = bestMatches(scored);
    suggest(picked.length, () => picked.map(recipeBlock));
  }

  async function runKnowledge(args: z.infer<typeof schemas.search_knowledge>) {
    const found = await knowledgeRetriever.search(args.query, args.limit ?? limits.maxKnowledgeDocs);
    const results: { title: string; category: string; body: string }[] = [];
    let left = limits.maxKnowledgeChars;

    for (const { doc } of found) {
      if (left <= 0) break;
      const text = doc.category === 'crafting' ? hideRecipes(doc.body) : doc.body;
      const body = text.length > left ? `${text.slice(0, left)}...` : text;
      left -= body.length;
      trackKnowledgeUrls(body);
      results.push({ title: doc.title, category: doc.category, body });
    }

    if (results.some((result) => result.category === 'crafting')) await suggestRecipes(args.query);

    return results;
  }

  async function runTechs(args: z.infer<typeof schemas.search_techs>) {
    const entries = await getTechs();
    const results = searchTechs(entries, args.query, args.kind ?? 'all').slice(0, args.limit ?? 5);

    suggest(results.length, () => results.map(({ entry }) => ({
      type: 'tech',
      name: entry.name,
      kind: entry.kind,
      aliases: entry.aliases,
      steps: entry.steps,
      videoUrl: entry.videoUrl,
      tutorialUrl: entry.tutorialUrl,
    })));

    return results.map(({ entry }) => {
      track(entry.videoUrl, entry.tutorialUrl);

      return {
        name: entry.name,
        kind: entry.kind,
        aliases: entry.aliases,
        steps: entry.steps,
        videoUrl: entry.videoUrl,
        tutorialUrl: entry.tutorialUrl,
      };
    });
  }

  async function runTrials(args: z.infer<typeof schemas.get_time_trials>) {
    const trials = await getTrials();
    const { query, district } = args;

    const found = trials
      .map((trial) => ({
        trial,
        hit: (query ? score(trial.name, query) : 0) + (district ? score(trial.district, district) : 0),
      }))
      .filter((entry) => (query ? score(entry.trial.name, query) > 0 : true))
      .filter((entry) => (district ? score(entry.trial.district, district) > 0 : true))
      .sort((a, b) => b.hit - a.hit)
      .map((entry) => entry.trial)
      .slice(0, args.limit ?? 6);

    suggest(found.length, () => found.map((trial) => ({
      type: 'time_trial',
      name: trial.name,
      district: trial.district,
      difficulty: trial.difficulty,
      bronze: formatTime(trial.bronzeTime),
      silver: formatTime(trial.silverTime),
      gold: formatTime(trial.goldTime),
      platinum: formatTime(trial.platinumTime),
      videoUrl: trial.videoURL,
    })));

    return found
      .map((trial) => {
        track(trial.videoURL, trial.videoURL2);

        return {
          name: trial.name,
          district: trial.district,
          difficulty: trial.difficulty,
          bronze: formatTime(trial.bronzeTime),
          silver: formatTime(trial.silverTime),
          gold: formatTime(trial.goldTime),
          platinum: formatTime(trial.platinumTime),
          videoUrl: trial.videoURL,
          videoUrl2: trial.videoURL2,
        };
      });
  }

  async function runRecords(args: z.infer<typeof schemas.get_world_records>) {
    const records = await getRecords();
    const { trial } = args;

    const found = (trial
      ? records
        .map((record) => ({ record, hit: score(record.trialName, trial) }))
        .filter((entry) => entry.hit > 0)
        .sort((a, b) => b.hit - a.hit)
        .map((entry) => entry.record)
      : records
    ).slice(0, args.limit ?? 6);

    suggest(found.length, () => found.map((record) => ({
      type: 'world_record',
      trial: record.trialName,
      player: record.playerName,
      time: formatTime(record.time),
      wasansScore: record.playerScore === null ? '' : record.playerScore.toFixed(3),
      submissionUrl: cleanPathPart(record.submissionUuid) ? `https://wasans.tully.sh/submissions/${cleanPathPart(record.submissionUuid)}` : '',
      videoUrl: wrVideoURL(record.submissionUuid),
    })));

    return found
      .map((record) => {
        const id = cleanPathPart(record.submissionUuid);
        const submissionUrl = id ? `https://wasans.tully.sh/submissions/${id}` : '';
        const videoUrl = wrVideoURL(record.submissionUuid);
        track(submissionUrl, videoUrl);

        return {
          trial: record.trialName,
          player: record.playerName,
          time: formatTime(record.time),
          wasansScore: record.playerScore === null ? null : record.playerScore.toFixed(3),
          submissionUuid: record.submissionUuid,
          submissionUrl,
          videoUrl,
        };
      });
  }

  async function runCommunity(args: z.infer<typeof schemas.search_community>) {
    const resources = await getResources();
    const { query } = args;
    const pool = resources.filter((item) => (args.type ? item.type === args.type : true));

    const scored = query
      ? pool
        .map((item) => ({ item, hit: score(item.name, query) * 3 + score(item.description ?? '', query) }))
        .filter((entry) => entry.hit > 0)
        .sort((a, b) => b.hit - a.hit)
      : [];

    const found = (query ? scored.map((entry) => entry.item) : shuffle(pool)).slice(0, args.limit ?? 6);

    const carded = (query ? bestMatches(scored) : found).slice(0, args.limit ?? 6);

    suggest(carded.length, () => carded.map((item) => (item.type === 'gif'
      ? { type: 'gif' as const, url: item.link, title: item.name }
      : { type: 'link' as const, title: item.name, url: item.link })));

    return found
      .map((item) => {
        track(item.link, item.redirect);

        return {
          name: item.name,
          type: item.type,
          url: item.link,
          openUrl: item.redirect ?? item.link,
          description: item.description ?? '',
        };
      });
  }

  async function runShow(args: z.infer<typeof schemas.show>) {
    const room = limits.maxBlocks - blocks.length;
    if (room <= 0) return { shown: 0, dropped: args.blocks.length, note: 'block limit reached' };

    const wanted = args.blocks.slice(0, room);
    const needs = (type: BlockInput['type']) => wanted.some((block) => block.type === type);

    const [techs, trials, records, known] = await Promise.all([
      maybe(needs('tech'), getTechs),
      maybe(needs('time_trial'), getTrials),
      maybe(needs('world_record'), getRecords),
      maybe(needs('recipe'), getRecipes),
    ]);

    const verified = verifyBlocks(wanted, { techs, trials, records, recipes: known, seenUrls });
    blocks.push(...verified.blocks);

    return {
      shown: verified.blocks.length,
      dropped: verified.dropped,
      note: verified.dropped ? 'dropped blocks did not match real data, do not retry them' : '',
    };
  }

  async function execute(name: string, args: unknown) {
    if (name === 'search_knowledge') return runKnowledge(schemas.search_knowledge.parse(args));
    if (name === 'search_techs') return runTechs(schemas.search_techs.parse(args));
    if (name === 'get_time_trials') return runTrials(schemas.get_time_trials.parse(args));
    if (name === 'get_world_records') return runRecords(schemas.get_world_records.parse(args));
    if (name === 'search_community') return runCommunity(schemas.search_community.parse(args));
    if (name === 'show') return runShow(schemas.show.parse(args));
    throw new Error('unknown tool');
  }

  return {
    blocks,
    autoBlocks,
    seenUrls,
    async run(name: string, raw: string): Promise<string> {
      let args: unknown;

      try {
        args = raw.trim() ? JSON.parse(raw) : {};
      } catch {
        return JSON.stringify({ error: 'arguments were not valid json' });
      }

      try {
        return JSON.stringify({ result: await execute(name, args) });
      } catch (error) {
        if (error instanceof z.ZodError) return JSON.stringify({ error: 'arguments did not match the tool schema' });
        return JSON.stringify({ error: `${name} is unavailable right now` });
      }
    },
  };
}

export type Toolkit = ReturnType<typeof createToolkit>;
