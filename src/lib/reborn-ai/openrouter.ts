import 'server-only';

import { limits } from '@/lib/reborn-ai/limits';
import { classifyFailure, cooldownFor, errorMessage, reasoningSettings } from '@/lib/reborn-ai/model-list';
import type { Failure, ModelCaps } from '@/lib/reborn-ai/model-list';
import { apiKey, coolDown, freeModelQuota, modelPlan, recovered } from '@/lib/reborn-ai/models';

export type ModelMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type Usage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };

type AttemptFailure = Failure | 'timeout' | 'empty' | 'network';

export type AttemptLog = {
  model: string;
  result: 'ok' | AttemptFailure;
  ms: number;
  status?: number;
  detail?: string;
};

export type AnswerOutcome = {
  content: string;
  model: string;
  usage?: Usage;
  // The model stopped before it finished: it hit the token cap or its stream
  // broke after text had already reached the user.
  cut: boolean;
  attempts: AttemptLog[];
};

export type ModelErrorKind = 'quota' | 'busy' | 'auth' | 'unavailable' | 'aborted';

export class ModelError extends Error {
  kind: ModelErrorKind;
  attempts: AttemptLog[];

  constructor(kind: ModelErrorKind, message: string, attempts: AttemptLog[] = []) {
    super(message);
    this.kind = kind;
    this.attempts = attempts;
  }
}

type StreamOptions = {
  onText: (delta: string) => void;
  onStatus?: (state: 'queued' | 'writing') => void;
  signal?: AbortSignal;
};

type AttemptResult =
  | { ok: true; content: string; model: string; usage?: Usage; cut: boolean }
  | { ok: false; failure: AttemptFailure; status?: number; retryAfterMs?: number; detail?: string };

type StreamEvent = {
  error?: { code?: number | string; message?: string; metadata?: unknown };
  choices?: { delta?: { content?: string | null }; finish_reason?: string | null }[];
  model?: string;
  usage?: Usage;
};

const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

