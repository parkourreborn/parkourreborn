import 'server-only';

import { limits } from '@/lib/reborn-ai/limits';
import { parseModelList, readCaps } from '@/lib/reborn-ai/model-list';
import type { ModelCaps } from '@/lib/reborn-ai/model-list';

type Catalog = Map<string, ModelCaps>;
type Quota = { used?: number; limit?: number; remaining?: number };

const catalogUrl = 'https://openrouter.ai/api/v1/models';
const keyUrl = 'https://openrouter.ai/api/v1/key';

let catalog: { at: number; ttl: number; value: Promise<Catalog | null> } | null = null;
let quota: { at: number; value: Promise<Quota | null> } | null = null;
const cooldowns = new Map<string, number>();
const warned = new Set<string>();

export const apiKey = () => process.env.OPENROUTER_API_KEY?.trim() ?? '';

export function configuredModels() {
  return parseModelList(process.env.OPENROUTER_MODEL).models;
}

export function hasModelConfig() {
  return Boolean(apiKey() && configuredModels().length);
}

function warnOnce(key: string, message: string, detail: Record<string, unknown>) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message, detail);
}

async function fetchCatalog(): Promise<Catalog | null> {
  try {
    const response = await fetch(catalogUrl, { signal: AbortSignal.timeout(4000), cache: 'no-store' });
    if (!response.ok) return null;
    const body = await response.json() as { data?: unknown };
    if (!Array.isArray(body.data)) return null;

    const map: Catalog = new Map();
    for (const entry of body.data) {
      const caps = readCaps(entry ?? {});
      if (caps) map.set(caps.id, caps);
    }
    return map.size ? map : null;
  } catch {
    return null;
  }
}

// The public model list says which models still exist and how each handles
// reasoning. It barely changes, so one fetch an hour is plenty. If it cannot be
// loaded we carry on without it and treat every configured model as usable.
function modelCatalog() {
  const now = Date.now();
  if (catalog && now - catalog.at < catalog.ttl) return catalog.value;

  const value = fetchCatalog();
  catalog = { at: now, ttl: limits.catalogCacheMs, value };
  void value.then((loaded) => {
    if (!loaded && catalog?.value === value) catalog.ttl = 60_000;
  });
  return value;
}

export function coolDown(id: string, ms: number) {
  if (ms > 0) cooldowns.set(id, Date.now() + ms);
}

export function recovered(id: string) {
  cooldowns.delete(id);
}

export type PlannedModel = { id: string; caps?: ModelCaps };

// The order to try models in for one answer: the env order, minus models that
// no longer exist, with any model that failed recently pushed to the back.
// Benched models stay in the list so there is always something left to try.
export async function modelPlan(): Promise<PlannedModel[]> {
  const { models, rejected } = parseModelList(process.env.OPENROUTER_MODEL);
  for (const id of rejected) {
    warnOnce(`paid:${id}`, 'reborn-ai skipped a model that is not free, only :free models and openrouter/free are used', { model: id });
  }

  const caps = await modelCatalog();
  const live = models.filter((id) => {
    if (!caps) return true;
    const info = caps.get(id);
    if (!info) {
      warnOnce(`missing:${id}`, 'reborn-ai model is not on OpenRouter anymore, remove it from OPENROUTER_MODEL', { model: id });
      return false;
    }
    if (info.expired) {
      warnOnce(`expired:${id}`, 'reborn-ai model has expired on OpenRouter, remove it from OPENROUTER_MODEL', { model: id });
      return false;
    }
    return true;
  });

  const list = live.length ? live : models;
  const now = Date.now();
  const benched = (id: string) => (cooldowns.get(id) ?? 0) > now;
  const ready = list.filter((id) => !benched(id));
  const resting = list.filter(benched).sort((a, b) => (cooldowns.get(a) ?? 0) - (cooldowns.get(b) ?? 0));

  return [...ready, ...resting].map((id) => ({ id, caps: caps?.get(id) }));
}

async function fetchQuota(): Promise<Quota | null> {
  try {
    const response = await fetch(keyUrl, {
      headers: { authorization: `Bearer ${apiKey()}` },
      signal: AbortSignal.timeout(2000),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const body = await response.json() as { data?: { free_model_daily_requests?: Quota } };
    return body.data?.free_model_daily_requests ?? null;
  } catch {
    return null;
  }
}

// How many free requests the account has left today, cached for a minute.
export function freeModelQuota() {
  const now = Date.now();
  if (quota && now - quota.at < limits.quotaCacheMs) return quota.value;
  const value = fetchQuota();
  quota = { at: now, value };
  return value;
}
