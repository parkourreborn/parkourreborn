import 'server-only';

import { limits } from '@/lib/reborn-ai/limits';

export type ModelMessage = { role: 'system' | 'user'; content: string };

type Delta = { content?: string | null };
type Usage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };

const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
const mistralFallback = 'mistralai/mistral-small-3.2-24b-instruct:free';
const fallbackModels = ['google/gemma-4-31b-it:free', mistralFallback, 'google/gemma-4-26b-a4b-it:free'];

type RateDiagnostic = {
  providerCode?: string | number;
  limitSource?: string;
  remaining?: string;
  reset?: string;
  retryAfter?: string;
};

export class ModelError extends Error {
  status: number;
  diagnostic?: RateDiagnostic;

  constructor(message: string, status = 0, diagnostic?: RateDiagnostic) {
    super(message);
    this.status = status;
    this.diagnostic = diagnostic;
  }
}

export function modelNames() {
  const raw = process.env.OPENROUTER_MODELS?.trim() || process.env.OPENROUTER_MODEL?.trim() || '';
  const names = raw.split(',').map((name) => name.trim()).filter(Boolean);
  if (!names.length) return fallbackModels;
  // Existing Gemma-only deployments also get an independent free fallback.
  return names.every((name) => name.startsWith('google/gemma-4-')) && !names.includes(mistralFallback)
    ? [names[0], mistralFallback, ...names.slice(1)]
    : names;
}

export function hasModelKey() {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

function headers() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new ModelError('missing key');

  return {
    'content-type': 'application/json',
    authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.parkourreborn.com',
    'X-Title': 'Parkour Reborn Hub',
  };
}

const retryable = new Set([408, 409, 429, 500, 502, 503, 504]);

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new ModelError('aborted'));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new ModelError('aborted'));
    }, { once: true });
  });
}

function backoff(attempt: number, retryAfter?: string | null) {
  const header = Number(retryAfter);
  if (Number.isFinite(header) && header > 0) return Math.min(header * 1000, 5000);
  return 500 * 2 ** attempt;
}

function watchdog(span: number, signal?: AbortSignal) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const relay = () => {
    clear();
    controller.abort(signal?.reason);
  };
  const bump = (next = span) => {
    clear();
    timer = setTimeout(() => controller.abort(new ModelError('model went quiet')), next);
  };
  const stop = () => {
    clear();
    signal?.removeEventListener('abort', relay);
  };

  if (signal?.aborted) relay();
  else signal?.addEventListener('abort', relay, { once: true });
  bump();
  return { signal: controller.signal, bump, stop };
}

function asModelError(error: unknown) {
  return error instanceof ModelError
    ? error
    : new ModelError(error instanceof Error ? error.message : 'model call failed');
}

export async function freeModelQuota() {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/key', {
      headers: { authorization: `Bearer ${process.env.OPENROUTER_API_KEY?.trim() ?? ''}` },
      signal: AbortSignal.timeout(2000),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const body = await response.json() as { data?: { free_model_daily_requests?: { used?: number; limit?: number; remaining?: number } } };
    return body.data?.free_model_daily_requests ?? null;
  } catch {
    return null;
  }
}

async function openStream(messages: ModelMessage[], signal?: AbortSignal) {
  const names = modelNames();
  const body = JSON.stringify({
    model: names[0],
    ...(names.length > 1 ? { models: names.slice(1) } : {}),
    messages,
    stream: true,
    stream_options: { include_usage: true },
    max_tokens: limits.maxOutputTokens,
    reasoning_effort: 'none',
    temperature: 0.1,
    provider: { sort: 'latency' },
  });

  for (let attempt = 0; ; attempt += 1) {
    const watch = watchdog(limits.modelConnectMs, signal);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: headers(), signal: watch.signal, body });
      if (response.ok && response.body) {
        watch.bump(limits.modelIdleMs);
        return { body: response.body, watch };
      }

      const responseBody = await response.json().catch(() => null);
      watch.stop();
      const detail = typeof responseBody?.error?.message === 'string' ? responseBody.error.message.slice(0, 500) : '';
      const metadata = responseBody?.error?.metadata;
      const diagnostic: RateDiagnostic = {
        providerCode: typeof metadata?.provider_code === 'string' || typeof metadata?.provider_code === 'number' ? metadata.provider_code : undefined,
        limitSource: typeof metadata?.limit_source === 'string' ? metadata.limit_source : undefined,
        remaining: response.headers.get('x-ratelimit-remaining') ?? undefined,
        reset: response.headers.get('x-ratelimit-reset') ?? undefined,
        retryAfter: response.headers.get('retry-after') ?? undefined,
      };
      const failure = new ModelError(`model responded ${response.status}${detail ? `: ${detail}` : ''}`, response.status, diagnostic);
      const retrySeconds = Number(diagnostic.retryAfter);
      const canRetryRateLimit = response.status !== 429 || (Number.isFinite(retrySeconds) && retrySeconds > 0 && retrySeconds <= 5);
      if (!retryable.has(response.status) || attempt >= limits.maxModelRetries || !canRetryRateLimit) {
        throw failure;
      }
      await wait(backoff(attempt, diagnostic.retryAfter), signal);
    } catch (error) {
      watch.stop();
      const modelError = asModelError(error);
      if (signal?.aborted || attempt >= limits.maxModelRetries || modelError.status) throw modelError;
      await wait(backoff(attempt), signal);
    }
  }
}

export async function streamModel(
  messages: ModelMessage[],
  onText: (delta: string) => void,
  signal?: AbortSignal,
) {
  const { body, watch } = await openStream(messages, signal);
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let content = '';
  let buffer = '';
  let model = '';
  let usage: Usage | undefined;
  let truncated = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      watch.bump(limits.modelIdleMs);
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const payload = line.trim().startsWith('data:') ? line.trim().slice(5).trim() : '';
        if (!payload || payload === '[DONE]') continue;

        let event: { error?: { code?: number; message?: string }; choices?: { delta?: Delta; finish_reason?: string | null }[]; model?: string; usage?: Usage };
        try {
          event = JSON.parse(payload) as typeof event;
        } catch {
          continue;
        }
        if (event.error) throw new ModelError(event.error.message || 'model stream failed', event.error.code ?? 0);
        if (event.model) model = event.model;
        if (event.usage) usage = event.usage;
        if (event.choices?.[0]?.finish_reason === 'length') truncated = true;
        const delta = event.choices?.[0]?.delta?.content;
        if (delta) {
          content += delta;
          onText(delta);
        }
      }
    }
  } catch (error) {
    throw asModelError(error);
  } finally {
    watch.stop();
  }

  if (truncated) throw new ModelError('model answer was cut off');

  return { content, model, usage };
}