function headers() {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${apiKey()}`,
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.parkourreborn.com',
    'X-Title': 'Parkour Reborn Hub',
  };
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new ModelError('aborted', 'aborted'));
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', stop);
      resolve();
    }, ms);
    const stop = () => {
      clearTimeout(timer);
      reject(new ModelError('aborted', 'aborted'));
    };
    signal?.addEventListener('abort', stop, { once: true });
  });
}

function retryAfterMs(response: Response) {
  const seconds = Number(response.headers.get('retry-after'));
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  const reset = Number(response.headers.get('x-ratelimit-reset'));
  if (Number.isFinite(reset) && reset > Date.now()) return reset - Date.now();
  return undefined;
}

// One call to one model. Text is handed to onText as it arrives. Once any text
// has gone out the attempt never reports a failure, because the caller cannot
// switch models under a reply the user is already reading.
async function attempt(
  id: string,
  caps: ModelCaps | undefined,
  messages: ModelMessage[],
  plain: boolean,
  onText: (delta: string) => void,
  signal?: AbortSignal,
): Promise<AttemptResult> {
  const settings = reasoningSettings(caps, limits.maxOutputTokens, limits.reasoningTokens);
  const body = JSON.stringify({
    model: id,
    messages,
    stream: true,
    stream_options: { include_usage: true },
    max_tokens: settings.maxTokens,
    temperature: 0.2,
    ...(settings.reasoning && !plain ? { reasoning: settings.reasoning } : {}),
  });

  const controller = new AbortController();
  let timedOut = false;
  const relay = () => controller.abort();
  const expire = () => {
    timedOut = true;
    controller.abort();
  };

  if (signal?.aborted) throw new ModelError('aborted', 'aborted');
  signal?.addEventListener('abort', relay, { once: true });

  // Two clocks: one for the first word of the reply, one for the stream going
  // silent. Keep-alive comments and hidden reasoning both reset the second.
  let firstWord: ReturnType<typeof setTimeout> | null = setTimeout(expire, settings.slow ? limits.reasoningFirstTokenMs : limits.firstTokenMs);
  let silence: ReturnType<typeof setTimeout> | null = null;
  const heard = () => {
    if (silence) clearTimeout(silence);
    silence = setTimeout(expire, limits.modelIdleMs);
  };
  const cleanup = () => {
    if (firstWord) clearTimeout(firstWord);
    if (silence) clearTimeout(silence);
    firstWord = null;
    silence = null;
    signal?.removeEventListener('abort', relay);
  };

  let content = '';
  let model = id;
  let usage: Usage | undefined;
  let finish = '';

  try {
    let response: Response;
    try {
      response = await fetch(endpoint, { method: 'POST', headers: headers(), body, signal: controller.signal });
    } catch {
      if (signal?.aborted) throw new ModelError('aborted', 'aborted');
      return { ok: false, failure: timedOut ? 'timeout' : 'network' };
    }

    if (!response.ok || !response.body) {
      const errorBody = await response.json().catch(() => null);
      return {
        ok: false,
        failure: classifyFailure(response.status, errorBody),
        status: response.status,
        retryAfterMs: retryAfterMs(response),
        detail: errorMessage(errorBody),
      };
    }

    heard();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        heard();
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;

          let event: StreamEvent;
          try {
            event = JSON.parse(payload) as StreamEvent;
          } catch {
            continue;
          }

          if (event.error) {
            if (content) return { ok: true, content, model, usage, cut: true };
            const code = Number(event.error.code) || 0;
            return { ok: false, failure: classifyFailure(code, { error: event.error }), status: code, detail: errorMessage({ error: event.error }) };
          }
          if (event.model) model = event.model;
          if (event.usage) usage = event.usage;

          const choice = event.choices?.[0];
          if (choice?.finish_reason) finish = choice.finish_reason;
          const delta = choice?.delta?.content;
          if (delta) {
            if (firstWord) {
              clearTimeout(firstWord);
              firstWord = null;
            }
            content += delta;
            onText(delta);
          }
        }
      }
    } catch {
      if (signal?.aborted) throw new ModelError('aborted', 'aborted');
      if (content) return { ok: true, content, model, usage, cut: true };
      return { ok: false, failure: timedOut ? 'timeout' : 'network' };
    }

    if (!content.trim()) {
      // finish_reason "length" with no text means the model spent the whole
      // budget thinking. Either way there is nothing to show from this model.
      return { ok: false, failure: finish === 'error' ? 'error' : 'empty', detail: finish ? `finish_reason ${finish}` : undefined };
    }

    return { ok: true, content, model, usage, cut: finish === 'length' || finish === 'error' };
  } finally {
    cleanup();
    controller.abort();
  }
}

// Streams one answer, walking the OPENROUTER_MODEL list in order until a model
// replies. Throws ModelError only when no model produced any text at all.
export async function streamAnswer(messages: ModelMessage[], { onText, onStatus, signal }: StreamOptions): Promise<AnswerOutcome> {
  const plan = await modelPlan();
  const attempts: AttemptLog[] = [];
  const deadline = Date.now() + limits.answerBudgetMs;
  let queueLeft = limits.queueWaitMs;
  let busy = false;

  if (!plan.length) throw new ModelError('unavailable', 'no models configured');

  for (const { id, caps } of plan) {
    let plain = false;
    let waits = 0;

    while (Date.now() < deadline) {
      const started = Date.now();
      const result = await attempt(id, caps, messages, plain, onText, signal);
      const ms = Date.now() - started;

      if (result.ok) {
        recovered(id);
        attempts.push({ model: id, result: 'ok', ms });
        return { content: result.content, model: result.model, usage: result.usage, cut: result.cut, attempts };
      }

      attempts.push({ model: id, result: result.failure, ms, status: result.status, detail: result.detail });

      if (result.failure === 'auth') throw new ModelError('auth', result.detail || 'openrouter rejected the key', attempts);
      if (result.failure === 'daily') throw new ModelError('quota', 'free requests used up for today', attempts);

      // The model may not accept our reasoning setting. Try it once without.
      if (result.failure === 'bad_request' && !plain && reasoningSettings(caps, 1, 1).reasoning) {
        plain = true;
        continue;
      }

      if (result.failure === 'minute') {
        busy = true;
        const left = await freeModelQuota();
        if (left?.remaining === 0) throw new ModelError('quota', 'free requests used up for today', attempts);
        // The per-minute limit covers the whole account, so wait our turn
        // instead of burning through the rest of the list.
        const wait = Math.min(result.retryAfterMs ?? 4000, 10_000, queueLeft, deadline - Date.now());
        if (wait > 0 && waits < 2) {
          waits += 1;
          queueLeft -= wait;
          onStatus?.('queued');
          await sleep(wait, signal);
          onStatus?.('writing');
          continue;
        }
        break;
      }

      if (result.failure === 'busy' || result.failure === 'timeout') busy = true;
      coolDown(id, cooldownFor(result.failure));
      break;
    }
  }

  throw new ModelError(busy ? 'busy' : 'unavailable', 'no model answered', attempts);
}
