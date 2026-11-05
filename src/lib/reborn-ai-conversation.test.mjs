import assert from 'node:assert/strict';
import * as crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';
import * as zod from 'zod';
import * as answerFacts from './reborn-ai/answer-facts.ts';
import * as answerText from './reborn-ai/answer-text.ts';
import * as entities from './reborn-ai/entities.ts';
import { createKnowledgeSearch } from './reborn-ai/kb-search.ts';
import * as limits from './reborn-ai/limits.ts';
import * as planner from './reborn-ai/planner.ts';
import * as prompt from './reborn-ai/prompt.ts';
import * as wasansData from './wasans-data.ts';

function load(file, modules) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  runInThisContext(`(function(require, exports) { ${outputText}\n})`)((name) => {
    assert.ok(name in modules, `Unexpected import: ${name}`);
    return modules[name];
  }, exports);
  return exports;
}

class ModelError extends Error {
  constructor(kind, message, attempts = []) {
    super(message);
    this.kind = kind;
    this.attempts = attempts;
  }
}

const kb = JSON.parse(readFileSync(new URL('../generated/kb.json', import.meta.url), 'utf8'));
const knowledge = createKnowledgeSearch(kb);
const record = { trial: 'Crystal', player: 'jahz', time: '5.951', wasansScore: '1.000', setOn: '2026-10-20' };
const wrCard = { type: 'world_record', trial: 'Crystal', player: 'jahz', time: '5.951', wasansScore: '1.000', submissionUrl: '', videoUrl: '' };
const noEntities = entities.extractEntities('');

// drafts: what each model call writes, in order. A string streams in
// pieces, an Error is thrown as if every model failed.
function setup(t, { routes = ['records'], results = { get_world_records: [record] }, cards = [], drafts = [], jev = null, gate, decision = {}, router = null, playerIndex = async () => [] } = {}) {
  t.mock.method(console, 'info', () => {});
  t.mock.method(console, 'error', () => {});
  t.mock.method(console, 'warn', () => {});
  const prompts = [];
  const streams = [];
  const logs = [];
  const gaps = [];
  const lookups = [];

  const cache = load('./reborn-ai/answer-cache.ts', { 'server-only': {}, crypto });
  const manager = load('./reborn-ai/conversation-manager.ts', {
    'server-only': {},
    crypto,
    zod,
    '@/lib/reborn-ai/answer-cache': cache,
    '@/lib/reborn-ai/answer-facts': answerFacts,
    '@/lib/reborn-ai/answer-text': answerText,
    '@/lib/reborn-ai/ai-log': {
      logRequest: (id, entry) => logs.push({ id, ...entry }),
      logGap: (id, entry) => gaps.push({ id, ...entry }),
    },
    '@/lib/reborn-ai/entities': entities,
    '@/lib/reborn-ai/judge': {
      hasJev: () => Boolean(jev),
      judgeEvidence: async (input) => jev?.evidence?.(input) ?? null,
      judgeAnswerable: async () => jev?.answerable ?? null,
      judgeAnswer: async (question, facts, answer) => jev?.answer?.(answer) ?? null,
      sameQuestion: async () => jev?.same ?? null,
    },
    '@/lib/reborn-ai/knowledge-retriever': { knowledge },
    '@/lib/reborn-ai/limits': limits,
    '@/lib/reborn-ai/models': { configuredModels: () => ['a/model:free'], freeModelQuota: async () => ({ remaining: 500 }) },
    '@/lib/reborn-ai/planner': planner,
    '@/lib/reborn-ai/prompt': prompt,
    '@/lib/reborn-ai/router': router ?? {
      routeMessage: async (message) => ({
        routes,
        handling: routes.length ? 'lookup' : 'conversation',
        entities: { ...noEntities, trials: routes.includes('records') ? ['Crystal'] : [] },
        followUp: false,
        style: 1,
        guard: null,
        usedJev: Boolean(jev),
        message,
        ...decision,
      }),
    },
    '@/lib/reborn-ai/tools': {
      createToolkit: () => ({
        autoBlocks: cards,
        lookup: async (name, args) => (lookups.push({ name, args }), name in results
          ? { status: 'ok', result: results[name], checkedAt: '2026-11-04T12:00:00.000Z' }
          : { status: 'ok', result: [], checkedAt: '2026-11-04T12:00:00.000Z' }),
      }),
    },
    '@/lib/reborn-ai/openrouter': {
      ModelError,
      streamAnswer: async (messages, { onText, longPrompt }) => {
        prompts.push(messages);
        streams.push({ longPrompt });
        const draft = drafts.shift();
        assert.ok(draft !== undefined, 'model called more times than scripted');
        if (draft instanceof Error) throw draft;
        for (const piece of draft.match(/.{1,7}/gs) ?? []) onText(piece);
        return { content: draft, model: 'a/model:free', cut: false, attempts: [{ model: 'a/model:free', result: 'ok', ms: 5 }] };
      },
    },
    '@/lib/server/reborn-ai-data': { loadTechs: async () => ({}), loadTimeTrials: async () => ({}) },
    '@/lib/server/wasans': { playerIndex, wasans: { worldRecords: async () => ({}) } },
  });

  const ask = async (question) => {
    const events = [];
    await manager.runConversation({ messages: [{ role: 'user', content: question }] }, (event) => events.push(event), gate ? { gate: Promise.resolve(gate) } : {});
    let text = '';
    for (const event of events) {
      if (event.type === 'reset') text = '';
      if (event.type === 'text') text += event.delta;
    }
    return { events, text, types: events.map((event) => event.type), error: events.find((event) => event.type === 'error'), blocks: events.find((event) => event.type === 'blocks')?.blocks };
  };
  return { ask, prompts, streams, logs, gaps, lookups };
}

