import { NextResponse } from 'next/server';
import { loadTechs } from '@/lib/server/reborn-ai-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json((await loadTechs()).data);
  } catch {
    return NextResponse.json({ error: 'Tech list unavailable' }, { status: 500 });
  }
}
