import { NextResponse } from 'next/server';
import { loadTimeTrials } from '@/lib/server/reborn-ai-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json((await loadTimeTrials()).data);
  } catch {
    return NextResponse.json({ error: 'Time trials unavailable' }, { status: 500 });
  }
}
