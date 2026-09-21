import { NextResponse } from 'next/server';
import { loadWorldRecords } from '@/lib/server/reborn-ai-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json((await loadWorldRecords()).data.raw);
  } catch {
    return NextResponse.json({ results: [] }, { status: 502 });
  }
}
