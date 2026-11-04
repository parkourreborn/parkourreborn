import 'server-only';

import { randomUUID } from 'crypto';
import { z } from 'zod';
import { factsFingerprint, getCached, putCached, similarCached } from '@/lib/reborn-ai/answer-cache';
import { checkAnswer, compactQuery, rewriteRequest } from '@/lib/reborn-ai/answer-facts';
import type { AnswerVerdict } from '@/lib/reborn-ai/answer-facts';
import { answerStream, rescueText } from '@/lib/reborn-ai/answer-text';
import type { RescueReason } from '@/lib/reborn-ai/answer-text';
import { logGap, logRequest } from '@/lib/reborn-ai/ai-log';
import type { RequestLog } from '@/lib/reborn-ai/ai-log';
import { extractEntities } from '@/lib/reborn-ai/entities';
import { hasJev, judgeAnswer, judgeAnswerable, judgeEvidence, sameQuestion } from '@/lib/reborn-ai/judge';
import type { EvidenceVerdict } from '@/lib/reborn-ai/judge';
import type { ChunkHit } from '@/lib/reborn-ai/kb-search';
import { knowledge } from '@/lib/reborn-ai/knowledge-retriever';
import { limits } from '@/lib/reborn-ai/limits';
import { configuredModels, freeModelQuota } from '@/lib/reborn-ai/models';
import { ModelError, streamAnswer } from '@/lib/reborn-ai/openrouter';
import type { AnswerOutcome, AttemptLog, ModelMessage } from '@/lib/reborn-ai/openrouter';
import { planTools, ruleRoutes } from '@/lib/reborn-ai/planner';
import type { RouteName, ToolName } from '@/lib/reborn-ai/planner';
import { buildSystemPrompt } from '@/lib/reborn-ai/prompt';
import type { PromptOptions } from '@/lib/reborn-ai/prompt';
import { routeMessage } from '@/lib/reborn-ai/router';
import { createToolkit } from '@/lib/reborn-ai/tools';
import type { Viewer } from '@/lib/reborn-ai/tools';
import type { AssistantBlock, ChatEvent, ChatMessage } from '@/lib/reborn-ai/types';
import { loadTechs, loadTimeTrials } from '@/lib/server/reborn-ai-data';
import { playerIndex, wasans } from '@/lib/server/wasans';

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

export type Gate = { ok: true } | { ok: false; message: string };

export type ConversationOptions = {
  signal?: AbortSignal;
  requestId?: string;
  // Who is asking, if logged in. Resolved alongside routing.
  viewer?: Promise<Viewer>;
  // The rate limit verdict, checked right before the model is called.
  gate?: Promise<Gate>;
};

type Evidence = {
  tool: ToolName | 'guide_full';
  route: RouteName;
  source: string;
  status: 'ok' | 'empty' | 'unavailable';
  checkedAt: string | null;
  result: unknown;
  error?: string;
};

const guideRoutes: RouteName[] = ['crafting', 'lore', 'game_knowledge', 'mechanics', 'movement'];
const cutNote = '\n\n(that answer got cut short, ask me to continue if you need the rest)';
const uncheckedNote = '\n\n(i couldn’t double-check everything here against the game data, so verify anything important)';
const relevantChunk = 0.35;
const lowAnswerable = 0.35;

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

// Card names the previous answer showed, for "what about that one" questions.
function references(history: ChatMessage[], question: string) {
  const followsCard = /\b(?:it|its|that|this|these|those|them|they|their|one|ones|same|former|latter)\b/i.test(question)
    || /^(?:and|also|what about|how about)\b/i.test(question.trim());
  if (!followsCard) return [];
  const previous = history.findLast((message) => message.role === 'assistant');
  if (!previous) return [];
  return Array.from(previous.content.matchAll(/(?:trial|movement|recipe|resource|player)=([^;\]]+)/gi))
    .map((match) => match[1].trim())
    .filter(Boolean)
    .slice(-6);
}

const hasItems = (value: unknown): value is unknown[] => Array.isArray(value) && value.length > 0;
const hasContent = (value: unknown) => (Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined);

