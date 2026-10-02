import { NextRequest, NextResponse } from 'next/server';
import { checkSave, maxBytes, readSave, tooBig, writeSave } from '@/lib/server/game-save';
import { readSession } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const signedOut = () => NextResponse.json({ error: 'Signed out' }, { status: 401 });
const oversize = () => NextResponse.json({ error: 'Save too large' }, { status: 413 });
const invalid = (reason: string) => NextResponse.json({ reason }, { status: 422 });

const declared = (request: NextRequest) => Number(request.headers.get('content-length') ?? 0);
const baseRev = (value: unknown) => (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null);

export async function GET(request: NextRequest) {
  const session = await readSession(request);
  if (!session) return signedOut();

  try {
    const { save, rev } = await readSave(session.discordId);
    return NextResponse.json({ save, rev });
  } catch {
    return NextResponse.json({ error: 'Save unavailable' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await readSession(request);
  if (!session) return signedOut();
  if (declared(request) > maxBytes) return oversize();

  const body = await request.text();
  if (tooBig(body)) return oversize();

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return invalid('bad-json');
  }

  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return invalid('bad-body');

  const { save, baseRev: base } = payload as { save?: unknown; baseRev?: unknown };
  const rev = baseRev(base);
  if (rev === null) return invalid('bad-revision');
  const checked = checkSave(save);
  if (!checked.ok) return invalid(checked.reason);

  try {
    const result = await writeSave({
      discordId: session.discordId,
      name: session.name,
      save: checked.save,
      baseRev: rev,
    });

    if (!result.ok) return NextResponse.json({ rev: result.rev, save: result.save }, { status: 409 });
    return NextResponse.json({ rev: result.rev });
  } catch {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}
