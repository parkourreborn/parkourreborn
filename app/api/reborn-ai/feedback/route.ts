import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logGap, readLog, saveFeedback } from '@/lib/reborn-ai/ai-log';
import { hasJev, triageAnswer } from '@/lib/reborn-ai/judge';
import { checkMemoryLimit, clientKey } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const feedbackSchema = z.object({
  id: z.string().uuid(),
  vote: z.enum(['up', 'down']),
  note: z.string().trim().max(500).optional(),
});

// Thumbs up or down on one answer, filed on that answer's log. A thumbs down
// also asks Jev what most likely went wrong, and missing knowledge goes on
// the list of guide pages to write.
export async function POST(request: NextRequest) {
  const limited = checkMemoryLimit(`reborn-ai:feedback:${clientKey(request.headers)}`, [{ seconds: 60, max: 20 }]);
  if (!limited.ok) return NextResponse.json({ error: 'Slow down a bit' }, { status: 429 });

  const parsed = feedbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const { id, vote, note = '' } = parsed.data;

  try {
    const log = await readLog(id);
    if (!log) return NextResponse.json({ error: 'Unknown answer' }, { status: 404 });

    // Re-sending the same vote is a no-op, and each answer is triaged by the
    // model at most once, so repeated thumbs-downs cannot run up model calls.
    const previous = log.feedback;
    if (previous?.vote === vote && (previous.note ?? '') === note) return NextResponse.json({ ok: true });
    const triaged = previous?.triage !== undefined && previous.triage !== null;
    const triage = vote === 'down' && hasJev() && !triaged ? await triageAnswer(log.question, log.answer, log.facts ?? '', note) : previous?.triage ?? null;
    await saveFeedback(id, { vote, note, triage });
    if (!triaged && triage === 'missing_knowledge') logGap(`${id}-feedback`, { question: log.question, routes: log.routes ?? [], answerable: null, escalated: log.escalated ?? false });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not save feedback' }, { status: 500 });
  }
}
