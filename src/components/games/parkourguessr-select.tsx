'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Crosshair, MapPin, Play, ScanEye, SprayCan, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GuessrConfig, GuessrDifficulty, GuessrMode } from '@/lib/guessr';
import { guessrDifficulties } from '@/lib/guessr';

const modeInfo = {
  classic: { name: 'Classic', icon: MapPin },
  graffiti: { name: 'Graffiti', icon: SprayCan },
};

const difficultyInfo = {
  normal: { name: 'Normal', text: 'Clear views', icon: ScanEye },
  hard: { name: 'Hard', text: 'Fewer clues', icon: Crosshair },
};

export default function ParkourGuessrSelect({ notice }: { notice: string }) {
  const router = useRouter();
  const [config, setConfig] = useState<GuessrConfig | null>(null);
  const [mode, setMode] = useState<GuessrMode>('classic');
  const [difficulty, setDifficulty] = useState<GuessrDifficulty>('normal');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    void fetch('/api/guessr/config', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Parkour Guessr is unavailable right now.');
        return data as GuessrConfig;
      })
      .then((data) => {
        if (!active) return;
        setConfig(data);
        const first = data.availability.find((item) => item.available);
        if (first && !data.availability.some((item) => item.mode === 'classic' && item.difficulty === 'normal' && item.available)) {
          setMode(first.mode);
          setDifficulty(first.difficulty);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Parkour Guessr is unavailable right now.');
      });

    return () => {
      active = false;
    };
  }, []);

  const choice = (nextMode: GuessrMode, nextDifficulty: GuessrDifficulty) => config?.availability.find((item) => item.mode === nextMode && item.difficulty === nextDifficulty);
  const modeAvailable = (nextMode: GuessrMode) => guessrDifficulties.some((nextDifficulty) => choice(nextMode, nextDifficulty)?.available);
  const selected = choice(mode, difficulty);

  const selectMode = (nextMode: GuessrMode) => {
    if (!modeAvailable(nextMode)) return;
    setMode(nextMode);
    if (!choice(nextMode, difficulty)?.available) {
      const nextDifficulty = guessrDifficulties.find((item) => choice(nextMode, item)?.available);
      if (nextDifficulty) setDifficulty(nextDifficulty);
    }
  };

  const start = () => router.push(`/games/parkourguessr/play?mode=${mode}&difficulty=${difficulty}`);

  return (
    <section className="guessr-select" aria-label="Parkour Guessr game setup">
      {(notice || error) && <p className="guessr-select__notice" role="status">{error || notice}</p>}

      <fieldset className="guessr-select__section">
        <legend>Mode</legend>
        <div className="guessr-mode-grid">
          {(Object.keys(modeInfo) as GuessrMode[]).map((item) => {
            const available = config ? modeAvailable(item) : false;
            const Icon = modeInfo[item].icon;
            return (
              <Button
                type="button"
                variant="outline"
                className={`guessr-choice${mode === item && available ? ' is-selected' : ''}`}
                key={item}
                disabled={!config || !available}
                aria-pressed={mode === item}
                onClick={() => selectMode(item)}
              >
                <Icon className="guessr-choice__icon size-6" aria-hidden="true" />
                <span>{modeInfo[item].name}</span>
                {available && mode === item && <Check className="guessr-choice__check size-4" aria-hidden="true" />}
                {!available && <small>{config || error ? 'Unavailable' : 'Loading...'}</small>}
              </Button>
            );
          })}
          <Button type="button" variant="outline" className="guessr-choice" disabled>
            <Users className="guessr-choice__icon size-6" aria-hidden="true" />
            <span>Multiplayer</span>
            <small>Coming Soon</small>
          </Button>
        </div>
      </fieldset>

      <fieldset className="guessr-select__section">
        <legend>Difficulty</legend>
        <div className="guessr-difficulty-grid">
          {guessrDifficulties.map((item) => {
            const availability = choice(mode, item);
            const Icon = difficultyInfo[item].icon;
            return (
              <Button
                type="button"
                variant="outline"
                className={`guessr-choice guessr-choice--small${difficulty === item && availability?.available ? ' is-selected' : ''}`}
                key={item}
                disabled={!availability?.available}
                aria-pressed={difficulty === item}
                onClick={() => setDifficulty(item)}
              >
                <Icon className="guessr-choice__icon size-6" aria-hidden="true" />
                <span>{difficultyInfo[item].name}</span>
                <small>{availability?.available ? difficultyInfo[item].text : config || error ? 'Unavailable' : 'Loading...'}</small>
                {availability?.available && difficulty === item && <Check className="guessr-choice__check size-4" aria-hidden="true" />}
              </Button>
            );
          })}
        </div>
      </fieldset>

      <div className="guessr-select__start">
        <span>5 rounds · 2,500 points</span>
        <Button type="button" disabled={!selected?.available} onClick={start}><Play aria-hidden="true" />Start Game</Button>
      </div>
    </section>
  );
}
