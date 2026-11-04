import assert from 'node:assert/strict';
import test from 'node:test';
import { answerNumbers, allowedNumbers, checkAnswer, normalizeNumber, rewriteRequest } from './reborn-ai/answer-facts.ts';
import { answerStream, plainExcerpt, rescueText, splitCards, visibleEnd } from './reborn-ai/answer-text.ts';
import { classifyFailure, cooldownFor, parseModelList, readCaps, reasoningSettings } from './reborn-ai/model-list.ts';

test('model list keeps env order, drops duplicates, blanks and paid models', () => {
  const { models, rejected } = parseModelList(' a/one:free, b/two:free ,, a/one:free, openai/gpt-5, openrouter/free ');
  assert.deepEqual(models, ['a/one:free', 'b/two:free', 'openrouter/free']);
  assert.deepEqual(rejected, ['openai/gpt-5']);
  assert.deepEqual(parseModelList(undefined).models, []);
  assert.deepEqual(parseModelList('solo/model:free').models, ['solo/model:free']);
});

test('model capabilities come from the OpenRouter catalog entry', () => {
  const optional = readCaps({
    id: 'nvidia/nemotron-3.5-super-vl:free',
    supported_parameters: ['reasoning', 'max_tokens'],
    reasoning: { mandatory: false },
    top_provider: { max_completion_tokens: 131072 },
  });
  assert.equal(optional.reasoning, 'optional');
  assert.equal(optional.expired, false);

  const mandatory = readCaps({ id: 'x/think:free', supported_parameters: ['reasoning'], reasoning: { mandatory: true } });
  assert.equal(mandatory.reasoning, 'mandatory');

  const plain = readCaps({ id: 'x/plain:free', supported_parameters: ['max_tokens'] });
  assert.equal(plain.reasoning, 'unsupported');

  const old = readCaps({ id: 'x/old:free', expiration_date: '2020-01-01' });
  assert.equal(old.expired, true);
  assert.equal(readCaps({}), null);
});

test('reasoning is switched off when allowed and budgeted when not', () => {
  const optional = reasoningSettings({ id: 'a', reasoning: 'optional', efforts: [], maxCompletion: null, expired: false }, 2000, 3000);
  assert.deepEqual(optional, { reasoning: { effort: 'none' }, maxTokens: 2000, slow: false });

  const mandatory = reasoningSettings({ id: 'b', reasoning: 'mandatory', efforts: [], maxCompletion: null, expired: false }, 2000, 3000);
  assert.deepEqual(mandatory, { reasoning: { effort: 'low' }, maxTokens: 5000, slow: true });

  const picky = reasoningSettings({ id: 'c', reasoning: 'mandatory', efforts: ['high', 'medium'], maxCompletion: 4000, expired: false }, 2000, 3000);
  assert.deepEqual(picky, { reasoning: { effort: 'medium' }, maxTokens: 4000, slow: true });

  const none = reasoningSettings({ id: 'd', reasoning: 'unsupported', efforts: [], maxCompletion: null, expired: false }, 2000, 3000);
  assert.deepEqual(none, { maxTokens: 2000, slow: false });

  const unknown = reasoningSettings(undefined, 2000, 3000);
  assert.equal(unknown.maxTokens, 5000);
});

test('OpenRouter failures are sorted into what to do next', () => {
  assert.equal(classifyFailure(401, null), 'auth');
  assert.equal(classifyFailure(404, null), 'gone');
  assert.equal(classifyFailure(400, null), 'bad_request');
  assert.equal(classifyFailure(503, null), 'error');
  assert.equal(classifyFailure(429, { error: { message: 'Provider returned error', metadata: { provider_name: 'Chutes', raw: 'busy' } } }), 'busy');
  assert.equal(classifyFailure(429, { error: { message: 'x', metadata: { limit_source: 'upstream_provider_shared_pool' } } }), 'busy');
  assert.equal(classifyFailure(429, { error: { message: 'Rate limit exceeded: free-models-per-day' } }), 'daily');
  assert.equal(classifyFailure(429, { error: { message: 'Rate limit exceeded: free-models-per-min' } }), 'minute');
  assert.equal(cooldownFor('minute'), 0);
  assert.ok(cooldownFor('gone') > cooldownFor('busy'));
});

