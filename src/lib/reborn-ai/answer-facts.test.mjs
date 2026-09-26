import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { compactQuery, safeAnswer, simpleDefinitionTerm, versionDateAnswer } from './answer-facts.ts';
import { knowledgeExcerpt } from './knowledge-excerpt.ts';

const timeline = await readFile(new URL('../../../knowledge/miscellaneous/update-timeline.md', import.meta.url), 'utf8');

test('version numbers survive query cleanup and map to the right stage', () => {
  assert.equal(compactQuery('when was 1.3?'), '1.3');
  assert.equal(versionDateAnswer('when was 1.3?', timeline), 'Alpha 1.3 released on August 30, 2024. Pre-Alpha 1.3 released on November 16, 2023.');
  assert.equal(versionDateAnswer('when was pre-alpha 1.3?', timeline), 'Pre-Alpha 1.3 released on November 16, 2023.');
  assert.equal(versionDateAnswer('when did Alpha 1.3 release?', timeline), 'Alpha 1.3 released on August 30, 2024.');
  assert.equal(versionDateAnswer('when was 1.31?', timeline), 'Alpha 1.31 released on October 11, 2024.');
  assert.equal(versionDateAnswer('when was 1.3 and what changed?', timeline), null);
});

test('timeline excerpt preserves only the exact version rows', () => {
  const excerpt = knowledgeExcerpt(timeline, '1.3', 'Update Timeline');
  assert.match(excerpt, /\| 1\.3 \| August 30, 2024 \| Alpha \|/);
  assert.match(excerpt, /\| 1\.3 \| November 16, 2023 \| Pre-Alpha \|/);
  assert.doesNotMatch(excerpt, /\| 1\.31 \|/);
  assert.doesNotMatch(excerpt, /\| 1\.73 \|/);
});

test('short glossary definitions and unsupported output', () => {
  assert.equal(simpleDefinitionTerm('what is trimping?'), 'trimping');
  assert.equal(simpleDefinitionTerm('how do I trimp?'), null);
  assert.equal(safeAnswer('Alpha 1.3 released in 2025.', 'when was 1.3?', [{ body: 'Alpha 1.3: August 30, 2024' }]), false);
  assert.equal(safeAnswer('the knowledge base says trimp is crouching on a slope', 'what is trimp?', []), false);
});
