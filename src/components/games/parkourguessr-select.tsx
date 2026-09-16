'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { GuessrConfig, GuessrDifficulty, GuessrMode } from '@/lib/guessr';
import { guessrDifficulties } from '@/lib/guessr';

const modeInfo = {
  classic: { name: 'Classic', text: 'Find the location shown in each scene.' },
  graffiti: { name: 'Graffiti', text: 'Track down graffiti from around the city.' },
} satisfies Record<GuessrMode, { name: string; text: string }>;

const difficultyInfo = {
  normal: { name: 'Normal', text: 'Clearer views and easier landmarks.' },
  hard: { name: 'Hard', text: 'Tighter shots and fewer obvious clues.' },
} satisfies Record<GuessrDifficulty, { name: string; text: string }>;

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
      <div className="guessr-select__intro">
        <span>Five rounds · 2,500 points</span>
        <p>Study each screenshot, place your marker on the city map, and see how close you got.</p>
      </div>

      {(notice || error) && <p className="guessr-select__notice" role="status">{error || notice}</p>}

      <div className="guessr-select__section">
        <h2>Mode</h2>
        <div className="guessr-mode-grid">
          {(Object.keys(modeInfo) as GuessrMode[]).map((item) => {
            const available = config ? modeAvailable(item) : false;
            return (
              <button
                type="button"
                className={`guessr-choice${mode === item ? ' is-selected' : ''}`}
                key={item}
                disabled={!config || !available}
                aria-pressed={mode === item}
                onClick={() => selectMode(item)}
              >
                <span>{modeInfo[item].name}</span>
                <p>{modeInfo[item].text}</p>
                <small>{config ? (available ? 'Available' : 'Not enough published images') : 'Checking availability'}</small>
              </button>
            );
          })}
          <button type="button" className="guessr-choice" disabled>
            <span>Multiplayer</span>
            <p>Play against friends in the same set of rounds.</p>
            <small>Coming Soon</small>
          </button>
        </div>
      </div>

      <div className="guessr-select__section">
        <h2>Difficulty</h2>
        <div className="guessr-difficulty-grid">
          {guessrDifficulties.map((item) => {
            const availability = choice(mode, item);
            return (
              <button
                type="button"
                className={`guessr-choice guessr-choice--small${difficulty === item ? ' is-selected' : ''}`}
                key={item}
                disabled={!availability?.available}
                aria-pressed={difficulty === item}
                onClick={() => setDifficulty(item)}
              >
                <span>{difficultyInfo[item].name}</span>
                <p>{difficultyInfo[item].text}</p>
                <small>{availability ? `${availability.count} published` : 'Checking availability'}</small>
              </button>
            );
          })}
        </div>
      </div>

      <div className="guessr-select__start">
        <span>{selected?.available ? `${modeInfo[mode].name} · ${difficultyInfo[difficulty].name}` : 'This setup is unavailable'}</span>
        <Button type="button" disabled={!selected?.available} onClick={start}>Start Game</Button>
      </div>
    </section>
  );
}
