import { randomInt, randomUUID } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, clientKey } from '@/lib/server/rate-limit';
import { getAdminDb } from '@/lib/server/firebase-admin';
import { getActiveGuessrMap, getPublishedGuessrImages, GuessrMapError, roundCount, selectionSchema } from '@/lib/server/guessr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const windows = [
  { seconds: 60, max: 12 },
  { seconds: 3600, max: 60 },
];

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
};

export async function POST(request: NextRequest) {
  const rate = await checkRateLimit(`guessr:start:${clientKey(request.headers)}`, windows);
  if (!rate.ok) return NextResponse.json({ error: 'Slow down a bit.' }, { status: 429, headers: { 'retry-after': String(rate.retryAfter) } });

  try {
    const body = selectionSchema.parse(await request.json());
    const map = await getActiveGuessrMap();
    if (body.mapVersionId !== map.id) return NextResponse.json({ error: 'The active map changed. Try again.' }, { status: 409 });

    const images = await getPublishedGuessrImages(map.id, body.mode, body.difficulty);
    if (images.length < roundCount) return NextResponse.json({ error: 'That mode is not available yet.' }, { status: 409 });

    const rounds = shuffle(images).slice(0, roundCount).map(({ id, imageUrl }) => ({ id, imageUrl }));
    const gameId = randomUUID();
    const startedAt = Timestamp.now();
    await getAdminDb().collection('guessrGames').doc(gameId).create({
      mode: body.mode,
      difficulty: body.difficulty,
      mapVersionId: map.id,
      mapWidth: map.width,
      mapHeight: map.height,
      roundCount,
      rounds: rounds.map((round) => round.id),
      currentRound: 0,
      totalScore: 0,
      answers: [],
      status: 'active',
      startedAt,
      updatedAt: startedAt,
      expiresAt: Timestamp.fromMillis(startedAt.toMillis() + 6 * 60 * 60 * 1000),
    });

    return NextResponse.json({
      gameId,
      mode: body.mode,
      difficulty: body.difficulty,
      mapVersionId: map.id,
      roundCount,
      rounds,
    }, { status: 201, headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Bad game settings.' }, { status: 400 });
    const message = error instanceof GuessrMapError ? error.message : 'Could not start the game.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
