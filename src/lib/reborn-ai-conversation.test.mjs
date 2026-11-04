import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';
import * as zod from 'zod';
import * as answerFacts from './reborn-ai/answer-facts.ts';
import * as answerText from './reborn-ai/answer-text.ts';
import * as limits from './reborn-ai/limits.ts';
import * as prompt from './reborn-ai/prompt.ts';

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

const record = { trial: 'Crystal', player: 'jahz', time: '5.951', wasansScore: '1.000', submissionUrl: '', videoUrl: '' };
const guide = { id: 'gear/grappler.md', title: 'Grappler', aliases: [], category: 'gear', body: 'The Grappler is an augment gear on the left arm.\n\n## Yank Grappler\n* +25% pull strength' };

// drafts: what each model call writes, in order. A string streams in pieces,
// an Error is thrown as if every model failed.
function run(t, { routes, result, cards = [], drafts }) {
  t.mock.method(console, 'info', () => {});
  t.mock.method(console, 'error', () => {});
  const prompts = [];

  const manager = load('./reborn-ai/conversation-manager.ts', {
    'server-only': {},
    zod,
    '@/lib/reborn-ai/answer-facts': answerFacts,
    '@/lib/reborn-ai/answer-text': answerText,
    '@/lib/reborn-ai/limits': limits,
    '@/lib/reborn-ai/models': { configuredModels: () => ['a/model:free'] },
    '@/lib/reborn-ai/prompt': prompt,
    '@/lib/reborn-ai/router': {
      routeMessage: async () => ({ routes, handling: routes.length ? 'lookup' : 'conversation', usedJev: false }),
    },
    '@/lib/reborn-ai/tools': {
      createToolkit: () => ({
        autoBlocks: cards,
        lookup: async () => ({ status: 'ok', result, checkedAt: '2026-11-04T12:00:00.000Z' }),
      }),
    },
    '@/lib/reborn-ai/openrouter': {
      ModelError,
      streamAnswer: async (messages, { onText }) => {
        prompts.push(messages);
        const draft = drafts.shift();
        if (draft instanceof Error) throw draft;
        for (const piece of draft.match(/.{1,7}/gs)) onText(piece);
        return { content: draft, model: 'a/model:free', cut: false, attempts: [{ model: 'a/model:free', result: 'ok', ms: 5 }] };
      },
    },
  });

  return async (question) => {
    const events = [];
    await manager.runConversation({ messages: [{ role: 'user', content: question }] }, '', (event) => events.push(event));
    let text = '';
    for (const event of events) {
      if (event.type === 'reset') text = '';
      if (event.type === 'text') text += event.delta;
    }
    return { events, text, prompts, types: events.map((event) => event.type) };
  };
}

const wrCard = { type: 'world_record', ...record };

test('answers stream with the card marker hidden and the chosen cards attached', async (t) => {
  const ask = run(t, { routes: ['records'], result: [record], cards: [wrCard], drafts: ['The Crystal WR is 5.951 by jahz.\n[[cards:0]]'] });
  const { events, text, types, prompts } = await ask('wr on crystal?');

  assert.equal(text.trim(), 'The Crystal WR is 5.951 by jahz.');
  assert.ok(types.filter((type) => type === 'text').length > 1, 'text should arrive in pieces');
  assert.deepEqual(events.find((event) => event.type === 'blocks').blocks, [wrCard]);
  assert.equal(types.at(-1), 'done');
  assert.ok(!types.includes('reset'));
  assert.ok('facts' in JSON.parse(prompts[0][1].content));
});

test('a draft with a made-up number is rewritten once', async (t) => {
  const ask = run(t, { routes: ['records'], result: [record], drafts: ['The WR is 5.2 seconds.', 'The WR is 5.951 seconds.'] });
  const { text, types, prompts } = await ask('wr on crystal?');

  assert.equal(text, 'The WR is 5.951 seconds.');
  assert.ok(types.includes('reset'));
  assert.equal(prompts.length, 2);
  assert.match(prompts[1].at(-1).content, /5\.2/);
  assert.equal(types.at(-1), 'done');
});

test('a second bad draft is kept with a note rather than thrown away', async (t) => {
  const ask = run(t, { routes: ['records'], result: [record], drafts: ['The WR is 5.2.', 'The WR is 5.3.'] });
  const { text, types } = await ask('wr on crystal?');

  assert.match(text, /^The WR is 5\.3\./);
  assert.match(text, /double-check/);
  assert.equal(types.at(-1), 'done');
});

test('if the rewrite cannot run, the first draft comes back', async (t) => {
  const ask = run(t, { routes: ['records'], result: [record], drafts: ['The WR is 5.2.', new ModelError('busy', 'no model answered')] });
  const { text, types } = await ask('wr on crystal?');

  assert.match(text, /^The WR is 5\.2\./);
  assert.equal(types.at(-1), 'done');
});

test('when no model answers, the facts already found are shown instead of an error', async (t) => {
  const ask = run(t, { routes: ['game_knowledge'], result: [guide], drafts: [new ModelError('busy', 'no model answered')] });
  const { text, types } = await ask('how does the grappler work');

  assert.match(text, /busy/);
  assert.match(text, /\*\*Grappler\*\*/);
  assert.match(text, /\+25% pull strength/);
  assert.ok(!types.includes('error'));
  assert.equal(types.at(-1), 'done');
});

test('with nothing to show, the failure is reported and marked retryable', async (t) => {
  const ask = run(t, { routes: [], result: [], drafts: [new ModelError('busy', 'no model answered')] });
  const { events } = await ask('hello');

  const error = events.find((event) => event.type === 'error');
  assert.equal(error.retryable, true);
  assert.match(error.message, /busy/);
});

test('a used-up daily quota is not offered as retryable', async (t) => {
  const ask = run(t, { routes: [], result: [], drafts: [new ModelError('quota', 'free requests used up for today')] });
  const { events } = await ask('hello');

  const error = events.find((event) => event.type === 'error');
  assert.equal(error.retryable, false);
  assert.match(error.message, /today/);
});
