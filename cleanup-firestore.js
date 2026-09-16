const admin = require('firebase-admin');

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
  await cleanup('rateLimits', 'updatedAt', now.toMillis() - 60 * 60 * 1000);
  await cleanup('guessrGames', 'expiresAt', now);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
