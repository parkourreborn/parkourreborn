import type { MapPoint } from '@/lib/guessr';

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const metersPerPixel = 1722.3 / 4756;
export const metersPerStud = 0.28;

export function mapDistance(a: MapPoint, b: MapPoint, width: number, height: number) {
  return Math.hypot((a.x - b.x) * width, (a.y - b.y) * height) * metersPerPixel;
}

export function scoreGuess(guess: MapPoint, target: MapPoint, width: number, height: number) {
  const distance = mapDistance(guess, target, width, height);
  const score = Math.floor(500 * (1 - clamp((distance - 1) / 749)) ** 2);
  return { distance, score };
}
