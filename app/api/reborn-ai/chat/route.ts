import { NextRequest, NextResponse } from 'next/server';
import { chatRequestSchema, runConversation } from '@/lib/reborn-ai/conversation-manager';
import { limits, rateLimits } from '@/lib/reborn-ai/limits';
import { hasModelConfig } from '@/lib/reborn-ai/openrouter';
import type { ChatEvent } from '@/lib/reborn-ai/types';
import { checkRateLimit, clientKey } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const windows = [
  { seconds: 60, max: rateLimits.perMinute },
  { seconds: 3600, max: rateLimits.perHour },
];

const sseHeaders = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-cache, no-transform',
  connection: 'keep-alive',
  'x-accel-buffering': 'no',
};

export async function POST(request: NextRequest) {
  if (!hasModelConfig()) return NextResponse.json({ error: 'Reborn AI is not configured' }, { status: 503 });

  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > limits.maxBodyBytes) return NextResponse.json({ error: 'Message is too big' }, { status: 413 });

  const rate = await checkRateLimit(`reborn-ai:${clientKey(request.headers)}`, windows);
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'Slow down a bit' },
      { status: 429, headers: { 'retry-after': String(rate.retryAfter) } },
    );
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

  const origin = request.nextUrl.origin;
  const encoder = new TextEncoder();

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
        await runConversation(parsed.data, origin, emit, request.signal);
      } catch {
        emit({ type: 'error', message: 'reborn ai broke, try again' });
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
