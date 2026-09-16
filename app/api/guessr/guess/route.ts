import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { scoreGuess } from '@/lib/guessr-score';
import { guessrDifficulties, guessrModes } from '@/lib/guessr';
import type { GuessrDifficulty, GuessrMode } from '@/lib/guessr';
import { getAdminDb } from '@/lib/server/firebase-admin';
import { pointSchema } from '@/lib/server/guessr';
import { checkRateLimit, clientKey } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const windows = [
  { seconds: 60, max: 90 },
  { seconds: 3600, max: 500 },
];

const requestSchema = z.object({
  gameId: z.string().uuid(),
  roundId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  guess: pointSchema,
}).strict();

const gameSchema = z.object({
  mode: z.enum(guessrModes),
  difficulty: z.enum(guessrDifficulties),
  mapVersionId: z.string().min(1),
  mapWidth: z.number().int().positive(),
  mapHeight: z.number().int().positive(),
  roundCount: z.number().int().positive(),
  rounds: z.array(z.string().min(1)),
  currentRound: z.number().int().nonnegative(),
  totalScore: z.number().int().nonnegative(),
  answers: z.array(z.object({
    roundId: z.string(),
    guess: pointSchema,
    result: z.object({
      round: z.number().int().positive(),
      roundCount: z.number().int().positive(),
      target: pointSchema,
      distance: z.number().min(0).max(1),
      score: z.number().int().min(0).max(500),
      totalScore: z.number().int().nonnegative(),
      complete: z.boolean(),
      game: z.object({
        gameId: z.string(),
        mode: z.enum(guessrModes),
        difficulty: z.enum(guessrDifficulties),
        mapVersionId: z.string(),
        roundCount: z.number().int(),
        totalScore: z.number().int(),
        duration: z.number().int(),
      }).nullable(),
    }),
    answeredAt: z.custom<Timestamp>((value) => value instanceof Timestamp),
  })),
  status: z.enum(['active', 'complete']),
  startedAt: z.custom<Timestamp>((value) => value instanceof Timestamp),
  expiresAt: z.custom<Timestamp>((value) => value instanceof Timestamp),
});

const imageSchema = z.object({
  status: z.literal('published'),
  mapVersionId: z.string().min(1),
  mode: z.enum(guessrModes),
  difficulty: z.enum(guessrDifficulties),
  coordinates: pointSchema,
});

class GuessError extends Error {
  constructor(message: string, readonly status = 409) {
    super(message);
  }
}

export async function POST(request: NextRequest) {
  const rate = await checkRateLimit(`guessr:guess:${clientKey(request.headers)}`, windows);
  if (!rate.ok) return NextResponse.json({ error: 'Slow down a bit.' }, { status: 429, headers: { 'retry-after': String(rate.retryAfter) } });

  try {
    const body = requestSchema.parse(await request.json());
    const db = getAdminDb();
    const gameRef = db.collection('guessrGames').doc(body.gameId);
    const imageRef = db.collection('guessrImages').doc(body.roundId);
    const result = await db.runTransaction(async (transaction) => {
      const gameDoc = await transaction.get(gameRef);
      if (!gameDoc.exists) throw new GuessError('This game is no longer available.', 404);

      const game = gameSchema.safeParse(gameDoc.data());
      if (!game.success) throw new GuessError('This game is no longer available.', 410);
      if (game.data.expiresAt.toMillis() <= Date.now()) throw new GuessError('This game expired. Start a new one.', 410);
      const previous = game.data.answers.at(-1);
      if (previous?.roundId === body.roundId) {
        if (previous.guess.x !== body.guess.x || previous.guess.y !== body.guess.y) throw new GuessError('That round was already answered.');
        return previous.result;
      }
      if (game.data.status !== 'active' || game.data.currentRound >= game.data.roundCount) throw new GuessError('This game is already finished.');

      const expectedRoundId = game.data.rounds[game.data.currentRound];
      if (body.roundId !== expectedRoundId) throw new GuessError('That is not the current round.');

      const imageDoc = await transaction.get(imageRef);
      const image = imageSchema.safeParse(imageDoc.data());
      if (!imageDoc.exists || !image.success) throw new GuessError('This round is no longer available.');
      if (image.data.mapVersionId !== game.data.mapVersionId || image.data.mode !== game.data.mode || image.data.difficulty !== game.data.difficulty) {
        throw new GuessError('This round does not match the current game.');
      }

      const scored = scoreGuess(body.guess, image.data.coordinates, game.data.mapWidth, game.data.mapHeight);
      const nextRound = game.data.currentRound + 1;
      const totalScore = game.data.totalScore + scored.score;
      const complete = nextRound === game.data.roundCount;
      const now = Timestamp.now();
      const duration = Math.max(0, Math.round((now.toMillis() - game.data.startedAt.toMillis()) / 1000));
      const result = {
        round: nextRound,
        roundCount: game.data.roundCount,
        target: image.data.coordinates,
        distance: scored.distance,
        score: scored.score,
        totalScore,
        complete,
        game: complete ? {
          gameId: body.gameId,
          mode: game.data.mode as GuessrMode,
          difficulty: game.data.difficulty as GuessrDifficulty,
          mapVersionId: game.data.mapVersionId,
          roundCount: game.data.roundCount,
          totalScore,
          duration,
        } : null,
      };
      const answer = { roundId: body.roundId, guess: body.guess, result, answeredAt: now };
      const update: Record<string, unknown> = {
        currentRound: nextRound,
        totalScore,
        answers: [...game.data.answers, answer],
        status: complete ? 'complete' : 'active',
        updatedAt: now,
      };
      if (complete) Object.assign(update, { completedAt: now, duration });
      transaction.update(gameRef, update);

      return result;
    });

    return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Bad guess.' }, { status: 400 });
    if (error instanceof GuessError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'Could not submit the guess.' }, { status: 500 });
  }
}
