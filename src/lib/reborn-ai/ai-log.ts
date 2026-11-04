import 'server-only';

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/server/firebase-admin';

// One Firestore doc per answered request (aiLogs) and one per question the
// facts could not answer (aiGaps). Both expire on their own: the nightly
// cleanup-firestore.mjs job deletes anything past expiresAt. Logging never
// gets in the way of an answer, so every write swallows its errors.

const logDays = 30;
const gapDays = 60;

const expires = (days: number) => Timestamp.fromMillis(Date.now() + days * 86_400_000);
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text);

export type RequestLog = {
  question: string;
  answer: string;
  outcome: 'answered' | 'cached' | 'rescued' | 'failed' | 'limited';
  routes: string[];
  handling: string;
  style: number;
  guard: string | null;
  entities: Record<string, unknown>;
  tools: { name: string; status: string }[];
  chunks: string[];
  jev: Record<string, unknown>;
  models: { model: string; result: string; ms: number; status?: number }[];
  answerModel: string;
  check: string;
  escalated: boolean;
  cut: boolean;
  timings: Record<string, number>;
  error?: string;
  viewer: boolean;
  facts?: string;
};

export function logRequest(id: string, log: RequestLog) {
  void Promise.resolve().then(() => getAdminDb().collection('aiLogs').doc(id).set({
    ...log,
    question: clip(log.question, 2000),
    answer: clip(log.answer, 6000),
    facts: log.facts ? clip(log.facts, 20000) : null,
    at: Timestamp.now(),
    expiresAt: expires(logDays),
  })).catch((error) => console.warn('reborn-ai log write failed', { error: error instanceof Error ? error.message : String(error) }));
}

export function logGap(id: string, gap: { question: string; routes: string[]; answerable: number | null; escalated: boolean }) {
  void Promise.resolve().then(() => getAdminDb().collection('aiGaps').doc(id).set({
    ...gap,
    question: clip(gap.question, 2000),
    at: Timestamp.now(),
    expiresAt: expires(gapDays),
  })).catch(() => {});
}

export async function readLog(id: string) {
  const snapshot = await getAdminDb().collection('aiLogs').doc(id).get();
  return snapshot.exists ? snapshot.data() as RequestLog & { feedback?: { vote: string } } : null;
}

export async function saveFeedback(id: string, feedback: { vote: 'up' | 'down'; note: string; triage: string | null }) {
  await getAdminDb().collection('aiLogs').doc(id).set({ feedback: { ...feedback, at: Timestamp.now() } }, { merge: true });
}
