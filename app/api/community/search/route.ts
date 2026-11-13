import { NextResponse } from 'next/server';
import { loadCommunityResources } from '@/lib/server/reborn-ai-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json((await loadCommunityResources()).data);
  } catch {
    return NextResponse.json({ error: 'Community search unavailable' }, { status: 500 });
  }
}
