import 'server-only';

import { z } from 'zod';
import { getAdminDb } from '@/lib/server/firebase-admin';
import { guessrDifficulties, guessrModes } from '@/lib/guessr';
import type { GuessrDifficulty, GuessrMap, GuessrMode, MapPoint } from '@/lib/guessr';

export const roundCount = 5;

export class GuessrMapError extends Error {}

const mapSchema = z.object({
  imageUrl: z.string().url(),
  width: z.coerce.number().int().positive(),
  height: z.coerce.number().int().positive(),
  active: z.literal(true),
});

export const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const selectionSchema = z.object({
  mode: z.enum(guessrModes),
  difficulty: z.enum(guessrDifficulties),
  mapVersionId: z.string().trim().min(1),
}).strict();

const imageSchema = z.object({
  imageUrl: z.string().url(),
  mode: z.enum(guessrModes),
  difficulty: z.enum(guessrDifficulties),
  status: z.literal('published'),
  coordinates: pointSchema,
  mapVersionId: z.string().trim().min(1),
});

export type PublishedGuessrImage = {
  id: string;
  imageUrl: string;
  mode: GuessrMode;
  difficulty: GuessrDifficulty;
  coordinates: MapPoint;
  mapVersionId: string;
};

export async function getActiveGuessrMap(): Promise<GuessrMap> {
  const maps = await getAdminDb().collection('guessrMaps').where('active', '==', true).limit(2).get();
  if (maps.empty) throw new GuessrMapError('Parkour Guessr is unavailable right now.');
  if (maps.size > 1) throw new GuessrMapError('Parkour Guessr is unavailable while the map is being updated.');

  const map = mapSchema.safeParse(maps.docs[0].data());
  if (!map.success) throw new GuessrMapError('Parkour Guessr is unavailable right now.');
  return { id: maps.docs[0].id, url: map.data.imageUrl, width: map.data.width, height: map.data.height };
}

export async function getPublishedGuessrImages(mapVersionId: string, mode: GuessrMode, difficulty: GuessrDifficulty) {
  const snapshot = await getAdminDb()
    .collection('guessrImages')
    .where('status', '==', 'published')
    .where('mapVersionId', '==', mapVersionId)
    .where('mode', '==', mode)
    .where('difficulty', '==', difficulty)
    .get();

  return snapshot.docs.flatMap((doc) => {
    const image = imageSchema.safeParse(doc.data());
    return image.success ? [{ id: doc.id, ...image.data }] : [];
  });
}