test('a one-shot player question finds the player even when the player list is slow', async (t) => {
  const realRouter = load('./reborn-ai/router.ts', {
    'server-only': {},
    '@/lib/reborn-ai/jev': { askJev: async () => null, yes: () => null },
    '@/lib/reborn-ai/entities': entities,
    '@/lib/reborn-ai/limits': limits,
    '@/lib/reborn-ai/planner': planner,
    '@/lib/wasans-data': wasansData,
  });
  // Wasans taking 1.3 s, as on a cold server. Routing used to give up at 1.2 s
  // and treat the question as naming no player.
  const playerIndex = () => new Promise((resolve) => setTimeout(resolve, 1300, [{ name: 'jahz' }, { name: 'sinydrol' }]));
  const { ask, lookups } = setup(t, { router: realRouter, playerIndex, drafts: ['jahz has a run on Ascension.'] });

  await ask("what's jahz time on ascension");
  assert.deepEqual(lookups.find((call) => call.name === 'get_player')?.args, { player: 'jahz' });
  assert.deepEqual(lookups.find((call) => call.name === 'get_trial_leaderboard')?.args, { trial: 'Ascension', limit: 3, player: 'jahz' });
});

test('answers stream with the card marker hidden and the chosen cards attached', async (t) => {
  const { ask, prompts, logs } = setup(t, { cards: [wrCard], drafts: ['The Crystal WR is 5.951 by jahz.\n[[cards:0]]'] });
  const { text, types, blocks } = await ask('wr on crystal?');

  assert.equal(types[0], 'meta');
  assert.equal(text.trim(), 'The Crystal WR is 5.951 by jahz.');
  assert.ok(types.filter((type) => type === 'text').length > 1, 'text should arrive in pieces');
  assert.deepEqual(blocks, [wrCard]);
  assert.equal(types.at(-1), 'done');
  const input = JSON.parse(prompts[0][1].content);
  assert.ok('facts' in input && 'attachments' in input);
  assert.equal(logs[0].outcome, 'answered');
});

test('a draft with a made-up number is rewritten once', async (t) => {
  const { ask, prompts } = setup(t, { drafts: ['The WR is 5.2 seconds.', 'The WR is 5.951 seconds.'] });
  const { text, types } = await ask('wr on crystal?');

  assert.equal(text, 'The WR is 5.951 seconds.');
  assert.ok(types.includes('reset'));
  assert.match(prompts[1].at(-1).content, /5\.2/);
});

test('a second bad draft is kept with a note rather than thrown away', async (t) => {
  const { ask } = setup(t, { drafts: ['The WR is 5.2.', 'The WR is 5.3.'] });
  const { text, types } = await ask('wr on crystal?');

  assert.match(text, /^The WR is 5\.3\./);
  assert.match(text, /double-check/);
  assert.equal(types.at(-1), 'done');
});

test('if the rewrite cannot run, the first draft comes back', async (t) => {
  const { ask } = setup(t, { drafts: ['The WR is 5.2.', new ModelError('busy', 'no model answered')] });
  const { text, types } = await ask('wr on crystal?');

  assert.match(text, /^The WR is 5\.2\./);
  assert.equal(types.at(-1), 'done');
});

test('when no model answers, the facts already found are shown instead of an error', async (t) => {
  const guide = [{ id: 'gear/grappler.md#0', title: 'Grappler', section: '', category: 'gear', body: 'Gear › Grappler\nThe Grappler is an augment gear.\n* +25% pull strength' }];
  const { ask, logs } = setup(t, { routes: ['game_knowledge'], results: { search_knowledge: guide }, drafts: [new ModelError('busy', 'no model answered')] });
  const { text, types } = await ask('how does the grappler work');

  assert.match(text, /busy/);
  assert.match(text, /\+25% pull strength/);
  assert.ok(!types.includes('error'));
  assert.equal(logs[0].outcome, 'rescued');
});

test('with nothing to show, the failure is reported and marked retryable', async (t) => {
  const { ask } = setup(t, { routes: [], results: {}, drafts: [new ModelError('busy', 'no model answered')] });
  const { error } = await ask('hello');
  assert.equal(error.retryable, true);
});

test('a used-up daily quota is not offered as retryable', async (t) => {
  const { ask } = setup(t, { routes: [], results: {}, drafts: [new ModelError('quota', 'free requests used up for today')] });
  const { error } = await ask('hello');
  assert.equal(error.retryable, false);
  assert.match(error.message, /today/);
});

