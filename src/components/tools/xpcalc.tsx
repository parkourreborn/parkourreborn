'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  calculateProgressBetweenLevels,
  formatComboScore,
  formatXP,
  xpRemainingToTargetLevel,
  xpRequiredBetweenLevels,
  xpToRequiredComboScore,
} from '@/lib/pages/xpcalc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type FieldProps = {
  label: string;
  value: InputValue;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: InputValue) => void;
};

type InputValue = number | string;

type SavedValues = {
  level?: InputValue;
  multiplier?: InputValue;
  vip?: boolean;
  targetLevel?: InputValue;
  sessionTargetLevel?: InputValue;
  averageCombo?: InputValue;
  startLevel?: InputValue;
  endLevel?: InputValue;
};

const saveKey = 'xpcalc-values';
const levelCap = 999;

const num = (value: InputValue, fallback: number) => {
  if (value === '') return fallback;
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const calcLevel = (value: InputValue) => Math.min(levelCap, Math.max(1, Math.floor(num(value, 1))));
const calcNumber = (value: InputValue) => num(value, 0);
const calcMultiplier = (value: InputValue) => Math.max(1, num(value, 1));

const Result = ({ label, value, big = false }: { label: string; value: string; big?: boolean }) => (
  <Card className={`xp-result ${big ? 'xp-result--big' : ''}`}>
    <span>{label}</span>
    <strong>{value}</strong>
  </Card>
);

const Field = ({ label, value, min, max, step = 1, onChange }: FieldProps) => (
  <label className="xp-field">
    <span>{label}</span>
    <input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(event.target.value)} />
  </label>
);

