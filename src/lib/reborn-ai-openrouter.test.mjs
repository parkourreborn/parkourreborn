import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';
import { limits as realLimits } from './reborn-ai/limits.ts';
import * as modelList from './reborn-ai/model-list.ts';

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

const optional = { reasoning: 'optional', efforts: [], maxCompletion: null, expired: false };
const encoder = new TextEncoder();

// A fake OpenRouter: each model id maps to a list of scripted replies, one
// per call, so a test can say "404 first, then a good stream".
function setup(t, script, { plan, quota = { remaining: 50 } } = {}) {
  const calls = [];
  const benched = [];
  const order = plan ?? Object.keys(script).map((id) => ({ id, caps: { id, ...optional } }));
  const api = load('./reborn-ai/openrouter.ts', {
    'server-only': {},
    '@/lib/reborn-ai/limits': {
      limits: { ...realLimits, firstTokenMs: 150, reasoningFirstTokenMs: 150, modelIdleMs: 150, queueWaitMs: 300, answerBudgetMs: 5000 },
    },
    '@/lib/reborn-ai/model-list': modelList,
    '@/lib/reborn-ai/models': {
      apiKey: () => 'test-key',
      coolDown: (id, ms) => benched.push({ id, ms }),
      recovered: () => {},
      freeModelQuota: async () => quota,
      modelPlan: async () => order,
    },
  });

  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body);
    const replies = script[body.model];
    const reply = replies.shift();
    assert.ok(reply, `no scripted reply left for ${body.model}`);
    return reply(init);
  };
  t.after(() => {
    globalThis.fetch = realFetch;
  });

  return { api, calls, benched };
}

const json = (status, body, headers = {}) => () => new Response(JSON.stringify(body), { status, headers });

function sse(events, { hang = false } = {}) {
  return (init) => new Response(new ReadableStream({
    start(controller) {
      for (const event of events) controller.enqueue(encoder.encode(typeof event === 'string' ? event : `data: ${JSON.stringify(event)}\n\n`));
      if (hang) {
        init.signal.addEventListener('abort', () => controller.error(new Error('aborted')));
        return;
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  }), { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

const words = (...parts) => parts.map((content) => ({ choices: [{ delta: { content } }] }));
const finish = (reason) => ({ choices: [{ delta: {}, finish_reason: reason }] });
const message = [{ role: 'user', content: 'hi' }];

test('walks the model list until one answers, benching the ones that failed', async (t) => {
  const { api, calls, benched } = setup(t, {
    'gone/model:free': [json(404, { error: { message: 'No endpoints found' } })],
    'busy/model:free': [json(429, { error: { message: 'Provider returned error', metadata: { provider_name: 'X', raw: 'busy' } } })],
    'good/model:free': [sse([...words('Hello', ' there'), finish('stop'), { model: 'good/model:free', usage: { total_tokens: 9 } }])],
  });

  const shown = [];
  const outcome = await api.streamAnswer(message, { onText: (delta) => shown.push(delta) });

  assert.equal(outcome.content, 'Hello there');
  assert.equal(shown.join(''), 'Hello there');
  assert.equal(outcome.cut, false);
  assert.equal(outcome.model, 'good/model:free');
  assert.deepEqual(outcome.attempts.map((item) => item.result), ['gone', 'busy', 'ok']);
  assert.deepEqual(benched.map((item) => item.id), ['gone/model:free', 'busy/model:free']);
  assert.ok(benched[0].ms > benched[1].ms);
  assert.deepEqual(calls[2].reasoning, { effort: 'none' });
  assert.equal(calls[2].max_tokens, realLimits.maxOutputTokens);
});

test('a reply that spent its whole budget thinking moves on to the next model', async (t) => {
  const { api } = setup(t, {
    'thinker/model:free': [sse([finish('length')])],
    'good/model:free': [sse([...words('Answer.'), finish('stop')])],
  });

  const outcome = await api.streamAnswer(message, { onText: () => {} });
  assert.equal(outcome.content, 'Answer.');
  assert.deepEqual(outcome.attempts.map((item) => item.result), ['empty', 'ok']);
});

test('a model that rejects the reasoning setting is retried once without it', async (t) => {
  const { api, calls } = setup(t, {
    'picky/model:free': [
      json(400, { error: { message: 'reasoning is not supported' } }),
      sse([...words('Fine.'), finish('stop')]),
    ],
  });

  const outcome = await api.streamAnswer(message, { onText: () => {} });
  assert.equal(outcome.content, 'Fine.');
  assert.deepEqual(calls[0].reasoning, { effort: 'none' });
  assert.equal('reasoning' in calls[1], false);
});

test('the per-minute limit is waited out on the same model', async (t) => {
  const { api, calls } = setup(t, {
    'only/model:free': [
      json(429, { error: { message: 'Rate limit exceeded: free-models-per-min' } }, { 'retry-after': '0.05' }),
      sse([...words('Back.'), finish('stop')]),
    ],
  });

  const states = [];
  const outcome = await api.streamAnswer(message, { onText: () => {}, onStatus: (state) => states.push(state) });
  assert.equal(outcome.content, 'Back.');
  assert.equal(calls.length, 2);
  assert.deepEqual(states, ['queued', 'writing']);
});

test('running out of free requests for the day stops right away', async (t) => {
  const { api, calls } = setup(t, {
    'first/model:free': [json(429, { error: { message: 'Rate limit exceeded: free-models-per-day' } })],
    'second/model:free': [sse([...words('never'), finish('stop')])],
  });

  await assert.rejects(api.streamAnswer(message, { onText: () => {} }), (error) => error instanceof api.ModelError && error.kind === 'quota');
  assert.equal(calls.length, 1);
});

test('a stream that breaks after text keeps that text instead of switching models', async (t) => {
  const { api, calls } = setup(t, {
    'flaky/model:free': [sse([...words('Half an'), { error: { code: 502, message: 'upstream died' }, choices: [{ delta: {}, finish_reason: 'error' }] }])],
    'good/model:free': [sse([...words('never'), finish('stop')])],
  });

  const outcome = await api.streamAnswer(message, { onText: () => {} });
  assert.equal(outcome.content, 'Half an');
  assert.equal(outcome.cut, true);
  assert.equal(calls.length, 1);
});

test('a model that never sends its first word is dropped after the timeout', async (t) => {
  const { api } = setup(t, {
    'slow/model:free': [sse([': OPENROUTER PROCESSING\n\n'], { hang: true })],
    'good/model:free': [sse([...words('Quick.'), finish('stop')])],
  });

  const outcome = await api.streamAnswer(message, { onText: () => {} });
  assert.equal(outcome.content, 'Quick.');
  assert.deepEqual(outcome.attempts.map((item) => item.result), ['timeout', 'ok']);
});

test('when every model fails the error says why', async (t) => {
  const { api } = setup(t, {
    'a/model:free': [json(429, { error: { message: 'busy', metadata: { provider_name: 'X' } } })],
    'b/model:free': [json(503, { error: { message: 'down' } })],
  });

  await assert.rejects(api.streamAnswer(message, { onText: () => {} }), (error) => error instanceof api.ModelError && error.kind === 'busy' && error.attempts.length === 2);
});

test('a bad key stops everything instead of trying every model', async (t) => {
  const { api, calls } = setup(t, {
    'a/model:free': [json(401, { error: { message: 'No auth credentials found' } })],
    'b/model:free': [sse([...words('never'), finish('stop')])],
  });

  await assert.rejects(api.streamAnswer(message, { onText: () => {} }), (error) => error instanceof api.ModelError && error.kind === 'auth');
  assert.equal(calls.length, 1);
});
