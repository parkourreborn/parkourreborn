import { NextResponse } from 'next/server';
import { getActiveGuessrMap, getGuessrAvailability, GuessrMapError } from '@/lib/server/guessr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const map = await getActiveGuessrMap();
    const availability = await getGuessrAvailability(map.id);

    return NextResponse.json({ map, availability }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const message = error instanceof GuessrMapError ? error.message : 'Parkour Guessr is unavailable right now.';
    return NextResponse.json({ error: message }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}
