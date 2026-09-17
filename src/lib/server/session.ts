import 'server-only';

import type { DecodedIdToken } from 'firebase-admin/auth';
import type { NextRequest } from 'next/server';
import { accountFor } from '@/lib/server/auth';
import { getAdminAuth } from '@/lib/server/firebase-admin';

export type Session = {
  uid: string;
  discordId: string;
  name: string;
};

export const sessionCookie = 'discord_session';
export const sessionMaxAge = 14 * 24 * 60 * 60;

async function toSession(token: DecodedIdToken): Promise<Session | null> {
  const { data, discordId } = await accountFor(token);
  if (data.status === 'deactivated' || data.status === 'deleting') return null;
  return { uid: token.uid, discordId, name: data.displayName || data.discord?.globalName || data.discord?.username || '' };
}

async function fromCookie(cookie: string) {
  try {
    return await toSession(await getAdminAuth().verifySessionCookie(cookie, true));
  } catch {
    return null;
  }
}

async function fromHeader(header: string | null) {
  const [type, token] = header?.split(' ') ?? [];
  if (type !== 'Bearer' || !token) return null;

  try {
    return await toSession(await getAdminAuth().verifyIdToken(token, true));
  } catch {
    return null;
  }
}

export async function readSession(request: NextRequest) {
  const cookie = request.cookies.get(sessionCookie)?.value;
  const session = cookie ? await fromCookie(cookie) : null;
  return session ?? fromHeader(request.headers.get('authorization'));
}