function sourceFor(tool: ToolName | 'guide_full') {
  if (tool === 'get_world_records' || tool === 'get_wr_history') return 'Wasans world records';
  if (tool === 'get_trial_leaderboard' || tool === 'get_overall_leaderboard' || tool === 'get_combo_leaderboard') return 'Wasans leaderboards';
  if (tool === 'get_player' || tool === 'get_player_analytics') return 'Wasans player profiles';
  if (tool === 'get_trial_stats' || tool === 'get_site_stats' || tool === 'get_recent_runs' || tool === 'get_wasans_announcements') return 'Wasans statistics';
  if (tool === 'wasans_score' || tool === 'time_for_score' || tool === 'tier_for_score' || tool === 'time_gaps' || tool === 'xp_progress') return 'Calculators';
  if (tool === 'get_time_trials') return 'Parkour Reborn time trials';
  if (tool === 'search_techs') return 'Parkour Reborn movement list';
  if (tool === 'search_community') return 'Parkour Reborn community library';
  if (tool === 'guide_full') return 'Parkour Reborn guide (complete)';
  return 'Parkour Reborn guide';
}

function cardTitle(block: AssistantBlock) {
  if (block.type === 'world_record') return `${block.trial} world record`;
  if (block.type === 'time_trial' || block.type === 'tech' || block.type === 'player') return block.name;
  if (block.type === 'recipe') return `${block.item} recipe`;
  if (block.type === 'leaderboard') return block.title;
  if (block.type === 'link' || block.type === 'gif') return block.title ?? block.url;
  return block.type;
}

// Tech cards only when the movement list itself matched.
function usableCards(blocks: AssistantBlock[], evidence: Evidence[]) {
  const movementFound = evidence.some((item) => item.tool === 'search_techs' && item.status === 'ok');
  return blocks.filter((block) => block.type !== 'tech' || movementFound).slice(0, limits.maxBlocks);
}

function guideResults(hits: ChunkHit[]) {
  let left = limits.maxKnowledgeChars;
  const results = [];
  for (const { chunk } of hits) {
    if (left <= 0) break;
    const body = chunk.text.length > left ? `${chunk.text.slice(0, left)}...` : chunk.text;
    left -= body.length;
    results.push({ id: chunk.id, title: chunk.title, section: chunk.section, category: chunk.category, body });
  }
  return results;
}

// Jev's picks: the chunks it rated relevant, then a couple of chunks from
// each guide page it picked from the catalog. Falls back to the keyword
// ranking when Jev picks nothing.
function chooseChunks(verdict: EvidenceVerdict, candidates: ChunkHit[], query: string) {
  const picked = candidates
    .filter((hit) => (verdict.relevance.get(hit.chunk.id) ?? 0) >= relevantChunk)
    .sort((a, b) => (verdict.relevance.get(b.chunk.id) ?? 0) - (verdict.relevance.get(a.chunk.id) ?? 0));
  const have = new Set(picked.map((hit) => hit.chunk.id));
  for (const docId of verdict.catalogPicks) {
    if (picked.some((hit) => hit.chunk.doc === docId)) continue;
    for (const chunk of knowledge.chunksOf(docId, query).slice(0, 2)) {
      if (have.has(chunk.id)) continue;
      have.add(chunk.id);
      picked.push({ chunk, score: 0 });
    }
  }
  return (picked.length ? picked : candidates.slice(0, 3)).slice(0, 12);
}

const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T) => Promise.race([
  promise.catch(() => fallback),
  new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
]);

type Draft = { outcome: AnswerOutcome; answer: string; indexes: number[] };

async function writeDraft(messages: ModelMessage[], emit: Emit, signal: AbortSignal | undefined, longPrompt: boolean): Promise<Draft> {
  const stream = answerStream((delta) => emit({ type: 'text', delta }));
  const outcome = await streamAnswer(messages, {
    onText: stream.push,
    onStatus: (state) => emit({ type: 'status', state }),
    signal,
    longPrompt,
  });
  const { answer, indexes } = stream.finish();
  return { outcome, answer, indexes };
}

function attemptSummary(attempts: AttemptLog[]) {
  return attempts.map(({ model, result, ms, status, detail }) => ({ model, result, ms, ...(status ? { status } : {}), ...(detail ? { detail } : {}) }));
}

