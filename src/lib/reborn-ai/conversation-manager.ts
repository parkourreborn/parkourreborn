import 'server-only';

import { z } from 'zod';
import { limits } from '@/lib/reborn-ai/limits';
import { ModelError, streamModel } from '@/lib/reborn-ai/openrouter';
import type { ModelMessage } from '@/lib/reborn-ai/openrouter';
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

const fallbackReply = 'my brain glitched there, ask me again';
const queryStopWords = new Set([
  'about', 'and', 'are', 'can', 'does', 'for', 'from', 'have', 'how', 'its', 'please', 'tell', 'that', 'the',
  'their', 'this', 'what', 'when', 'where', 'which', 'who', 'with', 'would', 'you', 'your',
]);

function modelErrorText(error: unknown) {
  if (!(error instanceof ModelError)) return fallbackReply;
  if (error.status === 429) return 'the model is rate limiting us, give it a bit';
  if (error.status >= 500) return 'the model is having a moment, try again';
  return 'reborn ai is not reachable right now';
}

function recentHistory(messages: ChatMessage[]) {
  const window = messages.slice(-limits.maxHistory);
  const start = window.findIndex((message) => message.role === 'user');
  return start === -1 ? [] : window.slice(start);
}

function references(history: ChatMessage[]) {
  for (const message of history.slice().reverse()) {
    if (message.role !== 'assistant') continue;
    const found = Array.from(message.content.matchAll(/(?:trial|movement|recipe|resource)=([^;\]]+)/gi))
      .map((match) => match[1].trim())
      .filter(Boolean);
    if (found.length) return found.slice(-6);
  }
  return [];
}

