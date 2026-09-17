import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/server/firebase-admin';
import { verifyBearer } from '@/lib/server/auth';
import { sessionCookie, sessionMaxAge } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await verifyBearer(request.headers.get('authorization'));
    const token = request.headers.get('authorization')!.slice(7);

    const cookie = await getAdminAuth().createSessionCookie(token, { expiresIn: sessionMaxAge * 1000 });
    const response = NextResponse.json({ ok: true });

    response.cookies.set(sessionCookie, cookie, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionMaxAge,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(sessionCookie);
  return response;
}