export async function runConversation(request: ChatRequest, emit: Emit, options: ConversationOptions = {}) {
  const { signal } = options;
  const startedAt = performance.now();
  const id = options.requestId ?? randomUUID();
  const viewerPromise = (options.viewer ?? Promise.resolve(null)).catch(() => null);
  const history = recentHistory(request.messages);
  const question = history[history.length - 1];
  if (!question || question.role !== 'user') {
    emit({ type: 'error', message: 'conversation too long, start a new conversation', retryable: false });
    return;
  }
  const prior = history.slice(0, -1);
  const priorText = prior.map((message) => message.content);

  emit({ type: 'meta', id });
  emit({ type: 'status', state: 'thinking' });

  // Warm everything lookups may need while routing runs.
  const playerNames = withTimeout(playerIndex().then((players) => players.map((player) => player.name)), 1200, [] as string[]);
  void loadTechs().catch(() => {});
  void loadTimeTrials().catch(() => {});
  void wasans.worldRecords().catch(() => {});
  const quota = freeModelQuota();

  const decision = await routeMessage(question.content, prior, playerNames, signal);
  const routedAt = performance.now();

  // Follow-ups ("what about glass?") borrow what the previous question was
  // about when they do not say it themselves.
  const refs = references(prior, question.content);
  const previousUser = prior.findLast((message) => message.role === 'user');
  const followUp = Boolean(previousUser) && (decision.followUp || refs.length > 0);
  if (followUp && previousUser && decision.handling !== 'conversation') {
    const earlier = extractEntities(previousUser.content, await playerNames);
    if (!decision.entities.trials.length) decision.entities.trials = earlier.trials;
    if (!decision.entities.players.length) decision.entities.players = earlier.players;
    if (!decision.entities.combo) decision.entities.combo = earlier.combo;
    if (decision.routes.every((route) => route === 'game_knowledge')) {
      const inherited = ruleRoutes(previousUser.content, earlier).routes;
      decision.routes = Array.from(new Set([...inherited, ...decision.routes]));
    }
  }
  const query = compactQuery(followUp && previousUser ? `${question.content} ${previousUser.content}` : question.content, refs);

  const viewer = await viewerPromise;
  const toolkit = createToolkit(viewer);
  const calls = decision.handling === 'conversation'
    ? []
    : planTools({ routes: decision.routes, entities: decision.entities, message: question.content, query, maxKnowledge: limits.maxKnowledgeDocs });
  const evidence: Evidence[] = [];

  if (calls.length) {
    emit({ type: 'status', state: 'looking' });
    const outcomes = await Promise.all(calls.map(async (call) => ({ call, outcome: await toolkit.lookup(call.name, call.args) })));
    for (const { call, outcome } of outcomes) {
      if (call.args.exact && !(outcome.status === 'ok' && hasItems(outcome.result))) continue;
      evidence.push(outcome.status === 'ok'
        ? { tool: call.name, route: call.routes[0], source: sourceFor(call.name), status: hasContent(outcome.result) ? 'ok' : 'empty', checkedAt: outcome.checkedAt, result: outcome.result }
        : { tool: call.name, route: call.routes[0], source: sourceFor(call.name), status: 'unavailable', checkedAt: outcome.checkedAt, result: null, error: outcome.error });
    }
  }
  const fetchedAt = performance.now();

  // Jev's look at the evidence: which guide chunks matter, whether the facts
  // answer the question, and which cards help.
  const wantsGuide = decision.routes.some((route) => guideRoutes.includes(route));
  const available = usableCards(toolkit.autoBlocks, evidence);
  let candidates: ChunkHit[] = [];
  let verdict: EvidenceVerdict | null = null;
  let answerable: number | null = null;
  let escalated = false;
  const lookup = decision.handling !== 'conversation' && calls.length > 0;

  const setGuide = (hits: ChunkHit[], tool: ToolName = 'search_knowledge') => {
    const results = guideResults(hits);
    const existing = evidence.find((item) => item.tool === tool);
    const entry: Evidence = { tool, route: existing?.route ?? 'game_knowledge', source: sourceFor(tool), status: results.length ? 'ok' : 'empty', checkedAt: null, result: results };
    if (existing) Object.assign(existing, entry);
    else evidence.push(entry);
  };

  // A guide search that only rides along with live data (records, players,
  // calculators) gets a short rerank with no catalog, and is dropped when
  // Jev finds nothing in it that helps.
  const supportOnly = !wantsGuide && evidence.some((item) => item.tool === 'search_knowledge');
  if (lookup && hasJev()) {
    candidates = wantsGuide ? knowledge.search(query, 24) : supportOnly ? knowledge.search(query, 8) : [];
    verdict = await judgeEvidence({
      question: question.content,
      history: priorText,
      facts: evidence.filter((item) => item.tool !== 'search_knowledge').map(({ source, status, result }) => ({ source, status, result })),
      candidates: candidates.map((hit) => ({ id: hit.chunk.id, title: hit.chunk.breadcrumb, text: hit.chunk.text })),
      catalog: wantsGuide ? knowledge.docs.map((doc) => ({ id: doc.id, title: doc.title, summary: doc.summary })) : [],
      cards: available.map((block, index) => ({ index, type: block.type, title: cardTitle(block) })),
      signal,
    });
    if (verdict) {
      answerable = verdict.answerable;
      if (wantsGuide) setGuide(chooseChunks(verdict, candidates, query));
      else if (supportOnly) {
        setGuide(candidates.filter((hit) => (verdict?.relevance.get(hit.chunk.id) ?? 0) >= relevantChunk).slice(0, 3));
      }
    }
  }

  // Not answerable from what was found: search the whole guide more widely,
  // and if that still is not enough, hand the model the complete guide.
  const nothingFound = lookup && evidence.every((item) => item.status !== 'ok');
  if (lookup && ((answerable !== null && answerable < lowAnswerable) || (answerable === null && nothingFound))) {
    const wider = knowledge.search(`${question.content} ${query}`, 10);
    if (!evidence.some((item) => item.tool === 'search_knowledge' && item.status === 'ok')) setGuide(wider);
    else {
      const current = evidence.find((item) => item.tool === 'search_knowledge');
      const ids = new Set(((current?.result as { id: string }[]) ?? []).map((item) => item.id));
      setGuide([...wider.filter((hit) => !ids.has(hit.chunk.id)), ...candidates.filter((hit) => ids.has(hit.chunk.id))].slice(0, 12));
    }
    const recheck = hasJev() ? await judgeAnswerable(question.content, evidence.map(({ source, result }) => ({ source, result })), signal) : null;
    if (recheck !== null) answerable = recheck;
    if ((recheck !== null && recheck < lowAnswerable) || (recheck === null && nothingFound)) {
      escalated = true;
      evidence.push({ tool: 'guide_full', route: 'game_knowledge', source: sourceFor('guide_full'), status: 'ok', checkedAt: null, result: knowledge.fullText() });
    }
    logGap(id, { question: question.content, routes: decision.routes, answerable, escalated });
  }
  const judgedAt = performance.now();

  const picked = verdict?.cardPicks ? verdict.cardPicks.map((index) => available[index]).filter(Boolean) : null;
  const cardMode: NonNullable<PromptOptions['cards']> = picked ? (picked.length ? 'chosen' : 'none') : (available.length ? 'marker' : 'none');
  const facts = evidence.map(({ source, status, checkedAt, result, error }) => ({ source, status, checkedAt, result, ...(error ? { error } : {}) }));
  const input = {
    question: question.content,
    context: {
      recentMessages: contextMessages(prior),
      references: refs,
      askerLoggedIn: Boolean(viewer),
      ...(decision.handling === 'unsupported' ? { note: 'Part of this asks for something you cannot see or do (such as the player\'s own in-game inventory, level or save, or doing things in the game). Say so for that part only and answer the rest.' } : {}),
      ...(decision.handling === 'unclear' ? { note: 'It is not clear what this refers to. Answer what you can and ask one short question about the rest.' } : {}),
    },
    facts,
    ...(cardMode === 'marker' ? { attachments: available.map((block, index) => ({ index, type: block.type, name: cardTitle(block) })) } : {}),
    ...(cardMode === 'chosen' && picked ? { shownCards: picked.map((block) => ({ type: block.type, name: cardTitle(block) })) } : {}),
  };
  const messages: ModelMessage[] = [
    { role: 'system', content: buildSystemPrompt({ style: decision.style, guard: decision.guard, cards: cardMode, fullGuide: escalated }) },
    { role: 'user', content: JSON.stringify(input) },
  ];

  const log = (outcome: RequestLog['outcome'], extra: Partial<RequestLog>) => logRequest(id, {
    question: question.content,
    answer: '',
    outcome,
    routes: decision.routes,
    handling: decision.handling,
    style: decision.style,
    guard: decision.guard,
    entities: { ...decision.entities, players: decision.entities.players.slice(0, 5) },
    tools: evidence.map(({ tool, status }) => ({ name: tool, status })),
    chunks: ((evidence.find((item) => item.tool === 'search_knowledge')?.result as { id: string }[] | undefined) ?? []).map((item) => item.id),
    jev: {
      routed: decision.usedJev,
      routeMs: decision.jevMs ?? null,
      signals: decision.signals ?? null,
      followUp,
      evidenceMs: verdict?.ms ?? null,
      answerable,
      cardPicks: verdict?.cardPicks ?? null,
    },
    models: [],
    answerModel: '',
    check: 'none',
    escalated,
    cut: false,
    timings: {
      routeMs: Math.round(routedAt - startedAt),
      fetchMs: Math.round(fetchedAt - routedAt),
      judgeMs: Math.round(judgedAt - fetchedAt),
      totalMs: Math.round(performance.now() - startedAt),
    },
    viewer: Boolean(viewer),
    facts: JSON.stringify(facts).slice(0, 20000),
    ...extra,
  });

  // Same question, same facts, answered recently: send that answer again.
  const left = await withTimeout(quota, 800, null);
  const cacheTtl = (left?.remaining ?? 1000) < 100 ? 60 * 60_000 : 10 * 60_000;
  const cacheable = !followUp && !decision.guard;
  const fingerprint = factsFingerprint({ routes: decision.routes, style: decision.style, cardMode, facts, cards: (picked ?? available).map(cardTitle), kb: knowledge.hash });
  let hit = cacheable ? getCached(question.content, fingerprint, cacheTtl) : null;
  if (!hit && cacheable && hasJev()) {
    for (const entry of similarCached(question.content, fingerprint, cacheTtl)) {
      if ((await sameQuestion(question.content, entry.question) ?? 0) >= 0.8) {
        hit = entry;
        break;
      }
    }
  }
  if (hit) {
    emit({ type: 'text', delta: hit.text });
    if (hit.blocks.length) emit({ type: 'blocks', blocks: hit.blocks });
    emit({ type: 'done' });
    log('cached', { answer: hit.text, answerModel: hit.model, check: 'cached' });
    return;
  }

  const gate = await (options.gate ?? Promise.resolve<Gate>({ ok: true }));
  if (!gate.ok) {
    emit({ type: 'error', message: gate.message, retryable: false });
    log('limited', { error: gate.message });
    return;
  }

  // Checks a finished draft: the cheap text checks always, and Jev's
  // grounding check when it is available (skipped for full-guide answers,
  // which are too long for it to read in one go).
  const assess = async (draft: Draft): Promise<AnswerVerdict> => {
    if (draft.outcome.cut) return { ok: true };
    const chosen = cardMode === 'chosen' ? (picked ?? []) : draft.indexes.filter((index) => index < available.length);
    const local = checkAnswer({
      answer: draft.answer,
      hasCards: chosen.length > 0,
      question: question.content,
      history: priorText,
      facts,
      checkNumbers: decision.routes.length > 0,
    });
    if (!local.ok && local.reason !== 'numbers') return local;
    if (!hasJev() || escalated || !draft.answer.trim()) return local;
    const judged = await judgeAnswer(question.content, facts, draft.answer, signal);
    if (!judged) return local;
    if ((judged.internals ?? 0) > 0.8) return { ok: false, reason: 'leak' };
    if (judged.grounded !== null && judged.grounded < 0.2) return { ok: false, reason: 'ungrounded' };
    // Jev reading the facts outranks the number pattern match.
    if (!local.ok && judged.grounded !== null && judged.grounded >= 0.5) return { ok: true };
    return local;
  };

  const rescue = (error: unknown, attempts: AttemptLog[]) => {
    const rescueBlocks = (picked ?? available).slice(0, 6);
    const text = rescueText(facts, rescueReason(error), rescueBlocks.length > 0);
    const failed = failureText(error);
    console.error('reborn-ai answer failed', {
      id,
      models: configuredModels(),
      routes: decision.routes,
      kind: error instanceof ModelError ? error.kind : 'unknown',
      error: error instanceof Error ? error.message : String(error),
      attempts: attemptSummary(attempts),
    });
    if (!text) {
      emit({ type: 'error', ...failed });
      log('failed', { error: failed.message, models: attemptSummary(attempts) });
      return;
    }
    emit({ type: 'text', delta: text });
    if (rescueBlocks.length) emit({ type: 'blocks', blocks: rescueBlocks });
    emit({ type: 'done' });
    log('rescued', { answer: text, error: failed.message, models: attemptSummary(attempts) });
  };

  emit({ type: 'status', state: 'writing' });
  let draft: Draft;
  try {
    draft = await writeDraft(messages, emit, signal, escalated);
  } catch (error) {
    if (signal?.aborted) return;
    rescue(error, error instanceof ModelError ? error.attempts : []);
    return;
  }

  const attempts = [...draft.outcome.attempts];
  let verdictNow = await assess(draft);
  let check: 'ok' | 'rewritten' | 'flagged' = 'ok';

  // One rewrite for a draft that is not backed by the facts, leaks internals,
  // or says nothing. The first draft comes back if the rewrite fails.
  if (!verdictNow.ok) {
    const first = draft;
    emit({ type: 'reset' });
    emit({ type: 'status', state: 'writing' });
    try {
      draft = await writeDraft([
        ...messages,
        { role: 'assistant', content: first.outcome.content },
        { role: 'user', content: rewriteRequest(verdictNow) },
      ], emit, signal, escalated);
      attempts.push(...draft.outcome.attempts);
      verdictNow = await assess(draft);
      check = verdictNow.ok ? 'rewritten' : 'flagged';
    } catch (error) {
      if (signal?.aborted) return;
      if (error instanceof ModelError) attempts.push(...error.attempts);
      check = 'flagged';
      emit({ type: 'reset' });
      if (first.answer) emit({ type: 'text', delta: first.answer });
    }
  }

  const chosen = cardMode === 'chosen'
    ? (picked ?? [])
    : cardMode === 'marker' ? draft.indexes.filter((index) => index < available.length).map((index) => available[index]) : [];
  if (!draft.answer && !chosen.length) {
    rescue(new ModelError('unavailable', 'models returned empty answers', attempts), attempts);
    return;
  }

  let note = '';
  if (draft.outcome.cut) note = cutNote;
  else if (!verdictNow.ok && (verdictNow.reason === 'numbers' || verdictNow.reason === 'ungrounded')) note = uncheckedNote;
  if (note) emit({ type: 'text', delta: note });
  if (chosen.length) emit({ type: 'blocks', blocks: chosen });
  emit({ type: 'done' });

  if (check !== 'flagged' && !draft.outcome.cut && cacheable && draft.answer) {
    putCached(question.content, fingerprint, draft.answer, chosen, draft.outcome.model);
  }

  log('answered', {
    answer: `${draft.answer}${note}`,
    models: attemptSummary(attempts),
    answerModel: draft.outcome.model,
    check,
    cut: draft.outcome.cut,
  });
  console.info('reborn-ai request', {
    id,
    routes: decision.routes,
    handling: decision.handling,
    style: decision.style,
    guard: decision.guard,
    usedJev: decision.usedJev,
    answerable,
    escalated,
    answerModel: draft.outcome.model,
    answerUsage: draft.outcome.usage,
    attempts: attemptSummary(attempts),
    check,
    cut: draft.outcome.cut,
    routeMs: Math.round(routedAt - startedAt),
    fetchMs: Math.round(fetchedAt - routedAt),
    judgeMs: Math.round(judgedAt - fetchedAt),
    generationMs: Math.round(performance.now() - judgedAt),
    evidence: evidence.map(({ tool, status }) => ({ tool, status })),
  });
}
