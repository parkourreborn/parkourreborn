import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { autoSummary, chunkDoc, extractRecipes, extractTrials, lintDocs, parseFrontmatter } from '../../scripts/kb/build.mjs';
import { createKnowledgeSearch, expandQuery, focusVersions, matchRecipes } from './reborn-ai/kb-search.ts';

const kb = JSON.parse(readFileSync(new URL('../generated/kb.json', import.meta.url), 'utf8'));
const knowledge = createKnowledgeSearch(kb);
const questions = readFileSync(new URL('./reborn-ai/eval/questions.jsonl', import.meta.url), 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

// Recall@k over the eval set: how often one of the expected docs is among the
// chunks search hands the model. Runs with no model calls, so it is free.
function recall(k) {
  const misses = [];
  for (const { q, docs } of questions) {
    const found = knowledge.search(q, k).map((hit) => hit.chunk.doc);
    if (!docs.some((doc) => found.includes(doc))) misses.push(`${q} -> ${found.slice(0, 3).join(', ') || 'nothing'}`);
  }
  return { rate: 1 - misses.length / questions.length, misses };
}

test('every doc in the knowledge base has at least one eval question', () => {
  const covered = new Set(questions.flatMap((question) => question.docs));
  const missing = kb.docs.map((doc) => doc.id).filter((id) => !covered.has(id));
  assert.deepEqual(missing, []);
});

test('search finds an expected doc for nearly every eval question', () => {
  const top10 = recall(10);
  const top3 = recall(3);
  if (top10.misses.length) console.log(`missed in top 10:\n  ${top10.misses.join('\n  ')}`);
  console.log(`recall@3 ${(top3.rate * 100).toFixed(1)}%  recall@10 ${(top10.rate * 100).toFixed(1)}%  (${questions.length} questions)`);
  assert.ok(top10.rate >= 0.95, `recall@10 fell to ${top10.rate}`);
  assert.ok(top3.rate >= 0.85, `recall@3 fell to ${top3.rate}`);
});

test('frontmatter, summaries and chunk breadcrumbs', () => {
  const { meta, body } = parseFrontmatter('---\ntitle: Grappler\ncategory: gear\naliases:\n  - grapple\ntags: [gear, augment]\n---\nThe Grappler pulls you. More text.\n\n## Yank Grappler\nFaster pull.');
  assert.equal(meta.title, 'Grappler');
  assert.deepEqual(meta.aliases, ['grapple']);
  assert.deepEqual(meta.tags, ['gear', 'augment']);
  assert.equal(autoSummary(body, 'Grappler'), 'The Grappler pulls you.');
  assert.equal(autoSummary('## A\n## B', 'Doc'), 'Doc: A, B');

  const chunks = chunkDoc({ id: 'gear/grappler.md', title: 'Grappler', category: 'gear', summary: '', aliases: [], tags: [], questions: [], body });
  assert.deepEqual(chunks.map((chunk) => chunk.breadcrumb), ['Gear › Grappler', 'Gear › Grappler › Yank Grappler']);
  assert.match(chunks[1].text, /^Gear › Grappler › Yank Grappler\nFaster pull\.$/);
});

test('recipes come out of the crafting docs as data and out of the text', () => {
  const { recipes, body } = extractRecipes('## Yank Grappler I\nRecipe:\n* Middle: Base Grappler\n* Override Module ×1\n* Fittings x2\n\nNotes here.');
  assert.deepEqual(recipes, [{ item: 'Yank Grappler I', middle: 'Base Grappler', items: [{ name: 'Override Module', quantity: 1 }, { name: 'Fittings', quantity: 2 }] }]);
  assert.ok(!body.includes('Override Module'));
  assert.match(body, /recipe card/);
  assert.equal(kb.recipes.length, 15);
});

test('trial locations come out of the district tables', () => {
  const trials = extractTrials('| Time Trial | Difficulty | Location |\n| :-- | --: | :-- |\n| Wisp | Moderate | At the garage |', 'Stack');
  assert.deepEqual(trials, [{ name: 'Wisp', district: 'Stack', difficulty: 'Moderate', location: 'At the garage' }]);
  assert.equal(kb.trials.length, 24);
});

test('lint catches broken docs', () => {
  const doc = { id: 'a.md', title: 'A', category: 'x', aliases: [], tags: ['x'], related: ['missing'], updated: 'soon', body: 'short' };
  const { errors, stubs } = lintDocs([doc, { ...doc, id: 'b.md', aliases: ['b'], related: [], updated: '' }]);
  assert.ok(errors.some((error) => error.includes('alias')));
  assert.ok(errors.some((error) => error.includes('related link')));
  assert.ok(errors.some((error) => error.includes('updated')));
  assert.ok(errors.some((error) => error.includes('same title')));
  assert.deepEqual(stubs, ['a.md', 'b.md']);
});

test('slang expands, versions focus, recipes match the tier asked for', () => {
  assert.match(expandQuery('how do i wb', kb.synonyms), /wallbounce/);
  assert.equal(expandQuery('hello there', kb.synonyms), '');

  const table = 'Intro\n| Version | Date |\n| :-- | :-- |\n| 1.73 | June 5, 2026 |\n| 1.72 | March 6, 2026 |';
  assert.equal(focusVersions(table, 'when did 1.73 come out'), 'Intro\n| Version | Date |\n| :-- | :-- |\n| 1.73 | June 5, 2026 |');

  const names = (query) => matchRecipes(query, kb.recipes).map((recipe) => recipe.item);
  assert.deepEqual(names('yank grappler 2 recipe'), ['Yank Grappler II']);
  assert.deepEqual(names('how do i craft the grappler'), ['Base Grappler']);
  assert.deepEqual(names('how do i make a yank grappler'), ['Yank Grappler I', 'Yank Grappler II']);
  assert.deepEqual(names('what is the weather'), []);
});
