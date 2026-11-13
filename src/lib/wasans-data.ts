// Wasans (wasans.tully.sh) trial constants, score formula and tiers, ported
// from github.com/parkourreborn/wasans (src/lib/trials.ts, calc-score.ts,
// tiers.ts). Scores here must match the site's, so these numbers are copied
// as they are there, not taken from our own Firestore medal times.

export const wasansTrials = [
  'Crystal', 'Genesis', 'Glass', 'Riser', 'Solar', 'Vestibule',
  'Celsius', 'Circulation', 'Flow', 'Martyr', 'Neon Bold', 'Sawdust',
  'Ascension', 'Faith', 'Gale', 'Grip', 'Thread', 'Needle',
  'Umbrel', 'Depot', 'Flame', 'Ironsing', 'Monoxide', 'Rust Belt', 'Wisp',
] as const;

export type WasansTrial = (typeof wasansTrials)[number];

export const wasansPlatinum: Record<WasansTrial, number> = {
  Crystal: 10.5, Genesis: 12.5, Glass: 12.5, Riser: 10.75, Solar: 18, Vestibule: 10.5,
  Celsius: 12, Circulation: 14, Flow: 16.5, Martyr: 12.5, 'Neon Bold': 25, Sawdust: 16.5,
  Ascension: 12, Faith: 15, Gale: 8.25, Grip: 17, Thread: 14, Needle: 13,
  Umbrel: 23, Depot: 19.5, Flame: 13.5, Ironsing: 17.5, Monoxide: 14.5, 'Rust Belt': 18.5, Wisp: 13,
};

export const wasansBronze: Record<WasansTrial, number> = {
  Crystal: 25, Genesis: 70, Glass: 30, Riser: 25, Solar: 40, Vestibule: 24,
  Celsius: 25, Circulation: 35, Flow: 32, Martyr: 35, 'Neon Bold': 40, Sawdust: 40,
  Ascension: 25, Faith: 30, Gale: 15, Grip: 35, Thread: 25, Needle: 30,
  Umbrel: 35, Depot: 50, Flame: 30, Ironsing: 29, Monoxide: 27, 'Rust Belt': 35, Wisp: 22,
};

export const comboCategories = ['mag', 'gearless', 'yank', 'swing'] as const;
export type ComboCategory = (typeof comboCategories)[number];

export function isWasansTrial(name: string): name is WasansTrial {
  return (wasansTrials as readonly string[]).includes(name);
}

// A trial's score for one run, the same way Wasans works it out:
// slower than bronze is 0, between bronze and platinum climbs to 0.3, and
// from platinum to the world record it climbs to 1.
export function wasansScore(trial: WasansTrial, time: number, worldRecord: number) {
  if (!(time > 0) || !(worldRecord > 0)) return null;
  const bronze = wasansBronze[trial];
  const platinum = wasansPlatinum[trial];
  if ((worldRecord / time) ** 3 > 1) return 1;
  if (time > bronze) return 0;
  if (time > platinum) return 0.3 * ((bronze - time) / (bronze - platinum));
  return 0.3 + 0.7 * (((worldRecord / time) ** 3 - (worldRecord / platinum) ** 3) / (1 - (worldRecord / platinum) ** 3));
}

// The time a run needs for a given trial score, found by bisection on the
// formula above so it always agrees with wasansScore.
export function timeForScore(trial: WasansTrial, score: number, worldRecord: number) {
  if (!(score > 0) || score > 1 || !(worldRecord > 0)) return null;
  if (score === 1) return worldRecord;
  let fast = worldRecord;
  let slow = wasansBronze[trial];
  for (let step = 0; step < 60; step += 1) {
    const mid = (fast + slow) / 2;
    if ((wasansScore(trial, mid, worldRecord) ?? 0) >= score) fast = mid;
    else slow = mid;
  }
  return fast;
}

export const wasansTiers = [
  { name: 'Unranked', min: 0 },
  { name: 'Platinum', min: 0.3 },
  { name: 'Diamond', min: 0.4 },
  { name: 'Master III', min: 0.5 },
  { name: 'Master II', min: 0.6 },
  { name: 'Master I', min: 0.7 },
  { name: 'Elite', min: 0.8 },
  { name: 'Router', min: 0.9 },
] as const;

export function tierForScore(score: number) {
  let tier: (typeof wasansTiers)[number] = wasansTiers[0];
  for (const next of wasansTiers) {
    if (score >= next.min) tier = next;
    else break;
  }
  return tier;
}

export function nextTier(score: number) {
  const next = wasansTiers.find((tier) => tier.min > score);
  return next ? { name: next.name, min: next.min, needed: Number((next.min - score).toFixed(3)) } : null;
}
