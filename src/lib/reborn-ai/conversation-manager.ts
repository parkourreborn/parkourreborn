import 'server-only';

import { z } from 'zod';
import { compactQuery, safeAnswer } from '@/lib/reborn-ai/answer-facts';
import { limits } from '@/lib/reborn-ai/limits';
import { freeModelQuota, ModelError, modelName, streamModel } from '@/lib/reborn-ai/openrouter';
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
function modelErrorText(error: unknown, dailyRemaining?: number) {
  if (!(error instanceof ModelError)) return fallbackReply;
  if (error.status === 429) {
    if (dailyRemaining === 0) return 'openrouter’s free requests for today are used up';
    if (error.diagnostic?.remaining === '0') return 'openrouter’s short-term free request limit was reached; try again after it resets';
    return 'the free model provider is busy right now; try again soon';
  }
  if (error.status >= 500) return 'the model is having a moment, try again';
  return 'reborn ai is not reachable right now';
}

function recentHistory(messages: ChatMessage[]) {
  const window = messages.slice(-limits.maxHistory);
  const start = window.findIndex((message) => message.role === 'user');
  return start === -1 ? [] : window.slice(start);
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

function selectedBlocks(content: string, available: AssistantBlock[]) {
  const marker = content.match(/\s*\[\[cards:([\d, ]*)\]\]\s*$/i);
  const answer = marker ? content.slice(0, marker.index).trim() : content.trim();
  const indexes = marker?.[1].split(',').map((value) => value.trim()).filter(Boolean).map(Number) ?? [];
  const blocks = Array.from(new Set(indexes))
    .filter((index) => Number.isInteger(index) && index >= 0 && index < available.length)
    .map((index) => available[index]);
  return { answer, blocks };
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
    context: { recentMessages: history.slice(-5, -1), references: refs, handling: decision.handling, ambiguity: ambiguous || null },
    evidence: answerEvidence,
    attachments: attachments(blocks),
  };
  const messages: ModelMessage[] = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: JSON.stringify(input) },
  ];

  emit({ type: 'status', state: 'writing' });
  let answerModel = '';
  let answerUsage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined;

  try {
    const answer = await streamModel(messages, () => {}, signal);
    answerModel = answer.model;
    answerUsage = answer.usage;

    const chosen = selectedBlocks(answer.content, blocks);
    if (!safeAnswer(chosen.answer, question.content, answerEvidence.map(({ result }) => result))) {
      console.warn('reborn-ai answer rejected', { model: answerModel, routes: decision.routes });
      emit({ type: 'error', message: 'i couldn’t verify that answer; please try again' });
      return;
    }
    emit({ type: 'text', delta: chosen.answer });
    if (chosen.blocks.length) emit({ type: 'blocks', blocks: chosen.blocks });
  } catch (error) {
    if (signal?.aborted) return;
    const quota = error instanceof ModelError && error.status === 429 ? await freeModelQuota() : null;
    console.error('reborn-ai answer model failed', {
      model: modelName(),
      routes: decision.routes,
      status: error instanceof ModelError ? error.status : undefined,
      error: error instanceof Error ? error.message : String(error),
      diagnostic: error instanceof ModelError ? error.diagnostic : undefined,
      freeModelDailyRequests: quota,
    });
    emit({ type: 'error', message: modelErrorText(error, quota?.remaining) });
    return;
  }

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
