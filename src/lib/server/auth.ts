import 'server-only';

import type { DecodedIdToken } from 'firebase-admin/auth';
import { getAdminAuth, getAdminDb } from '@/lib/server/firebase-admin';

export type AccountData = {
  discord?: { id?: string; username?: string; globalName?: string | null };
  displayName?: string;
  nameChangedAt?: number;
  status?: string;
};

export async function accountFor(token: DecodedIdToken) {
  const discordId = token.discordId;
  if (token.provider !== 'discord' || typeof discordId !== 'string' || token.uid !== `discord-${discordId}`) throw new Error('Invalid account');

  const ref = getAdminDb().collection('users').doc(token.uid);
  const snapshot = await ref.get();
  const data = snapshot.data() as AccountData | undefined;
  if (!data || data.discord?.id !== discordId) throw new Error('Account unavailable');

  return { ref, data, discordId };
}

export async function verifyBearer(header: string | null) {
  const [type, token] = header?.split(' ') ?? [];
  if (type !== 'Bearer' || !token) throw new Error('Missing auth token');
  const decoded = await getAdminAuth().verifyIdToken(token, true);
  const account = await accountFor(decoded);
  if (account.data.status === 'deactivated' || account.data.status === 'deleting') throw new Error('Account unavailable');
  return { token: decoded, ...account };
}
