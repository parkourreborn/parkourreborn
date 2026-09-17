import 'server-only';

import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '@/lib/server/firebase-admin';

const gone = 'Deleted account';
const size = 250;

async function changeRows(collection: string, field: string, value: string, change: (doc: QueryDocumentSnapshot<DocumentData>) => Record<string, unknown> | null) {
  const db = getAdminDb();
  while (true) {
    const docs = await db.collection(collection).where(field, '==', value).limit(size).get();
    if (docs.empty) return;

    const batch = db.batch();
    for (const doc of docs.docs) {
      const update = change(doc);
      if (update) batch.update(doc.ref, update);
      else batch.delete(doc.ref);
    }
    await batch.commit();
  }
}

export async function finishAccountDeletion(uid: string, discordId: string) {
  const db = getAdminDb();
  const auth = getAdminAuth();

  try {
    await auth.updateUser(uid, { disabled: true });
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'auth/user-not-found')) throw error;
  }

  await changeRows('trialStats', 'discordId', discordId, () => null);
  await db.recursiveDelete(db.collection('saves').doc(discordId));
  await changeRows('discordLogins', 'uid', uid, () => null);
  await changeRows('adminLoginSessions', 'uid', uid, () => null);
  await changeRows('rateLimits', 'uid', uid, () => null);

  const prefix = `upload-admin-${uid}-`;
  while (true) {
    const docs = await db.collection('rateLimits').orderBy(FieldPath.documentId()).startAt(prefix).endAt(`${prefix}\uf8ff`).limit(size).get();
    if (docs.empty) break;
    const batch = db.batch();
    docs.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  const content = ['movement', 'timetrials', 'links', 'files', 'announcements', 'guessrImages', 'admins'];
  for (const collection of content) {
    await changeRows(collection, 'createdBy', uid, () => ({
      createdBy: gone,
      ...(collection === 'announcements' ? { author: gone } : {}),
      ...(collection === 'guessrImages' ? { originalFileName: FieldValue.delete() } : {}),
    }));
    await changeRows(collection, 'updatedBy', uid, () => ({ updatedBy: gone }));
  }

  await changeRows('guessrImages', 'disabledBy', uid, () => ({ disabledBy: gone }));
  await changeRows('guessrImages', 'reactivatedBy', uid, () => ({ reactivatedBy: gone }));
  await changeRows('guessrAuditLogs', 'actorUid', uid, () => ({ actorUid: gone }));
  await changeRows('guessrAuditLogs', 'targetId', uid, () => ({ targetId: gone }));
  await db.recursiveDelete(db.collection('admins').doc(uid));

  try {
    await auth.deleteUser(uid);
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'auth/user-not-found')) throw error;
  }

  await db.recursiveDelete(db.collection('users').doc(uid));
}
