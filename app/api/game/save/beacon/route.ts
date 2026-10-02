import { NextRequest, NextResponse } from 'next/server';
import { maxBytes, parseSave, tooBig, writeSave } from '@/lib/server/game-save';
import { readSession } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const done = () => new NextResponse(null, { status: 204 });
const baseRev = (value: string | null) => {
  const rev = Number(value);
  return value !== null && value.trim() !== '' && Number.isSafeInteger(rev) && rev >= 0 ? rev : null;
};

export async function POST(request: NextRequest) {
  const session = await readSession(request);
  if (!session) return NextResponse.json({ error: 'Signed out' }, { status: 401 });
  const rev = baseRev(request.nextUrl.searchParams.get('rev'));
  if (rev === null) return NextResponse.json({ reason: 'bad-revision' }, { status: 422 });
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) return new NextResponse(null, { status: 413 });

  const body = await request.text();
  if (tooBig(body)) return new NextResponse(null, { status: 413 });

  const checked = parseSave(body);
  if (!checked.ok) return NextResponse.json({ reason: checked.reason }, { status: 422 });

  try {
    const result = await writeSave({
      discordId: session.discordId,
      name: session.name,
      save: checked.save,
      baseRev: rev,
    });
    if (!result.ok) return NextResponse.json({ rev: result.rev }, { status: 409 });
  } catch {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }

  return done();
}