export default function XPCalculator() {
  const [level, setLevel] = useState<InputValue>(1);
  const [percent, setPercent] = useState<InputValue>(0);
  const [multiplier, setMultiplier] = useState<InputValue>(1);
  const [vip, setVip] = useState(false);
  const [targetLevel, setTargetLevel] = useState<InputValue>(10);
  const [sessionTargetLevel, setSessionTargetLevel] = useState<InputValue>(10);
  const [averageCombo, setAverageCombo] = useState<InputValue>(360000);
  const [startLevel, setStartLevel] = useState<InputValue>(1);
  const [endLevel, setEndLevel] = useState<InputValue>(50);
  const [loaded, setLoaded] = useState(false);
  const currentCalcLevel = calcLevel(level);
  const currentCalcPercent = calcNumber(percent);
  const xpMultiplier = calcMultiplier(multiplier);
  const goalLevel = calcLevel(targetLevel);
  const sessionGoalLevel = calcLevel(sessionTargetLevel);
  const start = calcLevel(startLevel);
  const end = calcLevel(endLevel);
  const averageRun = calcNumber(averageCombo);

  const calc = useMemo(
    () => calculateProgressBetweenLevels(currentCalcLevel, currentCalcPercent, currentCalcLevel + 1, xpMultiplier, vip),
    [currentCalcLevel, currentCalcPercent, xpMultiplier, vip],
  );
  const targetXP = useMemo(
    () => xpRemainingToTargetLevel(currentCalcLevel, currentCalcPercent, goalLevel),
    [currentCalcLevel, currentCalcPercent, goalLevel],
  );
  const targetCombo = useMemo(() => xpToRequiredComboScore(targetXP, xpMultiplier, vip), [targetXP, xpMultiplier, vip]);
  const levelsRemaining = useMemo(() => Math.max(0, goalLevel - currentCalcLevel), [goalLevel, currentCalcLevel]);
  const sessionXP = useMemo(
    () => xpRemainingToTargetLevel(currentCalcLevel, currentCalcPercent, sessionGoalLevel),
    [currentCalcLevel, currentCalcPercent, sessionGoalLevel],
  );
  const sessionCombo = useMemo(() => xpToRequiredComboScore(sessionXP, xpMultiplier, vip), [sessionXP, xpMultiplier, vip]);
  const runsNeeded = useMemo(() => (averageRun > 0 ? Math.ceil(sessionCombo / averageRun) : 0), [sessionCombo, averageRun]);
  const betweenXP = useMemo(() => xpRequiredBetweenLevels(start, end), [start, end]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(saveKey);
      if (!raw) {
        setLoaded(true);
        return;
      }

      const saved = JSON.parse(raw) as SavedValues;
      if (typeof saved.level === 'number' || typeof saved.level === 'string') setLevel(saved.level);
      if (typeof saved.multiplier === 'number' || typeof saved.multiplier === 'string') setMultiplier(saved.multiplier);
      if (typeof saved.vip === 'boolean') setVip(saved.vip);
      if (typeof saved.targetLevel === 'number' || typeof saved.targetLevel === 'string') setTargetLevel(saved.targetLevel);
      if (typeof saved.sessionTargetLevel === 'number' || typeof saved.sessionTargetLevel === 'string') setSessionTargetLevel(saved.sessionTargetLevel);
      if (typeof saved.averageCombo === 'number' || typeof saved.averageCombo === 'string') setAverageCombo(saved.averageCombo);
      if (typeof saved.startLevel === 'number' || typeof saved.startLevel === 'string') setStartLevel(saved.startLevel);
      if (typeof saved.endLevel === 'number' || typeof saved.endLevel === 'string') setEndLevel(saved.endLevel);
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;

    const saved: SavedValues = {
      level,
      multiplier,
      vip,
      targetLevel,
      sessionTargetLevel,
      averageCombo,
      startLevel,
      endLevel,
    };
    localStorage.setItem(saveKey, JSON.stringify(saved));
  }, [level, multiplier, vip, targetLevel, sessionTargetLevel, averageCombo, startLevel, endLevel, loaded]);

  return (
    <div className="xp-page">
      <section className="xp-layout">
        <Card className="xp-panel">
          <div className="xp-title">
            <span>Current progress</span>
          </div>
          <div className="xp-fields">
            <Field label="Current level" value={level} min={1} onChange={setLevel} />
            <Field label="Current XP %" value={percent} min={0} max={100} step={0.1} onChange={setPercent} />
            <Field label="XP multiplier" value={multiplier} min={0} step={0.1} onChange={setMultiplier} />
          </div>
          <Button className={`xp-toggle ${vip ? 'is-on' : ''}`} type="button" aria-pressed={vip} onClick={() => setVip((current) => !current)}>
            <span />
            VIP / Executive Runner 2x
          </Button>
        </Card>

        <Card className="xp-panel">
          <div className="xp-title">
            <span>Next level</span>
          </div>
          <div className="xp-results xp-results--main">
            <Result label="Combo needed" value={formatComboScore(calc.comboScoreRequiredForNextLevel)} big />
            <Result label="XP left" value={formatXP(calc.xpRemainingForNextLevel)} big />
            <Result label="Effective XP" value={`${calc.effectiveMultiplier}x`} />
            <Result label="Full level XP" value={formatXP(calc.xpRequiredForNextLevel)} />
          </div>
        </Card>
      </section>

      <section className="xp-advanced">
        <div className="xp-title xp-title--section"><span>Advanced XP stuff</span></div>

        <Card className="xp-panel">
          <div className="xp-title"><span>Sessions Needed</span></div>
          <div className="xp-fields xp-fields--tight">
            <Field label="Target level" value={sessionTargetLevel} min={1} onChange={setSessionTargetLevel} />
            <Field label="Average combo per run" value={averageCombo} min={0} onChange={setAverageCombo} />
          </div>
          <div className="xp-results xp-results--stack">
            <Result label="Total combo needed" value={formatComboScore(sessionCombo)} />
            <Result label="Runs needed" value={formatComboScore(runsNeeded)} />
          </div>
        </Card>

        <Card className="xp-panel">
          <div className="xp-title"><span>Level Goal</span></div>
          <div className="xp-fields xp-fields--tight">
            <Field label="Target level" value={targetLevel} min={1} onChange={setTargetLevel} />
          </div>
          <div className="xp-results xp-results--stack">
            <Result label="Combo remaining" value={formatComboScore(targetCombo)} />
            <Result label="XP remaining" value={formatXP(targetXP)} />
            <Result label="Levels remaining" value={formatComboScore(levelsRemaining)} />
          </div>
        </Card>

        <Card className="xp-panel">
          <div className="xp-title"><span>Level gap</span></div>
          <div className="xp-fields xp-fields--tight">
            <Field label="Level A" value={startLevel} min={1} onChange={setStartLevel} />
            <Field label="Level B" value={endLevel} min={1} onChange={setEndLevel} />
          </div>
          <div className="xp-results xp-results--stack">
            <Result label="Combo needed" value={formatComboScore(xpToRequiredComboScore(betweenXP, xpMultiplier, vip))} />
            <Result label="XP needed" value={formatXP(betweenXP)} />
          </div>
        </Card>
      </section>
    </div>
  );
}
