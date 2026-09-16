import type { MapPoint } from '@/lib/guessr';

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function scoreGuess(guess: MapPoint, target: MapPoint, width: number, height: number) {
  const diagonal = Math.hypot(width, height);
  const distance = diagonal ? clamp(Math.hypot((guess.x - target.x) * width, (guess.y - target.y) * height) / diagonal) : 1;
  const score = Math.round(500 * (1 - distance) ** 2);
  return { distance, score };
}
