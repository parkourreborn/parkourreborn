import 'server-only';

import { createHash } from 'crypto';
import type { AssistantBlock } from '@/lib/reborn-ai/types';

// Recent answers, kept in memory per server instance. A hit needs the same
// question (after normalising) and the same facts behind it, so an answer is
// never reused once the data it was written from has changed. Saves free
// requests on the questions everyone asks ("wr on crystal").

type Entry = { at: number; question: string; fingerprint: string; text: string; blocks: AssistantBlock[]; model: string };

const entries = new Map<string, Entry>();
const maxEntries = 300;

export function normalizeQuestion(question: string) {
  return question.toLowerCase().replace(/[^\p{L}\p{N}.\s]+/gu, ' ').replace(/\s+/g, ' ').trim().replace(/\.$/, '');
}

// What the answer was written from: routes, style, facts (minus the times
// they were checked, which change on every refresh), cards and the guide
// version.
export function factsFingerprint(parts: unknown) {
  const text = JSON.stringify(parts, (name, value) => (name === 'checkedAt' ? undefined : value));
  return createHash('sha1').update(text).digest('hex');
}

const keyFor = (question: string, fingerprint: string) => `${normalizeQuestion(question)}|${fingerprint}`;

export function getCached(question: string, fingerprint: string, ttlMs: number) {
  const entry = entries.get(keyFor(question, fingerprint));
  return entry && Date.now() - entry.at < ttlMs ? entry : null;
}

// Other questions answered from exactly the same facts; the caller asks Jev
// whether one of them means the same thing.
export function similarCached(question: string, fingerprint: string, ttlMs: number) {
  const asked = normalizeQuestion(question);
  const now = Date.now();
  return Array.from(entries.values())
    .filter((entry) => entry.fingerprint === fingerprint && now - entry.at < ttlMs && normalizeQuestion(entry.question) !== asked)
    .slice(-3);
}

export function putCached(question: string, fingerprint: string, text: string, blocks: AssistantBlock[], model: string) {
  const key = keyFor(question, fingerprint);
  entries.delete(key);
  entries.set(key, { at: Date.now(), question, fingerprint, text, blocks, model });
  while (entries.size > maxEntries) entries.delete(entries.keys().next().value as string);
}
