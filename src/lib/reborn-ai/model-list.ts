// Pure helpers for the OPENROUTER_MODEL list.

export const freeRouter = 'openrouter/free';

export function isFreeModel(id: string) {
  return id.endsWith(':free') || id === freeRouter;
}

// "a:free, b:free,a:free" -> ["a:free", "b:free"]. Anything that is not a free
// model is dropped so a typo in the env can never start billing the account.
export function parseModelList(raw: string | undefined) {
  const models: string[] = [];
  const rejected: string[] = [];
  const seen = new Set<string>();

  for (const part of (raw ?? '').split(',')) {
    const id = part.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (isFreeModel(id)) models.push(id);
    else rejected.push(id);
  }

  return { models, rejected };
}

export type ReasoningMode = 'unsupported' | 'optional' | 'mandatory';

export type ModelCaps = {
  id: string;
  reasoning: ReasoningMode;
  efforts: string[];
  maxCompletion: number | null;
  expired: boolean;
};

type CatalogEntry = {
  id?: unknown;
  supported_parameters?: unknown;
  reasoning?: unknown;
  top_provider?: unknown;
  expiration_date?: unknown;
};

const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

// One entry of GET https://openrouter.ai/api/v1/models -> what we need to call it well.
export function readCaps(entry: CatalogEntry, now = Date.now()): ModelCaps | null {
  if (typeof entry.id !== 'string' || !entry.id) return null;

  const params = strings(entry.supported_parameters);
  const reasoning = entry.reasoning && typeof entry.reasoning === 'object' ? entry.reasoning as Record<string, unknown> : {};
  const takesReasoning = params.includes('reasoning') || params.includes('reasoning_effort');
  const mode: ReasoningMode = reasoning.mandatory === true ? 'mandatory' : takesReasoning ? 'optional' : 'unsupported';

  const provider = entry.top_provider && typeof entry.top_provider === 'object' ? entry.top_provider as Record<string, unknown> : {};
  const maxCompletion = typeof provider.max_completion_tokens === 'number' && provider.max_completion_tokens > 0
    ? provider.max_completion_tokens
    : null;

  const expires = typeof entry.expiration_date === 'string' ? Date.parse(entry.expiration_date) : Number.NaN;

  return {
    id: entry.id,
    reasoning: mode,
    efforts: strings(reasoning.supported_efforts),
    maxCompletion,
    expired: Number.isFinite(expires) && expires <= now,
  };
}

export type ReasoningSettings = {
  reasoning?: { effort: string };
  maxTokens: number;
  // Models that think before answering take longer to send their first word.
  slow: boolean;
};

// Reasoning tokens count against max_tokens on OpenRouter. If a model thinks
// through the whole budget the reply comes back empty, so thinking is switched
// off where the model allows it and given its own room where it does not.
export function reasoningSettings(caps: ModelCaps | undefined, answerTokens: number, thinkingTokens: number): ReasoningSettings {
  const cap = (tokens: number) => (caps?.maxCompletion ? Math.min(tokens, caps.maxCompletion) : tokens);

  if (!caps) {
    return { reasoning: { effort: 'none' }, maxTokens: cap(answerTokens + thinkingTokens), slow: true };
  }

  if (caps.reasoning === 'unsupported') return { maxTokens: cap(answerTokens), slow: false };

  if (caps.reasoning === 'optional' && (!caps.efforts.length || caps.efforts.includes('none'))) {
    return { reasoning: { effort: 'none' }, maxTokens: cap(answerTokens), slow: false };
  }

  const effort = ['low', 'minimal', 'medium'].find((name) => !caps.efforts.length || caps.efforts.includes(name))
    ?? caps.efforts.find((name) => name !== 'none');
  return { ...(effort ? { reasoning: { effort } } : {}), maxTokens: cap(answerTokens + thinkingTokens), slow: true };
}

export type Failure =
  | 'auth' // the key or account is broken, every model will fail the same way
  | 'daily' // the account's free requests for today are gone
  | 'minute' // the account's per-minute free limit, waiting helps
  | 'busy' // that model's upstream provider is rate limited or full
  | 'gone' // the model or its free endpoints no longer exist
  | 'bad_request' // the model rejected our request shape
  | 'error'; // anything else from that model

type ErrorBody = { error?: { message?: unknown; code?: unknown; metadata?: unknown } } | null | undefined;

export function errorMessage(body: unknown) {
  const message = (body as ErrorBody)?.error?.message;
  return typeof message === 'string' ? message.slice(0, 300) : '';
}

export function classifyFailure(status: number, body: unknown): Failure {
  if (status === 401 || status === 402) return 'auth';
  if (status === 400 || status === 422) return 'bad_request';
  if (status === 404) return 'gone';

  if (status === 429) {
    const error = (body as ErrorBody)?.error;
    const metadata = error?.metadata && typeof error.metadata === 'object' ? error.metadata as Record<string, unknown> : {};
    const source = typeof metadata.limit_source === 'string' ? metadata.limit_source : '';
    const upstream = typeof metadata.provider_name === 'string' || 'raw' in metadata || source.startsWith('upstream');
    if (upstream) return 'busy';
    if (/per[- ]?day|daily/i.test(errorMessage(body))) return 'daily';
    return 'minute';
  }

  return 'error';
}

// How long a model sits out after failing. Account wide failures are not the
// model's fault, so they never put it on the bench.
export function cooldownFor(failure: Failure | 'timeout' | 'empty' | 'network') {
  if (failure === 'gone') return 30 * 60_000;
  if (failure === 'bad_request') return 10 * 60_000;
  if (failure === 'auth' || failure === 'daily' || failure === 'minute') return 0;
  if (failure === 'empty' || failure === 'timeout') return 30_000;
  return 60_000;
}
