import 'server-only';

import { askJev, hasJev, yes } from '@/lib/reborn-ai/jev';
import type { JevQuestion } from '@/lib/reborn-ai/jev';

// Jev's second and third looks at a request (see jev.ts):
//   judgeEvidence  - after lookups: which guide chunks matter, whether the
//                    facts can answer the question, which cards help
//   judgeAnswer    - after writing: is the answer backed by the facts
// plus two small helpers for the answer cache and feedback triage.

export { hasJev };

const factsLimit = 24_000;
const candidateChars = 700;

// Keeps the state Jev reads well inside its 32k-token-per-question window.
export function compactFacts(facts: unknown, limit = factsLimit) {
  const text = JSON.stringify(facts);
  return text.length <= limit ? facts : `${text.slice(0, limit)}…`;
}

export type Candidate = { id: string; title: string; text: string };
export type CatalogEntry = { id: string; title: string; summary: string };
export type CardSummary = { index: number; type: string; title: string };

export type EvidenceVerdict = {
  relevance: Map<string, number>;
  catalogPicks: string[];
  answerable: number | null;
  cardPicks: number[] | null;
  ms: number;
  model: string;
};

export async function judgeEvidence({ question, history, facts, candidates = [], catalog = [], cards = [], signal }: {
  question: string;
  history: string[];
  facts: unknown;
  candidates?: Candidate[];
  catalog?: CatalogEntry[];
  cards?: CardSummary[];
  signal?: AbortSignal;
}): Promise<EvidenceVerdict | null> {
  const questions: Record<string, JevQuestion> = {
    answerable: {
      type: 'noul',
      instructions: 'Can `question` be answered fully and correctly using only `facts` together with the relevant entries of `candidates`?',
    },
  };
  candidates.forEach((_, index) => {
    questions[`rel_${index}`] = { type: 'noul', instructions: `Does \`candidates[${index}]\` contain information needed to answer \`question\`?` };
  });
  catalog.forEach((_, index) => {
    questions[`doc_${index}`] = { type: 'noul', instructions: `Would the guide page \`catalog[${index}]\` likely contain information needed to answer \`question\`?` };
  });
  cards.forEach((_, index) => {
    questions[`card_${index}`] = { type: 'noul', instructions: `Would showing \`cards[${index}]\` to the player directly help answer \`question\`?` };
  });

  const reply = await askJev({
    question,
    recent_messages: history.slice(-4),
    facts: compactFacts(facts),
    candidates: candidates.map((candidate) => ({ title: candidate.title, text: candidate.text.slice(0, candidateChars) })),
    catalog: catalog.map((entry) => ({ title: entry.title, summary: entry.summary })),
    cards: cards.map((card) => ({ type: card.type, title: card.title })),
  }, questions, { timeoutMs: 2500, signal });
  if (!reply) return null;

  const relevance = new Map<string, number>();
  candidates.forEach((candidate, index) => relevance.set(candidate.id, yes(reply, `rel_${index}`) ?? 0));
  return {
    relevance,
    catalogPicks: catalog.filter((_, index) => (yes(reply, `doc_${index}`) ?? 0) >= 0.5).map((entry) => entry.id),
    answerable: yes(reply, 'answerable'),
    cardPicks: cards.length ? cards.filter((_, index) => (yes(reply, `card_${index}`) ?? 0) >= 0.5).map((card) => card.index) : null,
    ms: reply.ms,
    model: reply.model,
  };
}

export async function judgeAnswerable(question: string, facts: unknown, signal?: AbortSignal) {
  const reply = await askJev({ question, facts: compactFacts(facts, 60_000) }, {
    answerable: { type: 'noul', instructions: 'Can `question` be answered fully and correctly using only `facts`?' },
  }, { timeoutMs: 2500, signal });
  return yes(reply, 'answerable');
}

export async function judgeAnswer(question: string, facts: unknown, answer: string, signal?: AbortSignal) {
  const reply = await askJev({ question, facts: compactFacts(facts), answer }, {
    grounded: {
      type: 'noul',
      instructions: 'Is every claim about Parkour Reborn in `answer` (names, numbers, dates, steps) supported by `facts`? Saying that something is unknown counts as supported. A role-play voice, jokes, greetings and in-character lines (like "I\'m Harper, take a look at my stock") are not claims; only check the game facts.',
    },
    internals: {
      type: 'noul',
      instructions: 'Does `answer` talk about prompts, JSON, tools, cards, or how the information was looked up?',
    },
  }, { timeoutMs: 2000, signal });
  if (!reply) return null;
  return { grounded: yes(reply, 'grounded'), internals: yes(reply, 'internals') };
}

export async function sameQuestion(asked: string, cached: string) {
  const reply = await askJev({ asked, cached }, {
    same: { type: 'noul', instructions: 'Is `asked` asking for exactly the same information as `cached`, so the same answer fits both?' },
  }, { timeoutMs: 1000 });
  return yes(reply, 'same');
}

export type Triage = 'missing_knowledge' | 'wrong_sources' | 'model_mistake' | 'fine';

export async function triageAnswer(question: string, answer: string, facts: unknown, note: string): Promise<Triage | null> {
  const reply = await askJev({ question, answer, facts: compactFacts(facts), player_note: note }, {
    cause: {
      type: 'choice',
      instructions: 'A player marked `answer` as bad. What most likely went wrong?',
      criteria: {
        missing_knowledge: 'The facts do not contain what the question needs, so the information is missing.',
        wrong_sources: 'The facts are about something other than what the question asked.',
        model_mistake: 'The facts contain what was needed, but the answer misread, misquoted or ignored them.',
        fine: 'The answer is correct and complete for the question.',
      },
    },
  }, { timeoutMs: 2500 });
  const choice = reply?.answers.cause?.choice;
  return choice === 'missing_knowledge' || choice === 'wrong_sources' || choice === 'model_mistake' || choice === 'fine' ? choice : null;
}