test('cards Jev picks are shown without the model needing a marker', async (t) => {
  const jev = {
    evidence: ({ cards }) => ({ relevance: new Map(), catalogPicks: [], answerable: 0.9, cardPicks: cards.map((card) => card.index), ms: 5, model: 'jev' }),
    answer: () => ({ grounded: 0.95, internals: 0.01 }),
  };
  const { ask, prompts } = setup(t, { cards: [wrCard], drafts: ['The Crystal WR is 5.951 by jahz.'], jev });
  const { blocks } = await ask('wr on crystal?');

  assert.deepEqual(blocks, [wrCard]);
  const input = JSON.parse(prompts[0][1].content);
  assert.ok(!('attachments' in input));
  assert.deepEqual(input.shownCards, [{ type: 'world_record', name: 'Crystal world record' }]);
  assert.match(prompts[0][0].content, /shownCards/);
});

test('when the facts cannot answer, the whole guide is handed over and the gap is logged', async (t) => {
  const jev = {
    evidence: () => ({ relevance: new Map(), catalogPicks: [], answerable: 0.1, cardPicks: [], ms: 5, model: 'jev' }),
    answerable: 0.1,
    answer: () => ({ grounded: 0.9, internals: 0 }),
  };
  const { ask, prompts, streams, gaps } = setup(t, { routes: ['game_knowledge'], results: {}, drafts: ['Here is what the guide says.'], jev });
  await ask('something obscure about the city');

  const input = JSON.parse(prompts[0][1].content);
  assert.ok(input.facts.some((fact) => fact.source === 'Parkour Reborn guide (complete)'));
  assert.equal(streams[0].longPrompt, true);
  assert.match(prompts[0][0].content, /whole Parkour Reborn guide/);
  assert.equal(gaps.length, 1);
  assert.equal(gaps[0].escalated, true);
});

test('the same question with the same facts is answered from the cache', async (t) => {
  const { ask, prompts, logs } = setup(t, { cards: [wrCard], drafts: ['The Crystal WR is 5.951.\n[[cards:0]]'] });
  await ask('WR on Crystal?');
  const second = await ask('wr on crystal');

  assert.equal(prompts.length, 1, 'the model should only be called once');
  assert.equal(second.text, 'The Crystal WR is 5.951.');
  assert.deepEqual(second.blocks, [wrCard]);
  assert.equal(logs[1].outcome, 'cached');
});

test('the rate limit stops the model call', async (t) => {
  const { ask, prompts } = setup(t, { drafts: [], gate: { ok: false, message: 'you’ve hit the reborn ai limit for now, try again in a minute' } });
  const { error } = await ask('wr on crystal?');

  assert.equal(prompts.length, 0);
  assert.equal(error.retryable, false);
  assert.match(error.message, /limit/);
});

test('an answer Jev finds unsupported by the facts is rewritten', async (t) => {
  const jev = {
    evidence: () => ({ relevance: new Map(), catalogPicks: [], answerable: 0.9, cardPicks: [], ms: 5, model: 'jev' }),
    answer: (answer) => ({ grounded: answer.includes('jahz') ? 0.9 : 0.05, internals: 0 }),
  };
  const { ask, prompts } = setup(t, { drafts: ['The Crystal WR is held by Bob.', 'The Crystal WR is held by jahz.'], jev });
  const { text } = await ask('who has the crystal wr?');

  assert.equal(text, 'The Crystal WR is held by jahz.');
  assert.match(prompts[1].at(-1).content, /not backed/);
});

test('Jev reading the facts overrules a number the pattern check missed', async (t) => {
  const jev = {
    evidence: () => ({ relevance: new Map(), catalogPicks: [], answerable: 0.9, cardPicks: [], ms: 5, model: 'jev' }),
    answer: () => ({ grounded: 0.9, internals: 0 }),
  };
  const { ask, prompts } = setup(t, { drafts: ['It has stood for 15 days.'], jev });
  const { text } = await ask('how long has the crystal wr stood?');

  assert.equal(prompts.length, 1);
  assert.equal(text, 'It has stood for 15 days.');
});

test('a guide search riding along with live data keeps only what Jev finds relevant', async (t) => {
  const keep = { relevance: null };
  const jev = {
    evidence: ({ candidates }) => {
      keep.relevance = new Map(candidates.map((candidate) => [candidate.id, candidate.title.includes('Wasans Rules') ? 0.9 : 0.05]));
      return { relevance: keep.relevance, catalogPicks: [], answerable: 0.9, cardPicks: [], ms: 5, model: 'jev' };
    },
    answer: () => ({ grounded: 0.9, internals: 0 }),
  };
  const { ask, prompts } = setup(t, { routes: ['records'], drafts: ['Submit it within a reasonable time.'], jev });
  await ask('what are the rules for submitting a wr');

  const guide = JSON.parse(prompts[0][1].content).facts.find((fact) => fact.source === 'Parkour Reborn guide');
  assert.ok(guide.result.length > 0 && guide.result.length <= 3);
  assert.ok(guide.result.every((chunk) => chunk.title === 'Wasans Rules'));
});
