import { NextResponse } from 'next/server';
import { guessrDifficulties, guessrModes } from '@/lib/guessr';
import { getActiveGuessrMap, getPublishedGuessrImages, GuessrMapError, roundCount } from '@/lib/server/guessr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const map = await getActiveGuessrMap();
    const choices = guessrModes.flatMap((mode) => guessrDifficulties.map((difficulty) => ({ mode, difficulty })));
    const counts = await Promise.all(choices.map(({ mode, difficulty }) => getPublishedGuessrImages(map.id, mode, difficulty)));
    const availability = choices.map(({ mode, difficulty }, index) => ({
      mode,
      difficulty,
      count: counts[index].length,
      available: counts[index].length >= roundCount,
    }));

    return NextResponse.json({ map, availability }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const message = error instanceof GuessrMapError ? error.message : 'Parkour Guessr is unavailable right now.';
    return NextResponse.json({ error: message }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}
