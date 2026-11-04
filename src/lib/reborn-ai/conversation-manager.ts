import 'server-only';

import { z } from 'zod';
import { checkAnswer, compactQuery, rewriteRequest } from '@/lib/reborn-ai/answer-facts';
import type { AnswerVerdict } from '@/lib/reborn-ai/answer-facts';
import { answerStream, rescueText } from '@/lib/reborn-ai/answer-text';
import type { RescueReason } from '@/lib/reborn-ai/answer-text';
import { limits } from '@/lib/reborn-ai/limits';
import { configuredModels } from '@/lib/reborn-ai/models';
import { ModelError, streamAnswer } from '@/lib/reborn-ai/openrouter';
import type { AnswerOutcome, AttemptLog, ModelMessage } from '@/lib/reborn-ai/openrouter';
import { buildSystemPrompt } from '@/lib/reborn-ai/prompt';
import { routeMessage } from '@/lib/reborn-ai/router';
import type { RouteName } from '@/lib/reborn-ai/router';
import { createToolkit } from '@/lib/reborn-ai/tools';
import type { AssistantBlock, ChatEvent, ChatMessage } from '@/lib/reborn-ai/types';

export const chatRequestSchema = z.object({
  messages: z
    .array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().trim().min(1).max(limits.maxMessageChars),
    }))
    .min(1)
    .max(limits.maxHistory),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
type Emit = (event: ChatEvent) => void;

type Evidence = {
  route: RouteName;
  source: string;
  status: 'ok' | 'empty' | 'unavailable';
  checkedAt: string | null;
  result: unknown;
  error?: string;
};

const cutNote = '\n\n(that answer got cut short, ask me to continue if you need the rest)';
const uncheckedNote = '\n\n(i couldn’t double-check every number here against the game data, so verify anything important)';

function failureText(error: unknown) {
  const kind = error instanceof ModelError ? error.kind : 'unavailable';
  if (kind === 'quota') return { message: 'reborn ai has used up its free answers for today, try again tomorrow', retryable: false };
  if (kind === 'busy') return { message: 'all the free ai models are busy right now, try again in a minute', retryable: true };
  if (kind === 'auth') return { message: 'reborn ai is misconfigured right now', retryable: false };
  return { message: 'reborn ai can’t reach its models right now, try again soon', retryable: true };
}

function rescueReason(error: unknown): RescueReason {
  if (error instanceof ModelError && error.kind === 'quota') return 'quota';
  if (error instanceof ModelError && error.kind === 'busy') return 'busy';
  return 'other';
}

function recentHistory(messages: ChatMessage[]) {
  const window = messages.slice(-limits.maxHistory);
  const start = window.findIndex((message) => message.role === 'user');
  return start === -1 ? [] : window.slice(start);
}

// Recent turns go to the model in full, older ones are shortened so a long
// chat keeps its thread without crowding out this turn's facts.
function contextMessages(history: ChatMessage[]) {
  const cutoff = history.length - limits.fullHistoryTurns;
  return history.map((message, index) => index >= cutoff || message.content.length <= limits.olderTurnChars
    ? message
    : { ...message, content: `${message.content.slice(0, limits.olderTurnChars).trimEnd()}…` });
}

function references(history: ChatMessage[], question: string) {
  const followsCard = /\b(?:it|its|that|this|these|those|them|they|their|one|ones|same|former|latter)\b/i.test(question)
    || /^(?:and|also|what about|how about)\b/i.test(question.trim());
  if (!followsCard) return [];

  const previous = history.findLast((message) => message.role === 'assistant');
  if (!previous) return [];

  return Array.from(previous.content.matchAll(/(?:trial|movement|recipe|resource)=([^;\]]+)/gi))
    .map((match) => match[1].trim())
    .filter(Boolean)
    .slice(-6);
}

