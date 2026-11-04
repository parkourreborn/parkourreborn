// Runs every Wasans-backed Reborn AI tool against the live Wasans API and
// prints a short view of each result. Firestore is stubbed out, so no keys
// are needed:  node --experimental-strip-types scripts/try-wasans-tools.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';
import * as zod from 'zod';
import * as calculators from '../src/lib/reborn-ai/calculators.ts';
import { createKnowledgeSearch, focusVersions, matchRecipes } from '../src/lib/reborn-ai/kb-search.ts';
import * as limits from '../src/lib/reborn-ai/limits.ts';
import * as wasansData from '../src/lib/wasans-data.ts';

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

const swr = load('../src/lib/server/swr.ts', {});
const wasans = load('../src/lib/server/wasans.ts', { 'server-only': {}, '@/lib/reborn-ai/limits': limits, '@/lib/server/swr': swr });
const kb = JSON.parse(readFileSync(new URL('../src/generated/kb.json', import.meta.url), 'utf8'));
const trials = [{ name: 'Crystal', district: 'Downtown', difficulty: 'Basic', bronzeTime: '25', silverTime: '18', goldTime: '14', platinumTime: '10.5', videoURL: '', videoURL2: '' }];

const tools = load('../src/lib/reborn-ai/tools.ts', {
  'server-only': {},
  zod,
  '@/lib/pages/techlist': { searchTechs: () => [] },
  '@/lib/pages/time': { formatTime: (value) => Number(value).toFixed(3) },
  '@/lib/pages/timetrials': { wrVideoURL: (id) => (id ? `https://assets.wasans.tully.sh/scores/${id}.mp4` : '') },
  '@/lib/reborn-ai/calculators': calculators,
  '@/lib/reborn-ai/kb-search': { focusVersions, matchRecipes },
  '@/lib/reborn-ai/knowledge-retriever': { knowledge: createKnowledgeSearch(kb) },
  '@/lib/reborn-ai/limits': limits,
  '@/lib/reborn-ai/recipes': { recipeBlock: (recipe) => ({ type: 'recipe', item: recipe.item }) },
  '@/lib/server/reborn-ai-data': {
    loadTechs: async () => ({ data: [], checkedAt: '' }),
    loadTimeTrials: async () => ({ data: trials, checkedAt: '' }),
    loadCommunityResources: async () => ({ data: [], checkedAt: '' }),
  },
  '@/lib/server/wasans': wasans,
  '@/lib/url': { cleanPathPart: (value) => String(value ?? '').replace(/[^A-Za-z0-9_-]/g, '') },
  '@/lib/wasans-data': wasansData,
});

const top = (await wasans.playerIndex())[0];
console.log(`player index: ${(await wasans.playerIndex()).length} players, #1 ${top.name}`);
const kit = tools.createToolkit({ discordId: top.discordId, name: top.name });

const calls = [
  ['get_world_records', { trial: 'Crystal' }],
  ['get_world_records', { limit: 25, summary: true }],
  ['get_wr_history', { trial: 'Crystal' }],
  ['get_trial_leaderboard', { trial: 'Neon Bold', limit: 5, player: 'me' }],
  ['get_overall_leaderboard', { limit: 5, player: top.name }],
  ['get_combo_leaderboard', { category: 'mag', limit: 3 }],
  ['get_combo_leaderboard', {}],
  ['get_player', { player: 'me' }],
  ['get_player', { player: 'nobody-by-this-name' }],
  ['get_player_analytics', { player: top.name }],
  ['get_trial_stats', { trial: 'Crystal', range: '30d' }],
  ['get_site_stats', { range: '30d' }],
  ['get_recent_runs', { trial: 'Glass', limit: 3 }],
  ['get_wasans_announcements', {}],
  ['wasans_score', { trial: 'Crystal', time: 7.2 }],
  ['time_for_score', { trial: 'Crystal', score: 0.8 }],
  ['tier_for_score', { score: 0.65 }],
  ['time_gaps', { trial: 'Crystal', time: 12 }],
  ['xp_progress', { level: 20, target: 35, multiplier: 1.5 }],
];

let failed = 0;
for (const [name, args] of calls) {
  const started = Date.now();
  const outcome = await kit.lookup(name, args);
  if (outcome.status !== 'ok') failed += 1;
  const text = JSON.stringify(outcome.result ?? outcome.error);
  console.log(`\n${outcome.status === 'ok' ? 'ok ' : 'ERR'} ${name} ${JSON.stringify(args)} (${Date.now() - started}ms)\n    ${text.slice(0, 420)}${text.length > 420 ? '…' : ''}`);
}
console.log(`\ncards suggested: ${kit.autoBlocks.map((block) => `${block.type}:${block.title ?? block.name ?? block.trial ?? ''}`).join(', ')}`);
console.log(failed ? `\n${failed} tool calls failed` : '\nall tool calls succeeded');
process.exitCode = failed ? 1 : 0;