function compactQuery(message: string, refs: string[]) {
  const meaningful = message
    .toLowerCase()
    .replace(/[^a-z0-9' -]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !queryStopWords.has(word));
  return Array.from(new Set([...meaningful, ...refs])).join(' ').slice(0, 80).trim() || message.slice(0, 80);
}

function hasItems(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

function sourceFor(route: RouteName) {
  if (route === 'records') return 'Wasans world records';
  if (route === 'trials') return 'Parkour Reborn time trials';
  if (route === 'movement') return 'Parkour Reborn movement list';
  if (route === 'community') return 'Parkour Reborn community library';
  return 'Parkour Reborn knowledge base';
}

function toolFor(route: RouteName, query: string, message: string) {
  if (route === 'records') return { name: 'get_world_records', args: { trial: query, limit: 4 } };
  if (route === 'trials') return { name: 'get_time_trials', args: { query, limit: 4 } };
  if (route === 'movement') return { name: 'search_techs', args: { query, limit: 4 } };
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

function filteredBlocks(blocks: AssistantBlock[], evidence: Evidence[], ambiguous: string) {
  if (!ambiguous) return blocks.slice(0, limits.maxBlocks);
  const uncertain = new Set(evidence.filter((item) => hasItems(item.result) && item.result.length > 1).map((item) => item.route));
  return blocks.filter((block) => {
    if (block.type === 'world_record') return !uncertain.has('records');
    if (block.type === 'time_trial') return !uncertain.has('trials');
    if (block.type === 'tech') return !uncertain.has('movement');
    return true;
  }).slice(0, limits.maxBlocks);
}

function attachments(blocks: AssistantBlock[]) {
  return blocks.map((block) => {
    if (block.type === 'world_record') return { type: block.type, name: block.trial, available: true };
    if (block.type === 'time_trial' || block.type === 'tech' || block.type === 'recipe') return { type: block.type, name: block.type === 'recipe' ? block.item : block.name, available: true };
    if (block.type === 'link' || block.type === 'gif') return { type: block.type, name: block.title, available: true };
    return { type: block.type, name: '', available: true };
  });
}

function numericTokens(value: string) {
  return Array.from(value.matchAll(/\b\d+(?:\.\d+)?\b/g), (match) => match[0]);
}

function groundedNumbers(reply: string, question: string, evidence: Evidence[]) {
  const allowed = new Set(numericTokens(`${question}\n${JSON.stringify(evidence.map(({ result, checkedAt }) => ({ result, checkedAt })))}`));
  return numericTokens(reply).every((number) => allowed.has(number));
}

function groundedFallback(question: string, evidence: Evidence[], missing: string[]) {
  const parts: string[] = [];
  const records = evidence.find((item) => item.route === 'records' && hasItems(item.result));
  const record = records && hasItems(records.result) ? records.result[0] as Record<string, unknown> : undefined;
  if (record) parts.push(`${record.trial}'s world record is ${record.time} by ${record.player}.`);

  const trials = evidence.find((item) => item.route === 'trials' && hasItems(item.result));
  const trial = trials && hasItems(trials.result) ? trials.result[0] as Record<string, unknown> : undefined;
  if (trial) {
    const medal = ['bronze', 'silver', 'gold', 'platinum'].find((name) => (
      name === 'platinum' ? /\b(?:platinum|plat)\b/i.test(question) : new RegExp(`\\b${name}\\b`, 'i').test(question)
    ));
    parts.push(medal ? `${medal} on ${trial.name} is ${trial[medal]}.` : `i found the current medal times for ${trial.name}.`);
  }
  parts.push(...missing);
  return parts.filter(Boolean).join(' ') || fallbackReply;
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
  const refs = references(history.slice(0, -1));
  const query = compactQuery(question.content, refs);
  const toolkit = createToolkit();
  const evidence: Evidence[] = [];

  if (decision.routes.length) {
    emit({ type: 'status', state: 'looking' });
    const calls = uniqueCalls(decision.routes, query, question.content);
    const outcomes = await Promise.all(calls.map(async (call) => ({ call, outcome: await toolkit.lookup(call.name, call.args) })));

    for (const { call, outcome } of outcomes) {
      const route = call.routes[0];
      if (outcome.status === 'ok') {
        evidence.push({
          route,
          source: sourceFor(route),
          status: hasItems(outcome.result) ? 'ok' : 'empty',
          checkedAt: route === 'records' || route === 'trials' || route === 'movement' || route === 'community' ? outcome.checkedAt : null,
          result: outcome.result,
        });
      } else {
        evidence.push({ route, source: sourceFor(route), status: 'unavailable', checkedAt: outcome.checkedAt, result: null, error: outcome.error });
      }
    }
  }
  const fetchedAt = performance.now();

  const ambiguous = ambiguity(evidence, question.content, refs);
  const blocks = filteredBlocks(toolkit.autoBlocks, evidence, ambiguous);
  const answerEvidence = ambiguous
    ? evidence.map((item) => ['records', 'trials', 'movement'].includes(item.route) && hasItems(item.result) && item.result.length > 1
      ? { ...item, status: 'empty' as const, result: null }
      : item)
    : evidence;
  const missing = [
    ...(ambiguous ? [ambiguous] : []),
    ...(decision.handling === 'unsupported' ? ['i can’t access live player state or perform in-game actions.'] : []),
    ...(decision.handling === 'unclear' && !ambiguous ? ['i need the name of the thing you mean.'] : []),
    ...evidence.filter((item) => item.status === 'empty').map((item) => `i couldn't find matching ${item.source.toLowerCase()} data.`),
    ...evidence.filter((item) => item.status === 'unavailable').map((item) => `${item.source} is unavailable right now.`),
  ];

  const input = {
    question: question.content,
    context: { recentMessages: history.slice(-5, -1), references: refs },
    evidence: answerEvidence,
    attachments: attachments(blocks),
    missing,
  };
  const messages: ModelMessage[] = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: JSON.stringify(input) },
  ];

  emit({ type: 'status', state: 'writing' });
  const highRisk = decision.routes.includes('records') || decision.routes.includes('trials');
  let wrote = false;
  let answerModel = '';
  let answerUsage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;

  try {
    const answer = await streamModel(messages, (delta) => {
      if (highRisk) return;
      wrote = true;
      emit({ type: 'text', delta });
    }, signal);
    answerModel = answer.model;
    answerUsage = answer.usage;

    if (highRisk) {
      const safe = answer.content.trim() && groundedNumbers(answer.content, question.content, answerEvidence)
        ? answer.content
        : groundedFallback(question.content, answerEvidence, missing);
      emit({ type: 'text', delta: safe });
      wrote = Boolean(safe.trim());
    }
  } catch (error) {
    if (signal?.aborted) return;
    if (highRisk) {
      const safe = groundedFallback(question.content, answerEvidence, missing);
      emit({ type: 'text', delta: safe });
      wrote = Boolean(safe.trim());
    }
    if (!wrote) {
      emit({ type: 'error', message: modelErrorText(error) });
      return;
    }
  }

  if (!wrote && !blocks.length) emit({ type: 'text', delta: groundedFallback(question.content, answerEvidence, missing) });
  if (blocks.length) emit({ type: 'blocks', blocks });
  console.info('reborn-ai request', {
    routes: decision.routes,
    handling: decision.handling,
    usedJev: decision.usedJev,
    jevModel: decision.jevModel,
    jevUsage: decision.jevUsage,
    answerModel,
    answerUsage,
    routeMs: Math.round(routedAt - startedAt),
    fetchMs: Math.round(fetchedAt - routedAt),
    generationMs: Math.round(performance.now() - fetchedAt),
    evidence: evidence.map(({ route, status }) => ({ route, status })),
  });
  emit({ type: 'done' });
}
