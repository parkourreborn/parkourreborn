// Checks that the knowledge search still finds the right docs for known
// questions (scripts/kb/eval-questions.json). Runs offline against
// src/generated/kb.json, so run kb:build first (npm run kb:eval does).
// Needs Node 22.18+ (it imports the TypeScript search module directly).
//
//   npm run kb:eval            exit code 1 if any question misses
//   npm run kb:eval -- -v      also print the top results for every question

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createKnowledgeSearch } from '../../src/lib/reborn-ai/kb-search.ts';

const here = dirname(fileURLToPath(import.meta.url));
const verbose = process.argv.includes('-v');
const kb = JSON.parse(readFileSync(join(here, '..', '..', 'src', 'generated', 'kb.json'), 'utf8'));
const { top, questions } = JSON.parse(readFileSync(join(here, 'eval-questions.json'), 'utf8'));
const search = createKnowledgeSearch(kb);

let missed = 0;
for (const { q, docs, section } of questions) {
  const hits = search.search(q, 10).slice(0, top);
  const found = hits.findIndex(({ chunk }) => docs.includes(chunk.doc) && (!section || chunk.section.toLowerCase().includes(section.toLowerCase())));
  if (found < 0) missed++;
  if (found < 0 || verbose) {
    console.log(`${found < 0 ? 'MISS' : `ok #${found + 1}`}  ${q}  (want ${docs.join(' or ')}${section ? ` › ${section}` : ''})`);
    for (const { chunk } of hits) console.log(`        ${chunk.breadcrumb}`);
  }
}

console.log(`kb eval: ${questions.length - missed}/${questions.length} questions found their doc in the top ${top}`);
if (missed) process.exitCode = 1;
