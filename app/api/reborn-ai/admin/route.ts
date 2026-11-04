import { NextRequest, NextResponse } from 'next/server';
import { recentGaps, recentLogs } from '@/lib/reborn-ai/ai-log';
import { configuredModels, freeModelQuota } from '@/lib/reborn-ai/models';
import { readSession } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Discord ids allowed to see the Reborn AI admin view, comma separated.
const admins = () => new Set((process.env.REBORN_AI_ADMINS ?? '').split(',').map((id) => id.trim()).filter(Boolean));

const stamp = (value: unknown) => {
  const millis = (value as { toMillis?: () => number } | undefined)?.toMillis?.();
  return typeof millis === 'number' ? new Date(millis).toISOString() : null;
};

export async function GET(request: NextRequest) {
  const session = await readSession(request).catch(() => null);
  // Anyone else gets the same answer as for a page that does not exist.
  if (!session || !admins().has(session.discordId)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const [logs, gaps, quota] = await Promise.all([recentLogs(300), recentGaps(60), freeModelQuota()]);

    const outcomes: Record<string, number> = {};
    const checks: Record<string, number> = {};
    const models = new Map<string, { tries: number; ok: number; failures: Record<string, number>; totalMs: number }>();
    let totalMs = 0;
    let escalated = 0;
    let jevRouted = 0;
    let up = 0;
    let down = 0;

    for (const log of logs) {
      outcomes[log.outcome] = (outcomes[log.outcome] ?? 0) + 1;
      checks[log.check] = (checks[log.check] ?? 0) + 1;
      totalMs += log.timings?.totalMs ?? 0;
      if (log.escalated) escalated += 1;
      if ((log.jev as { routed?: boolean } | undefined)?.routed) jevRouted += 1;
      if (log.feedback?.vote === 'up') up += 1;
      if (log.feedback?.vote === 'down') down += 1;
      for (const attempt of log.models ?? []) {
        const entry = models.get(attempt.model) ?? { tries: 0, ok: 0, failures: {}, totalMs: 0 };
        entry.tries += 1;
        entry.totalMs += attempt.ms ?? 0;
        if (attempt.result === 'ok') entry.ok += 1;
        else entry.failures[attempt.result] = (entry.failures[attempt.result] ?? 0) + 1;
        models.set(attempt.model, entry);
      }
    }

    const problems = logs
      .filter((log) => log.outcome === 'failed' || log.outcome === 'rescued' || log.check === 'flagged' || log.feedback?.vote === 'down')
      .slice(0, 60)
      .map((log) => ({
        id: log.id,
        at: stamp(log.at),
        question: log.question,
        answer: log.answer.slice(0, 600),
        outcome: log.outcome,
        check: log.check,
        error: log.error ?? null,
        routes: log.routes,
        feedback: log.feedback ?? null,
      }));

    return NextResponse.json({
      configuredModels: configuredModels(),
      quota,
      sample: logs.length,
      outcomes,
      checks,
      averageMs: logs.length ? Math.round(totalMs / logs.length) : 0,
      escalated,
      jevRouted,
      feedback: { up, down },
      models: Array.from(models.entries())
        .map(([model, entry]) => ({ model, tries: entry.tries, ok: entry.ok, failures: entry.failures, averageMs: Math.round(entry.totalMs / entry.tries) }))
        .sort((a, b) => b.tries - a.tries),
      problems,
      gaps: gaps.map((gap) => ({ id: gap.id, at: stamp(gap.at), question: gap.question, routes: gap.routes, answerable: gap.answerable, escalated: gap.escalated })),
    }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Could not load logs' }, { status: 500 });
  }
}
