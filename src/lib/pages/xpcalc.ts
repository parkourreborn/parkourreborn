export type LevelProgress = {
  level: number;
  percentage: number;
  xpIntoCurrentLevel: number;
  xpForCurrentLevel: number;
};

export type ProgressCalc = {
  currentLevel: number;
  currentPercentage: number;
  targetLevel: number;
  totalXPAtCurrentProgress: number;
  xpIntoCurrentLevel: number;
  xpRequiredForNextLevel: number;
  xpRemainingForNextLevel: number;
  xpRequiredToTargetLevel: number;
  effectiveMultiplier: number;
  comboScoreRequiredForNextLevel: number;
  comboScoreRequiredForTargetLevel: number;
  targetStartXP: number;
  targetProgress: LevelProgress;
};

const comboPerXP = 360000;

const cleanLevel = (level: number) => {
  if (!Number.isFinite(level)) return 1;
  return Math.max(1, Math.floor(level));
};

const cleanPercent = (percentage: number) => {
  if (!Number.isFinite(percentage)) return 0;
  return Math.min(100, Math.max(0, percentage));
};

const cleanXP = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
};

const cleanMultiplier = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
};

const round = (value: number, digits: number) => Number(value.toFixed(digits));

export function totalXPForLevel(level: number): number {
  const clean = cleanLevel(level);
  return (clean * 0.8) + Math.pow(Math.pow(clean, 0.975) / 20, 5);
}

export function xpRequiredForLevel(level: number): number {
  const clean = cleanLevel(level);
  return totalXPForLevel(clean + 1) - totalXPForLevel(clean);
}

export function xpRequiredBetweenLevels(startLevel: number, targetLevel: number): number {
  const start = cleanLevel(startLevel);
  const target = Math.max(start, cleanLevel(targetLevel));
  return totalXPForLevel(target) - totalXPForLevel(start);
}

export function xpIntoLevelFromPercentage(level: number, percentage: number): number {
  return (cleanPercent(percentage) / 100) * xpRequiredForLevel(level);
}

export function xpRemainingInLevel(level: number, percentage: number): number {
  return Math.max(0, xpRequiredForLevel(level) - xpIntoLevelFromPercentage(level, percentage));
}

export function totalXPFromLevelAndPercentage(level: number, percentage: number): number {
  const clean = cleanLevel(level);
  return totalXPForLevel(clean) + xpIntoLevelFromPercentage(clean, percentage);
}

export function levelAndPercentageFromTotalXP(totalXP: number): LevelProgress {
  const xp = cleanXP(totalXP);
  let low = 1;
  let high = 2;

  while (totalXPForLevel(high) <= xp && high < 1000000000) high *= 2;

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (totalXPForLevel(mid) <= xp) low = mid;
    else high = mid - 1;
  }

  const level = low;
  const xpIntoCurrentLevel = Math.max(0, xp - totalXPForLevel(level));
  const xpForCurrentLevel = xpRequiredForLevel(level);
  const percentage = xpForCurrentLevel === 0 ? 100 : (xpIntoCurrentLevel / xpForCurrentLevel) * 100;

  return { level, percentage, xpIntoCurrentLevel, xpForCurrentLevel };
}

export function xpRemainingToTargetLevel(currentLevel: number, currentPercentage: number, targetLevel: number): number {
  const current = cleanLevel(currentLevel);
  const target = Math.max(current, cleanLevel(targetLevel));
  return Math.max(0, totalXPForLevel(target) - totalXPFromLevelAndPercentage(current, currentPercentage));
}

export function getEffectiveMultiplier(playerXpMultiplier: number, isVIP: boolean): number {
  return cleanMultiplier(playerXpMultiplier) * (isVIP ? 2 : 1);
}

export function xpToRequiredComboScore(xpNeeded: number, playerXpMultiplier: number, isVIP: boolean): number {
  const multiplier = getEffectiveMultiplier(playerXpMultiplier, isVIP);
  if (multiplier <= 0) return 0;
  return Math.ceil((cleanXP(xpNeeded) * comboPerXP) / multiplier);
}

export function calculateProgressBetweenLevels(currentLevel: number, currentPercentage: number, targetLevel: number, playerXpMultiplier: number, isVIP: boolean): ProgressCalc {
  const current = cleanLevel(currentLevel);
  const percentage = cleanPercent(currentPercentage);
  const target = Math.max(current, cleanLevel(targetLevel));
  const totalXPAtCurrentProgress = totalXPFromLevelAndPercentage(current, percentage);
  const xpIntoCurrentLevel = xpIntoLevelFromPercentage(current, percentage);
  const xpRequiredForNextLevelValue = xpRequiredForLevel(current);
  const xpRemainingForNextLevel = xpRemainingInLevel(current, percentage);
  const xpRequiredToTargetLevel = xpRemainingToTargetLevel(current, percentage, target);
  const effectiveMultiplier = getEffectiveMultiplier(playerXpMultiplier, isVIP);

  return {
    currentLevel: current,
    currentPercentage: percentage,
    targetLevel: target,
    totalXPAtCurrentProgress,
    xpIntoCurrentLevel,
    xpRequiredForNextLevel: xpRequiredForNextLevelValue,
    xpRemainingForNextLevel,
    xpRequiredToTargetLevel,
    effectiveMultiplier,
    comboScoreRequiredForNextLevel: xpToRequiredComboScore(xpRemainingForNextLevel, playerXpMultiplier, isVIP),
    comboScoreRequiredForTargetLevel: xpToRequiredComboScore(xpRequiredToTargetLevel, playerXpMultiplier, isVIP),
    targetStartXP: totalXPForLevel(target),
    targetProgress: levelAndPercentageFromTotalXP(totalXPAtCurrentProgress),
  };
}

export function formatXP(value: number): string {
  return round(cleanXP(value), 2).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function formatComboScore(value: number): string {
  return Math.ceil(cleanXP(value)).toLocaleString('en-US');
}
