import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/server/firebase-admin';

export type SaveDoc = Record<string, unknown>;
export type SaveCheck = { ok: true; save: SaveDoc } | { ok: false; reason: string };

type TrialStat = {
  name: string;
  bestTime: number | null;
  creditsEarned: number;
};

type SaveRow = {
  rev?: number;
  doc?: SaveDoc;
};

export const maxBytes = 256 * 1024;

const maxTrials = 200;
const maxName = 64;
const maxDepth = 12;
const maxString = 64 * 1024;

const isPlain = (value: unknown): value is SaveDoc => typeof value === 'object' && value !== null && !Array.isArray(value);
const isCount = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value > 0;
const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const bad = (reason: string): SaveCheck => ({ ok: false, reason });

export const tooBig = (text: string) => Buffer.byteLength(text) > maxBytes;

function walk(value: unknown, depth: number): string {
  if (depth > maxDepth) return 'too-deep';
  if (typeof value === 'number') return Number.isFinite(value) ? '' : 'bad-number';

  if (Array.isArray(value)) {
    for (const item of value) {
      const reason = walk(item, depth + 1);
      if (reason) return reason;
    }
    return '';
  }

  if (isPlain(value)) {
    for (const item of Object.values(value)) {
      const reason = walk(item, depth + 1);
      if (reason) return reason;
    }
  }

  return '';
}

function checkTrials(trials: unknown): string {
  if (trials === undefined || trials === null) return '';
  if (!Array.isArray(trials)) return 'bad-trials';
  if (trials.length > maxTrials) return 'too-many-trials';

  for (const trial of trials) {
    if (!isPlain(trial)) return 'bad-trial';
    if (typeof trial.name !== 'string' || !trial.name) return 'bad-trial-name';
    if (trial.name.length > maxName) return 'long-trial-name';
  }

  return '';
}

export function checkSave(value: unknown): SaveCheck {
  if (!isPlain(value)) return bad('not-an-object');
  if (!isCount(value.version)) return bad('bad-version');

  const trials = checkTrials(value.trials);
  if (trials) return bad(trials);

  const shape = walk(value, 1);
  if (shape) return bad(shape);

  return { ok: true, save: value };
}

export function parseSave(text: string): SaveCheck {
  try {
    return checkSave(JSON.parse(text));
  } catch {
    return bad('bad-json');
  }
}

const dropKey = (key: string) => !key || key === 'constructor' || key === 'prototype' || /^__.*__$/.test(key) || /[./[\]*`]/.test(key);

function clean(value: unknown): unknown {
  if (typeof value === 'string') return value.length > maxString ? value.slice(0, maxString) : value;
  if (Array.isArray(value)) return value.map(clean);
  if (!isPlain(value)) return value;

  const next: SaveDoc = {};
  for (const [key, item] of Object.entries(value)) {
    if (dropKey(key)) continue;
    next[key] = clean(item);
  }

  return next;
}

export function summary(save: SaveDoc) {
  const credits = isPlain(save.credits) ? save.credits : {};

  return {
    playtimeSeconds: num(save.playtimeSeconds),
    lifetimeCredits: num(credits.lifetimeEarned),
    balance: num(credits.balance),
  };
}

function trialStats(save: SaveDoc): TrialStat[] {
  const trials = Array.isArray(save.trials) ? save.trials : [];

  return trials.filter(isPlain).map((trial) => ({
    name: String(trial.name ?? ''),
    bestTime: typeof trial.bestTimeSeconds === 'number' && Number.isFinite(trial.bestTimeSeconds) && trial.bestTimeSeconds !== -1 ? trial.bestTimeSeconds : null,
    creditsEarned: num(trial.creditsEarned),
  })).filter((stat) => stat.name);
}

function changedStats(previous: SaveDoc | undefined, stats: TrialStat[]) {
  const before = new Map(trialStats(previous ?? {}).map((stat) => [stat.name, stat]));

  return stats.filter((stat) => {
    const old = before.get(stat.name);
    return !old || old.bestTime !== stat.bestTime || old.creditsEarned !== stat.creditsEarned;
  });
}

const statId = (discordId: string, name: string) => `${discordId}_${name.replace(/\//g, '-')}`;

export async function readSave(discordId: string) {
  const snapshot = await getAdminDb().collection('saves').doc(discordId).get();
  const data = snapshot.data() as SaveRow | undefined;

  if (!data || !isPlain(data.doc)) return { save: null, rev: 0 };
  return { save: data.doc, rev: num(data.rev) };
}

type WriteInput = {
  discordId: string;
  name: string;
  save: SaveDoc;
  baseRev: number | null;
};

export async function writeSave({ discordId, name, save, baseRev }: WriteInput) {
  const db = getAdminDb();
  const ref = db.collection('saves').doc(discordId);
  const userRef = db.collection('users').doc(`discord-${discordId}`);
  const doc = clean(save) as SaveDoc;
  const stats = trialStats(doc);

  return db.runTransaction(async (tx) => {
    const [snapshot, user] = await Promise.all([tx.get(ref), tx.get(userRef)]);
    const profile = user.data();
    if (!profile || profile.discord?.id !== discordId || profile.status === 'deactivated' || profile.status === 'deleting') throw new Error('Account unavailable');
    const data = snapshot.data() as SaveRow | undefined;
    const rev = num(data?.rev);

    if (baseRev !== null && baseRev !== rev) {
      return { ok: false as const, rev, save: isPlain(data?.doc) ? data.doc : null };
    }

    tx.set(ref, {
      rev: rev + 1,
      doc,
      discordName: profile.displayName || name,
      ...summary(doc),
      updatedAt: FieldValue.serverTimestamp(),
    });

    for (const stat of changedStats(data?.doc, stats)) {
      tx.set(db.collection('trialStats').doc(statId(discordId, stat.name)), {
        discordId,
        trialName: stat.name,
        creditsEarned: stat.creditsEarned,
        ...(stat.bestTime === null ? {} : { bestTime: stat.bestTime }),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    return { ok: true as const, rev: rev + 1 };
  });
}
