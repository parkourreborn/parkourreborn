import 'server-only';

import { limits } from '@/lib/reborn-ai/limits';

export type ModelMessage = { role: 'system' | 'user'; content: string };

type Delta = { content?: string | null };
type Usage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };

const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
const fallbackModel = 'openrouter/free';

export class ModelError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

export function modelNames() {
  const raw = process.env.OPENROUTER_MODELS?.trim() || process.env.OPENROUTER_MODEL?.trim() || '';
  const names = raw.split(',').map((name) => name.trim()).filter(Boolean);
  return names.length ? names : [fallbackModel];
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

async function openStream(messages: ModelMessage[], signal?: AbortSignal) {
  const names = modelNames();
  const body = JSON.stringify({
    model: names[0],
    ...(names.length > 1 ? { models: names } : {}),
    messages,
    stream: true,
    stream_options: { include_usage: true },
    max_tokens: limits.maxOutputTokens,
    temperature: 0.35,
    provider: { sort: 'throughput' },
  });

  for (let attempt = 0; ; attempt += 1) {
    const watch = watchdog(limits.modelConnectMs, signal);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: headers(), signal: watch.signal, body });
      if (response.ok && response.body) {
        watch.bump(limits.modelIdleMs);
        return { body: response.body, watch };
      }

      watch.stop();
      await response.body?.cancel().catch(() => {});
      if (!retryable.has(response.status) || attempt >= limits.maxModelRetries) {
        throw new ModelError(`model responded ${response.status}`, response.status);
      }
      await wait(backoff(attempt, response.headers.get('retry-after')), signal);
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

        let event: { error?: { code?: number; message?: string }; choices?: { delta?: Delta }[]; model?: string; usage?: Usage };
        try {
          event = JSON.parse(payload) as typeof event;
        } catch {
          continue;
        }
        if (event.error) throw new ModelError(event.error.message || 'model stream failed', event.error.code ?? 0);
        if (event.model) model = event.model;
        if (event.usage) usage = event.usage;
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

  return { content, model, usage };
}