test('numbers compare by value, not by how they are written', () => {
  assert.equal(normalizeNumber('10.000'), '10');
  assert.equal(normalizeNumber('06.390'), '6.39');
  assert.equal(normalizeNumber('1.2.3'), '1.2.3');

  const allowed = allowedNumbers(['{"platinum":"10.000","wr":"6.391"}', 'there are two grapplers']);
  assert.ok(allowed.has('10'));
  assert.ok(allowed.has('6.391'));
  assert.ok(allowed.has('2'));
  assert.deepEqual(answerNumbers('1. jump\n2. slide for 6.39s\n3. land'), ['6.39']);
});

test('answer check passes real answers and flags made-up numbers', () => {
  const facts = [{ result: [{ name: 'Crystal', platinum: '10.000', wr: '5.951' }] }];
  const base = { hasCards: false, question: 'plat time on crystal?', history: [], facts, checkNumbers: true };

  assert.deepEqual(checkAnswer({ ...base, answer: 'Platinum on **Crystal** is 10 seconds, and the WR is 5.951.' }), { ok: true });
  assert.deepEqual(checkAnswer({ ...base, answer: 'The evidence says platinum on Crystal is 10.000.' }), { ok: true });

  const made = checkAnswer({ ...base, answer: 'Platinum is 9.5 seconds.' });
  assert.equal(made.ok, false);
  assert.deepEqual(made.unsupported, ['9.5']);
  assert.match(rewriteRequest(made), /9\.5/);

  assert.equal(checkAnswer({ ...base, answer: 'As my system prompt says...' }).ok, false);
  assert.equal(checkAnswer({ ...base, answer: '   ' }).ok, false);
  assert.deepEqual(checkAnswer({ ...base, answer: '', hasCards: true }), { ok: true });
  assert.deepEqual(checkAnswer({ ...base, answer: 'it is 42', checkNumbers: false }), { ok: true });
});

test('card markers never show while streaming and are read at the end', () => {
  assert.equal(visibleEnd('hello [[car'), 6);
  assert.equal(visibleEnd('hello ['), 6);
  assert.equal(visibleEnd('see [this] note'), 15);

  assert.deepEqual(splitCards('Here you go.\n[[cards:0, 2]]'), { text: 'Here you go.', indexes: [0, 2] });
  assert.deepEqual(splitCards('Here [[cards:1]] you go.'), { text: 'Here  you go.', indexes: [1] });
  assert.deepEqual(splitCards('Cut off answer [[cards:0'), { text: 'Cut off answer', indexes: [] });

  const shown = [];
  const stream = answerStream((delta) => shown.push(delta));
  for (const piece of ['The WR ', 'is 5.951', '.\n[', '[cards:', '0]]']) stream.push(piece);
  const { answer, indexes } = stream.finish();
  assert.equal(shown.join(''), 'The WR is 5.951.\n');
  assert.equal(answer, 'The WR is 5.951.');
  assert.deepEqual(indexes, [0]);

  const late = [];
  const second = answerStream((delta) => late.push(delta));
  for (const piece of ['a [[cards:1]]', ' and more']) second.push(piece);
  assert.equal(second.finish().answer, 'a  and more');
  assert.equal(late.join(''), 'a  and more');
});

test('last-resort text turns guide markdown into readable chat text', () => {
  const body = '## Yank Grappler\n| Level | Effect |\n| --- | --- |\n| 1 | +25% pull |\n* faster windup';
  assert.equal(plainExcerpt(body, 500), 'Yank Grappler\nLevel · Effect\n1 · +25% pull\n• faster windup');

  const text = rescueText([{ result: [{ title: 'Grappler', body }] }], 'busy', false);
  assert.match(text, /busy/);
  assert.match(text, /\*\*Grappler\*\*/);
  assert.equal(rescueText([{ result: null }], 'quota', false), null);
  assert.match(rescueText([{ result: [] }], 'quota', true), /free answers/);
});
