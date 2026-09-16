import 'server-only';

import { createHash } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/server/firebase-admin';

export type RateWindow = {
  seconds: number;
  max: number;
};

export type RateResult = {
  ok: boolean;
  retryAfter: number;
};

type Slot = {
  start: number;
  count: number;
};

const memory = new Map<string, Record<string, Slot>>();
const memoryCap = 5000;

const slotKey = (window: RateWindow) => `w${window.seconds}`;
const docKey = (key: string) => createHash('sha256').update(key).digest('hex').slice(0, 32);

function apply(slots: Record<string, Slot>, windows: RateWindow[], now: number): RateResult {
  let retryAfter = 0;

  for (const window of windows) {
    const name = slotKey(window);
    const span = window.seconds * 1000;
    const slot = slots[name];
    const fresh = !slot || now - slot.start >= span;
    const next = fresh ? { start: now, count: 1 } : { start: slot.start, count: slot.count + 1 };

    slots[name] = next;
    if (next.count > window.max) retryAfter = Math.max(retryAfter, Math.ceil((next.start + span - now) / 1000));
  }

  return { ok: retryAfter === 0, retryAfter };
}

function memoryLimit(key: string, windows: RateWindow[], now: number) {
  if (memory.size > memoryCap) memory.clear();

  const slots = memory.get(key) ?? {};
  const result = apply(slots, windows, now);
  memory.set(key, slots);
  return result;
}

export async function checkRateLimit(key: string, windows: RateWindow[]): Promise<RateResult> {
  const now = Date.now();

  try {
    const ref = getAdminDb().collection('rateLimits').doc(docKey(key));

    return await getAdminDb().runTransaction(async (transaction) => {
      const doc = await transaction.get(ref);
      const slots = (doc.data()?.slots ?? {}) as Record<string, Slot>;
      const result = apply(slots, windows, now);
      transaction.set(ref, {
        slots,
        updatedAt: now,
        expiresAt: Timestamp.fromMillis(now + Math.max(...windows.map((window) => window.seconds)) * 1000),
      }, { merge: true });
      return result;
    });
  } catch {
    return memoryLimit(key, windows, now);
  }
}

export function clientKey(headers: Headers) {
  const platform = headers.get('x-vercel-forwarded-for')?.trim() || headers.get('x-real-ip')?.trim();
  if (platform) return platform;

  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
