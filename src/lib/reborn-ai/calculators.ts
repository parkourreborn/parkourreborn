// Number crunching the model is never trusted with. Every result carries its
// numbers already formatted, so the answer can copy them and the number check
// recognises them.

import { calculateProgressBetweenLevels, formatComboScore, formatXP } from '@/lib/pages/xpcalc';
import { nextTier, tierForScore, timeForScore, wasansBronze, wasansPlatinum, wasansScore } from '@/lib/wasans-data';
import type { WasansTrial } from '@/lib/wasans-data';

const seconds = (value: number) => value.toFixed(3);
const score3 = (value: number) => value.toFixed(3);
const signed = (value: number) => `${value >= 0 ? '+' : '-'}${Math.abs(value).toFixed(3)}`;

export function scoreForTime(trial: WasansTrial, time: number, worldRecord: number) {
  const score = wasansScore(trial, time, worldRecord);
  if (score === null) return null;
  return {
    trial,
    time: seconds(time),
    wasansScore: score3(score),
    worldRecord: seconds(worldRecord),
    platinumForWasans: seconds(wasansPlatinum[trial]),
    bronzeForWasans: seconds(wasansBronze[trial]),
    behindWorldRecord: signed(time - worldRecord),
    note: time <= worldRecord ? 'at or faster than the world record, so it would score 1.000 and be the new record'
      : time > wasansBronze[trial] ? 'slower than the Wasans bronze cutoff, so it scores 0'
        : time > wasansPlatinum[trial] ? 'between bronze and platinum, where scores run from 0 to 0.300'
          : 'between platinum and the world record, where scores run from 0.300 to 1.000',
  };
}

export function timeNeededForScore(trial: WasansTrial, score: number, worldRecord: number) {
  const time = timeForScore(trial, score, worldRecord);
  if (time === null) return null;
  return { trial, wasansScore: score3(score), timeNeeded: seconds(time), worldRecord: seconds(worldRecord) };
}

export function tierInfo(score: number) {
  const tier = tierForScore(score);
  const next = nextTier(score);
  return {
    score: score3(score),
    tier: tier.name,
    tierStartsAt: score3(tier.min),
    ...(next ? { nextTier: next.name, nextTierAt: score3(next.min), scoreNeeded: score3(next.needed) } : { nextTier: null }),
  };
}

type Medals = { bronze?: string | number; silver?: string | number; gold?: string | number; platinum?: string | number };

const asSeconds = (value: string | number | undefined) => {
  const number = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(number) && number > 0 ? number : null;
};

// How far a time is from each medal and the world record, or, with no time,
// how far apart the medals and the record are.
export function timeGaps(trial: string, medals: Medals, worldRecord: number | null, time?: number) {
  const marks: [string, number | null][] = [
    ['worldRecord', worldRecord],
    ['platinum', asSeconds(medals.platinum)],
    ['gold', asSeconds(medals.gold)],
    ['silver', asSeconds(medals.silver)],
    ['bronze', asSeconds(medals.bronze)],
  ];
  const known = marks.filter((mark): mark is [string, number] => mark[1] !== null);

  if (time === undefined) {
    const record = worldRecord;
    return {
      trial,
      times: Object.fromEntries(known.map(([name, value]) => [name, seconds(value)])),
      ...(record ? { recordUnder: Object.fromEntries(known.filter(([name]) => name !== 'worldRecord').map(([name, value]) => [name, seconds(value - record)])) } : {}),
    };
  }

  const beaten = known.filter(([name, value]) => name !== 'worldRecord' && time <= value).map(([name]) => name);
  return {
    trial,
    time: seconds(time),
    // Positive means the run is slower than that mark.
    versus: Object.fromEntries(known.map(([name, value]) => [name, signed(time - value)])),
    medalsReached: beaten,
    bestMedal: beaten[0] ?? null,
  };
}

export function xpProgress({ level, target, percent, multiplier, vip }: { level?: number; target?: number; percent?: number; multiplier?: number; vip?: boolean }) {
  if (!level) return null;
  const goal = target && target > level ? target : level + 1;
  const result = calculateProgressBetweenLevels(level, percent ?? 0, goal, multiplier ?? 1, Boolean(vip));
  return {
    currentLevel: result.currentLevel,
    currentPercent: result.currentPercentage,
    targetLevel: result.targetLevel,
    xpToTarget: formatXP(result.xpRequiredToTargetLevel),
    xpToNextLevel: formatXP(result.xpRemainingForNextLevel),
    xpForThisLevel: formatXP(result.xpRequiredForNextLevel),
    xpMultiplierUsed: result.effectiveMultiplier,
    vip: Boolean(vip),
    comboScoreToTarget: formatComboScore(result.comboScoreRequiredForTargetLevel),
    comboScoreToNextLevel: formatComboScore(result.comboScoreRequiredForNextLevel),
    assumed: [
      ...(percent === undefined ? ['0% into the current level'] : []),
      ...(multiplier === undefined ? ['an XP multiplier of 1'] : []),
    ],
  };
}
