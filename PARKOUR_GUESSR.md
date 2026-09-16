# Parkour Guessr setup

The public Hub uses the same Firebase project as `parkourreborn-admin`. Set `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, and `FIREBASE_ADMIN_PRIVATE_KEY` in the public site's server environment. Use the same project ID and service account permissions as the admin deployment. The private key must remain server-only and can contain escaped `\n` characters. The existing `getAdminDb()` helper is used for every Guessr read and write; no browser Firestore access is needed.

In Firestore, keep exactly one `guessrMaps` document with `active: true`. Its document ID is the map version; its `url`, `width`, and `height` must describe the same image and coordinate space used by the admin editor. The public game never falls back to a bundled map. Publish at least five valid `guessrImages` records for each mode/difficulty combination you want playable, with `status: "published"`, the active `mapVersionId`, an R2 `imageUrl`, and normalized `coordinates`.

Create a Firestore collection-scope composite index on `guessrImages` with ascending `status`, `mapVersionId`, `mode`, and `difficulty`. The config and start APIs query all four fields. Keep the deployed Firestore rules deny-all for browser access; the public server uses the Admin SDK.

Games are saved in the new `guessrGames` collection for server-side round order, one-time scoring, and retry-safe submissions. Enable Firestore TTL on its `expiresAt` field to clean up expired games. This is not leaderboard storage. No new map or image collection is created.

The browser loads the map directly from the active document's URL and screenshots directly from their R2 public URLs. Make those URLs publicly readable over HTTPS. No public-site R2 API credentials, image proxy, or Next.js image-host allowlist are required. Set any CDN cache policy for the immutable `guessr/images/{uuid}.webp` objects at the R2 custom domain.

After deploying the public site, check `/api/guessr/config` for the expected map version and counts, then play each available mode. Draft, disabled, wrong-map, or malformed images must never count or start a round. If the map is missing or multiple maps are active, the config/start routes return unavailable. The site needs the Firebase Admin environment variables in both local development and production before these checks can run.