function hasItems(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

function sourceFor(route: RouteName) {
  if (route === 'records') return 'Wasans world records';
  if (route === 'trials') return 'Parkour Reborn time trials';
  if (route === 'movement' || route === 'mechanics') return 'Parkour Reborn movement list';
  if (route === 'community') return 'Parkour Reborn community library';
  return 'Parkour Reborn guide';
}

function toolFor(route: RouteName, query: string, message: string) {
  if (route === 'records') return { name: 'get_world_records', args: { trial: query, limit: 4 } };
  if (route === 'trials') return { name: 'get_time_trials', args: { query, limit: 4 } };
  if (route === 'movement' || route === 'mechanics') return { name: 'search_techs', args: { query, limit: 4 } };
  if (route === 'community') {
    const type = /\bgif|meme\b/i.test(message) ? 'gif' : /\bfile|document|pdf\b/i.test(message) ? 'file' : /\blink|discord|invite\b/i.test(message) ? 'link' : undefined;
    const browse = /\b(any|random|something|surprise me)\b/i.test(message);
    return { name: 'search_community', args: { ...(browse ? {} : { query }), ...(type ? { type } : {}), limit: 3 } };
  }
  return { name: 'search_knowledge', args: { query, limit: limits.maxKnowledgeDocs } };
}

function uniqueCalls(routes: RouteName[], query: string, message: string) {
  const calls = new Map<string, { routes: RouteName[]; name: string; args: Record<string, unknown> }>();
  for (const route of routes) {
    const tool = toolFor(route, query, message);
    const key = `${tool.name}:${JSON.stringify(tool.args)}`;
    const existing = calls.get(key);
    if (existing) existing.routes.push(route);
    else calls.set(key, { routes: [route], ...tool });
  }
  return Array.from(calls.values());
}

function resultName(value: unknown) {
  if (!value || typeof value !== 'object') return '';
  const item = value as Record<string, unknown>;
  return String(item.trial ?? item.name ?? '').trim();
}

function ambiguity(evidence: Evidence[], question: string, refs: string[]) {
  const singularReference = /\b(it|its|that|this)\b/i.test(question);
  if (singularReference && new Set(refs).size > 1) {
    return `which one do you mean: ${Array.from(new Set(refs)).join(' or ')}?`;
  }

  for (const item of evidence.filter((entry) => entry.route === 'records' || entry.route === 'trials' || entry.route === 'movement')) {
    if (!hasItems(item.result) || item.result.length < 2) continue;
    const names = item.result.map(resultName).filter(Boolean);
    const explicit = names.filter((name) => question.toLowerCase().includes(name.toLowerCase()));
    const broad = /\b(all|list|latest|newest|records|trials|techs)\b/i.test(question) && !singularReference;
    if (!explicit.length && !broad) return `which one do you mean: ${names.slice(0, 4).join(', ')}?`;
  }
  return '';
}

function filteredBlocks(blocks: AssistantBlock[], evidence: Evidence[], ambiguous: string, routes: RouteName[]) {
  const routed = blocks.filter((block) => {
    if (block.type === 'world_record') return routes.includes('records');
    if (block.type === 'time_trial') return routes.includes('trials');
    if (block.type === 'tech') return evidence.some((item) => item.source === 'Parkour Reborn movement list' && item.status === 'ok');
    if (block.type === 'recipe') return routes.includes('crafting');
    if (block.type === 'link' || block.type === 'gif') return routes.includes('community');
    return true;
  });
  if (!ambiguous) return routed.slice(0, limits.maxBlocks);
  const uncertain = new Set(evidence.filter((item) => hasItems(item.result) && item.result.length > 1).map((item) => item.route));
  return routed.filter((block) => {
    if (block.type === 'world_record') return !uncertain.has('records');
    if (block.type === 'time_trial') return !uncertain.has('trials');
    if (block.type === 'tech') return !uncertain.has('movement') && !uncertain.has('mechanics');
    return true;
  }).slice(0, limits.maxBlocks);
}

function attachments(blocks: AssistantBlock[]) {
  return blocks.map((block, index) => {
    if (block.type === 'world_record') return { index, type: block.type, name: block.trial };
    if (block.type === 'time_trial' || block.type === 'tech' || block.type === 'recipe') return { index, type: block.type, name: block.type === 'recipe' ? block.item : block.name };
    if (block.type === 'link' || block.type === 'gif') return { index, type: block.type, name: block.title };
    return { index, type: block.type, name: '' };
  });
}

function pickBlocks(indexes: number[], available: AssistantBlock[]) {
  return indexes.filter((index) => index < available.length).map((index) => available[index]);
}

type Draft = { outcome: AnswerOutcome; answer: string; indexes: number[] };

// Streams one answer to the user and settles its card marker.
async function writeDraft(messages: ModelMessage[], emit: Emit, signal?: AbortSignal): Promise<Draft> {
  const stream = answerStream((delta) => emit({ type: 'text', delta }));
  const outcome = await streamAnswer(messages, {
    onText: stream.push,
    onStatus: (state) => emit({ type: 'status', state }),
    signal,
  });
  const { answer, indexes } = stream.finish();
  return { outcome, answer, indexes };
}

function attemptSummary(attempts: AttemptLog[]) {
  return attempts.map(({ model, result, ms, status, detail }) => ({ model, result, ms, ...(status ? { status } : {}), ...(detail ? { detail } : {}) }));
}

export async function runConversation(request: ChatRequest, _origin: string, emit: Emit, signal?: AbortSignal) {
  const startedAt = performance.now();
  const history = recentHistory(request.messages);
  const question = history[history.length - 1];
  if (!question || question.role !== 'user') {
    emit({ type: 'error', message: 'conversation too long, start a new conversation' });
    return;
  }

  emit({ type: 'status', state: 'thinking' });
  const decision = await routeMessage(question.content, history.slice(0, -1), signal);
  const routedAt = performance.now();
  const refs = references(history.slice(0, -1), question.content);
  const query = compactQuery(question.content, refs);
  const toolkit = createToolkit();
  const evidence: Evidence[] = [];

  if (decision.routes.length) {
    emit({ type: 'status', state: 'looking' });
    const calls = uniqueCalls(decision.routes, query, question.content);
    if (decision.routes.includes('game_knowledge') && !calls.some((call) => call.name === 'search_techs')) {
      calls.push({ routes: ['movement'], name: 'search_techs', args: { query, exact: true, limit: 4 } });
    }
    const outcomes = await Promise.all(calls.map(async (call) => ({ call, outcome: await toolkit.lookup(call.name, call.args) })));

    for (const { call, outcome } of outcomes) {
      if (call.args.exact && !(outcome.status === 'ok' && hasItems(outcome.result))) continue;
      const route = call.routes[0];
      if (outcome.status === 'ok') {
        evidence.push({
          route,
          source: sourceFor(route),
          status: hasItems(outcome.result) ? 'ok' : 'empty',
          checkedAt: route === 'records' || route === 'trials' || route === 'movement' || route === 'mechanics' || route === 'community' ? outcome.checkedAt : null,
          result: outcome.result,
        });
      } else {
        evidence.push({ route, source: sourceFor(route), status: 'unavailable', checkedAt: outcome.checkedAt, result: null, error: outcome.error });
      }
    }

    const tech = evidence.find((item) => item.source === 'Parkour Reborn movement list');
    const guide = evidence.some((item) => item.source === 'Parkour Reborn guide');
    if (decision.routes.includes('mechanics') && tech?.status === 'empty' && !guide) {
      const outcome = await toolkit.lookup('search_knowledge', { query, limit: limits.maxKnowledgeDocs });
      evidence.push(outcome.status === 'ok'
        ? { route: 'mechanics', source: 'Parkour Reborn guide', status: hasItems(outcome.result) ? 'ok' : 'empty', checkedAt: null, result: outcome.result }
        : { route: 'mechanics', source: 'Parkour Reborn guide', status: 'unavailable', checkedAt: null, result: null, error: outcome.error });
    }
  }
  const fetchedAt = performance.now();

  const ambiguous = ambiguity(evidence, question.content, refs);
  const blocks = filteredBlocks(toolkit.autoBlocks, evidence, ambiguous, decision.routes);
  const answerEvidence = ambiguous
    ? evidence.map((item) => ['records', 'trials', 'movement', 'mechanics'].includes(item.route) && hasItems(item.result) && item.result.length > 1
      ? { ...item, status: 'empty' as const, result: null }
      : item)
    : evidence;
  const input = {
    question: question.content,
    context: {
      recentMessages: contextMessages(history.slice(0, -1)),
      references: refs,
      handling: decision.handling,
      ambiguity: ambiguous || null,
    },
    facts: answerEvidence,
    attachments: attachments(blocks),
  };
  const messages: ModelMessage[] = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: JSON.stringify(input) },
  ];

  const priorTurns = history.slice(0, -1).map((message) => message.content);
  const verdictFor = (draft: Draft): AnswerVerdict => (draft.outcome.cut
    ? { ok: true }
    : checkAnswer({
      answer: draft.answer,
      hasCards: pickBlocks(draft.indexes, blocks).length > 0,
      question: question.content,
      history: priorTurns,
      facts: answerEvidence,
      checkNumbers: decision.routes.length > 0,
    }));

  // Nothing a model writes is worth an empty reply. When no model can answer,
  // the facts already looked up are shown as they are.
  const rescue = (error: unknown) => {
    const rescueBlocks = blocks.slice(0, 6);
    const text = rescueText(answerEvidence, rescueReason(error), rescueBlocks.length > 0);
    if (!text) {
      emit({ type: 'error', ...failureText(error) });
      return;
    }
    emit({ type: 'text', delta: text });
    if (rescueBlocks.length) emit({ type: 'blocks', blocks: rescueBlocks });
    emit({ type: 'done' });
  };

  const logFailure = (error: unknown) => console.error('reborn-ai answer failed', {
    models: configuredModels(),
    routes: decision.routes,
    kind: error instanceof ModelError ? error.kind : 'unknown',
    error: error instanceof Error ? error.message : String(error),
    attempts: error instanceof ModelError ? attemptSummary(error.attempts) : [],
  });

  emit({ type: 'status', state: 'writing' });
  let draft: Draft;
  try {
    draft = await writeDraft(messages, emit, signal);
  } catch (error) {
    if (signal?.aborted) return;
    logFailure(error);
    rescue(error);
    return;
  }

  const attempts = [...draft.outcome.attempts];
  let verdict = verdictFor(draft);
  let check: 'ok' | 'rewritten' | 'flagged' = 'ok';

  // One rewrite for a draft that states numbers the facts don't have, leaks
  // internals, or says nothing. The first draft comes back if the rewrite fails.
  if (!verdict.ok) {
    const first = draft;
    emit({ type: 'reset' });
    emit({ type: 'status', state: 'writing' });
    try {
      draft = await writeDraft([
        ...messages,
        { role: 'assistant', content: first.outcome.content },
        { role: 'user', content: rewriteRequest(verdict) },
      ], emit, signal);
      attempts.push(...draft.outcome.attempts);
      verdict = verdictFor(draft);
      check = verdict.ok ? 'rewritten' : 'flagged';
    } catch (error) {
      if (signal?.aborted) return;
      if (error instanceof ModelError) attempts.push(...error.attempts);
      check = 'flagged';
      emit({ type: 'reset' });
      if (first.answer) emit({ type: 'text', delta: first.answer });
    }
  }

  const chosen = pickBlocks(draft.indexes, blocks);
  if (!draft.answer && !chosen.length) {
    const empty = new ModelError('unavailable', 'models returned empty answers', attempts);
    logFailure(empty);
    rescue(empty);
    return;
  }

  if (draft.outcome.cut) emit({ type: 'text', delta: cutNote });
  else if (!verdict.ok && verdict.reason === 'numbers') emit({ type: 'text', delta: uncheckedNote });
  if (chosen.length) emit({ type: 'blocks', blocks: chosen });

  console.info('reborn-ai request', {
    routes: decision.routes,
    handling: decision.handling,
    usedJev: decision.usedJev,
    jevModel: decision.jevModel,
    jevUsage: decision.jevUsage,
    answerModel: draft.outcome.model,
    answerUsage: draft.outcome.usage,
    attempts: attemptSummary(attempts),
    check,
    cut: draft.outcome.cut,
    routeMs: Math.round(routedAt - startedAt),
    fetchMs: Math.round(fetchedAt - routedAt),
    generationMs: Math.round(performance.now() - fetchedAt),
    evidence: evidence.map(({ route, status }) => ({ route, status })),
  });
  emit({ type: 'done' });
}
