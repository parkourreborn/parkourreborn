import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { chatRequestSchema, runConversation } from '@/lib/reborn-ai/conversation-manager';
import type { Gate } from '@/lib/reborn-ai/conversation-manager';
import { limits, rateLimits } from '@/lib/reborn-ai/limits';
import { freeModelQuota, hasModelConfig } from '@/lib/reborn-ai/models';
import type { Viewer } from '@/lib/reborn-ai/tools';
import type { ChatEvent } from '@/lib/reborn-ai/types';
import { checkMemoryLimit, checkRateLimit, clientKey } from '@/lib/server/rate-limit';
import type { RateWindow } from '@/lib/server/rate-limit';
import { readSession } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const sseHeaders = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-cache, no-transform',
  connection: 'keep-alive',
  'x-accel-buffering': 'no',
};

function windowsFor(viewer: Viewer, lowQuota: boolean): RateWindow[] {
  const scale = lowQuota ? 0.5 : 1;
  const max = (value: number) => Math.max(1, Math.floor(value * scale));
  if (viewer) {
    return [
      { seconds: 60, max: max(rateLimits.user.perMinute) },
      { seconds: 3600, max: max(rateLimits.user.perHour) },
      { seconds: 86400, max: max(rateLimits.user.perDay) },
    ];
  }
  return [
    { seconds: 60, max: max(rateLimits.anonymous.perMinute) },
    { seconds: 3600, max: max(rateLimits.anonymous.perHour) },
  ];
}

export async function POST(request: NextRequest) {
  if (!hasModelConfig()) return NextResponse.json({ error: 'Reborn AI is not configured' }, { status: 503 });

  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > limits.maxBodyBytes) return NextResponse.json({ error: 'Message is too big' }, { status: 413 });

  const ip = clientKey(request.headers);
  const flood = checkMemoryLimit(`reborn-ai:flood:${ip}`, [{ seconds: 60, max: rateLimits.flood }]);
  if (!flood.ok) {
    return NextResponse.json({ error: 'Slow down a bit' }, { status: 429, headers: { 'retry-after': String(flood.retryAfter) } });
  }

  const raw = await request.text().catch(() => '');
  if (raw.length > limits.maxBodyBytes) return NextResponse.json({ error: 'Message is too big' }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  // Who is asking and whether they are over their limit are worked out while
  // the question is being routed and looked up; the limit is only enforced
  // right before a model is called, which is the part that costs quota.
  const viewer: Promise<Viewer> = readSession(request)
    .then((session) => (session ? { discordId: session.discordId, name: session.name } : null))
    .catch(() => null);
  const gate: Promise<Gate> = viewer.then(async (who) => {
    const quota = await Promise.race([freeModelQuota(), new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))]);
    const lowQuota = quota?.remaining !== undefined && quota.remaining < rateLimits.lowQuotaBelow;
    const key = who ? `reborn-ai:user:${who.discordId}` : `reborn-ai:${ip}`;
    const result = await checkRateLimit(key, windowsFor(who, lowQuota));
    if (result.ok) return { ok: true } as const;
    const wait = result.retryAfter > 3600 ? 'tomorrow' : result.retryAfter > 90 ? `in ${Math.ceil(result.retryAfter / 60)} minutes` : 'in a minute';
    return { ok: false, message: `you’ve hit the reborn ai limit for now, try again ${wait}` } as const;
  }).catch(() => ({ ok: true }) as const);

  const encoder = new TextEncoder();
  const requestId = randomUUID();

  const stream = new ReadableStream({
    async start(controller) {
      let open = true;

      const send = (chunk: string) => {
        if (!open) return;

        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          open = false;
        }
      };

      const emit = (event: ChatEvent) => send(`data: ${JSON.stringify(event)}\n\n`);

      // A quiet model means zero bytes on the wire, which reads as a dead connection
      // to every proxy in between. Comment lines keep it alive and the client ignores them.
      const beat = setInterval(() => send(': ping\n\n'), limits.heartbeatMs);

      try {
        await runConversation(parsed.data, emit, { signal: request.signal, requestId, viewer, gate });
      } catch (error) {
        console.error('reborn-ai conversation crashed', { id: requestId, error: error instanceof Error ? error.message : String(error) });
        emit({ type: 'error', message: 'reborn ai broke, try again', retryable: true });
      } finally {
        clearInterval(beat);
        const wasOpen = open;
        open = false;
        if (wasOpen) controller.close();
      }
    },
  });

  return new Response(stream, { headers: sseHeaders });
}
