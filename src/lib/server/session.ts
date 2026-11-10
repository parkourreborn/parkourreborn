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
// Refreshed on every visit while signed in, so this is the idle limit. Firebase
// session cookies cannot be revoked one by one, so a stolen cookie stays valid
// until it expires; keeping the window short limits that.
export const sessionMaxAge = 7 * 24 * 60 * 60;

// Browsers send Origin on every POST/PUT/DELETE. A mismatch means another site
// (including a sibling subdomain, which SameSite=Lax treats as same-site) sent
// the request with this user's cookies. Requests without Origin come from
// non-browser clients, which do not carry the user's cookies.
export function crossSite(request: NextRequest) {
  const origin = request.headers.get('origin');
  return Boolean(origin) && origin !== request.nextUrl.origin;
}

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
  const header = request.headers.get('authorization');
  if (header) return fromHeader(header);
  const cookie = request.cookies.get(sessionCookie)?.value;
  return cookie ? fromCookie(cookie) : null;
}
