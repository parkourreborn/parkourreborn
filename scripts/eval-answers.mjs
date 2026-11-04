// End-to-end answer check against a running Reborn AI. Uses real model
// requests (about 25 of the day's free OpenRouter quota), so it is run by
// hand, not in npm test.
//
//   node scripts/eval-answers.mjs                     # http://localhost:3000
//   node scripts/eval-answers.mjs https://your-preview.vercel.app
//
// Each case lists facts the answer must state and/or card types it must
// show. A fact passes when it appears in the answer; when it does not, and
// TYPESAFE_API_KEY is set, Jev judges whether the answer states it in other
// words.

import { readFileSync } from 'node:fs';

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const cases = readFileSync(new URL('../src/lib/reborn-ai/eval/answers.jsonl', import.meta.url), 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

async function ask(question) {
  const response = await fetch(`${base}/api/reborn-ai/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: question }] }),
  });
  if (!response.ok) return { text: '', cards: [], error: `HTTP ${response.status}` };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let cards = [];
  let error = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';
    for (const chunk of chunks) {
      if (!chunk.startsWith('data:')) continue;
      const event = JSON.parse(chunk.slice(5));
      if (event.type === 'text') text += event.delta;
      if (event.type === 'reset') text = '';
      if (event.type === 'blocks') cards = event.blocks.map((block) => block.type);
      if (event.type === 'error') error = event.message;
    }
  }
  return { text, cards, error };
}

async function jevSays(answer, fact) {
  const key = process.env.TYPESAFE_API_KEY?.trim();
  if (!key) return null;
  const response = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.JEV_MODEL?.trim() || 'jev-latest',
      state: { answer, fact },
      questions: { states: { type: 'noul', instructions: 'Does `answer` state `fact` (in any wording)?' } },
    }),
  }).catch(() => null);
  const body = response?.ok ? await response.json() : null;
  return body?.answers?.states?.noul ?? null;
}

let passed = 0;
for (const testCase of cases) {
  const started = Date.now();
  const { text, cards, error } = await ask(testCase.q);
  const problems = [];
  if (error) problems.push(`error: ${error}`);
  for (const fact of testCase.facts ?? []) {
    if (text.toLowerCase().includes(fact.toLowerCase())) continue;
    const judged = await jevSays(text, fact);
    if (judged === null || judged < 0.5) problems.push(`missing "${fact}"${judged === null ? '' : ` (jev ${judged.toFixed(2)})`}`);
  }
  for (const card of testCase.cards ?? []) if (!cards.includes(card)) problems.push(`no ${card} card`);
  if (!problems.length) passed += 1;
  console.log(`${problems.length ? 'FAIL' : 'ok  '} ${testCase.q} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  if (problems.length) console.log(`     ${problems.join('; ')}\n     answer: ${text.replace(/\s+/g, ' ').slice(0, 220)}`);
}
console.log(`\n${passed}/${cases.length} passed`);
process.exitCode = passed === cases.length ? 0 : 1;
