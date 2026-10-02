import admin from 'firebase-admin';

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
});

const db = admin.firestore();
const now = admin.firestore.Timestamp.now();

async function cleanup(collectionName, field, cutoff) {
  let deleted = 0;

  while (true) {
    const expired = await db.collection(collectionName)
      .where(field, '<', cutoff)
      .limit(500)
      .get();

    if (expired.empty) break;

    const batch = db.batch();
    expired.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += expired.size;
  }

  console.log(`${collectionName}: deleted ${deleted} expired documents`);
}

async function main() {
  await cleanup('rateLimits', 'expiresAt', now);
  await cleanup('guessrGames', 'expiresAt', now);
  await cleanup('discordAuthStates', 'expiresAt', now.toMillis());
  await cleanup('discordLogins', 'expiresAt', now.toMillis());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
