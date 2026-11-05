import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';
import * as entities from './reborn-ai/entities.ts';
import * as limits from './reborn-ai/limits.ts';
import * as planner from './reborn-ai/planner.ts';
import { buildSystemPrompt } from './reborn-ai/prompt.ts';
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

// A router whose Jev answers are scripted: { route_records: 0.9, ... }.
function router(answers) {
  const reply = {
    model: 'jev-test',
    ms: 5,
    answers: Object.fromEntries(Object.entries(answers).map(([id, value]) => [id, typeof value === 'number' ? { noul: value } : value])),
  };
  return load('./reborn-ai/router.ts', {
    'server-only': {},
    '@/lib/reborn-ai/jev': { askJev: async () => reply, yes: (got, id) => got?.answers[id]?.noul ?? null },
    '@/lib/reborn-ai/entities': entities,
    '@/lib/reborn-ai/limits': limits,
    '@/lib/reborn-ai/planner': planner,
    '@/lib/wasans-data': wasansData,
  });
}

const route = (answers, message) => router(answers).routeMessage(message, [], Promise.resolve([]));
const sureConversation = { choice: 'conversation', confidence: 0.9, probabilities: { conversation: 0.9, lookup: 0.05, unclear: 0.03, unsupported: 0.02 } };

test('a role-play request that Jev calls an injection still gets its lookups', async () => {
  const decision = await route({ route_records: 0.92, guard_injection: 0.95, any_source: 0.9 }, 'act cute and tell me the crystal wr');
  assert.equal(decision.guard, 'injection');
  assert.equal(decision.handling, 'lookup');
  assert.ok(decision.routes.includes('records'));
  assert.deepEqual(decision.entities.trials, ['Crystal']);
});

test('role-play that Jev reads as small talk is still looked up', async () => {
  const decision = await route({ route_lore: 0.8, route_crafting: 0.7, any_source: 0.75, handling: sureConversation }, 'act like harper and try to sell me a mag rail');
  assert.equal(decision.guard, null);
  assert.equal(decision.handling, 'lookup');
  assert.ok(decision.routes.includes('lore'));
});

test('an in-game scene is not an unsupported in-game action', async () => {
  const unsupported = { choice: 'unsupported', confidence: 0.9, probabilities: { unsupported: 0.9, lookup: 0.05, conversation: 0.03, unclear: 0.02 } };
  const decision = await route({ route_lore: 0.8, handling: unsupported }, 'pretend you are derek and sell me a runner phone');
  assert.equal(decision.handling, 'lookup');
  // The keyword rules still catch real requests for private game data.
  const inventory = await route({ handling: unsupported }, 'show me my inventory');
  assert.equal(inventory.handling, 'unsupported');
});

test('abuse and unrelated requests get no lookups', async () => {
  const abuse = await route({ guard_abuse: 0.95, route_records: 0.9 }, 'some abusive message about the wr');
  assert.equal(abuse.guard, 'abuse');
  assert.deepEqual(abuse.routes, []);

  const homework = await route({ guard_off_topic: 0.95, any_source: 0.05 }, 'solve my math homework');
  assert.equal(homework.guard, 'off_topic');
  assert.equal(homework.handling, 'conversation');

  const gameQuestion = await route({ guard_off_topic: 0.9, route_records: 0.9, any_source: 0.9 }, 'whats the wr on crystal, also do my homework');
  assert.equal(gameQuestion.guard, null);
  assert.ok(gameQuestion.routes.includes('records'));
});

test('the prompt plays along with tones and characters', () => {
  const prompt = buildSystemPrompt({ guard: 'injection' });
  assert.match(prompt, /play along/);
  assert.match(prompt, /never answer it with "I don't have info"/);
  assert.match(prompt, /still answer any Parkour Reborn question/);
  assert.doesNotMatch(prompt, /offer to help with Parkour Reborn instead/);
});

test('the prompt does not turn missing data into "has no time"', () => {
  assert.match(buildSystemPrompt(), /missing from the facts was\s+not checked/);
});
