'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Expand, Shrink } from 'lucide-react';
import ParkourGuessrMap from '@/components/games/parkourguessr-map';
import { Button } from '@/components/ui/button';
import type { GuessrConfig, GuessrDifficulty, GuessrGame, GuessrMode, GuessrRoundResult, MapPoint } from '@/lib/guessr';

type Phase = 'setup' | 'countdown' | 'playing' | 'guessing' | 'result' | 'round-loading' | 'finished' | 'error';
type NextState = 'idle' | 'loading' | 'ready' | 'error';

const modeName = { classic: 'Classic', graffiti: 'Graffiti' } satisfies Record<GuessrMode, string>;
const difficultyName = { normal: 'Normal', hard: 'Hard' } satisfies Record<GuessrDifficulty, string>;

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Something went wrong.');
  return data as T;
}

const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

export default function ParkourGuessrGame({ mode, difficulty }: { mode: GuessrMode; difficulty: GuessrDifficulty }) {
  const gameRef = useRef<HTMLDivElement>(null);
  const runRef = useRef(0);
  const startedRef = useRef(0);
  const [config, setConfig] = useState<GuessrConfig | null>(null);
  const [game, setGame] = useState<GuessrGame | null>(null);
  const [phase, setPhase] = useState<Phase>('setup');
  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState<MapPoint | null>(null);
  const [result, setResult] = useState<GuessrRoundResult | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [shotReady, setShotReady] = useState(false);
  const [nextState, setNextState] = useState<NextState>('idle');
  const [preloadKey, setPreloadKey] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [browserFullscreen, setBrowserFullscreen] = useState(false);

  const startGame = useCallback(async () => {
    const run = runRef.current + 1;
    runRef.current = run;
    setPhase('setup');
    setConfig(null);
    setGame(null);
    setRound(0);
    setGuess(null);
    setResult(null);
    setTotalScore(0);
    setCountdown(3);
    setShotReady(false);
    setNextState('idle');
    setPreloadKey(0);
    setElapsed(0);
    startedRef.current = 0;
    setError('');
    setSubmitError('');
    setMapOpen(false);
    setMapFullscreen(false);

    try {
      const nextConfig = await requestJson<GuessrConfig>('/api/guessr/config', { cache: 'no-store' });
      if (runRef.current !== run) return;
      const available = nextConfig.availability.some((item) => item.mode === mode && item.difficulty === difficulty && item.available);
      if (!available) throw new Error('That mode is not available yet.');
      setConfig(nextConfig);

      const nextGame = await requestJson<GuessrGame>('/api/guessr/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode, difficulty, mapVersionId: nextConfig.map.id }),
      });
      if (runRef.current !== run) return;
      if (nextGame.mapVersionId !== nextConfig.map.id) throw new Error('The active map changed. Try again.');
      setGame(nextGame);
      startedRef.current = Date.now();
      setCountdown(3);
      setPhase('countdown');
      setMapOpen(!window.matchMedia('(max-width: 760px)').matches);
    } catch (reason) {
      if (runRef.current !== run) return;
      setError(reason instanceof Error ? reason.message : 'Could not start the game.');
      setPhase('error');
    }
  }, [difficulty, mode]);

  useEffect(() => {
    void startGame();
    return () => {
      runRef.current += 1;
    };
  }, [startGame]);

  useEffect(() => {
    setCanFullscreen(typeof document !== 'undefined' && Boolean(gameRef.current?.requestFullscreen));
    const update = () => setBrowserFullscreen(document.fullscreenElement === gameRef.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (mapFullscreen) {
        setMapFullscreen(false);
        return;
      }
      if (document.fullscreenElement) void document.exitFullscreen();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mapFullscreen]);

  useEffect(() => {
    if (!game || phase === 'finished' || phase === 'error') return;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedRef.current) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [game, phase]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown === 0) {
      if (shotReady) setPhase('playing');
      return;
    }
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, phase, shotReady]);

  useEffect(() => {
    if (phase === 'round-loading' && shotReady) setPhase('playing');
  }, [phase, shotReady]);

  useEffect(() => {
    if (phase !== 'result' || result?.complete || !game) return;
    const next = game.rounds[round + 1];
    if (!next) return;
    setNextState('loading');
    const image = new Image();
    image.onload = () => setNextState('ready');
    image.onerror = () => setNextState('error');
    image.src = next.imageUrl;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [game, phase, preloadKey, result?.complete, round]);

  const submitGuess = async () => {
    const current = game?.rounds[round];
    if (!game || !current || !guess || phase !== 'playing') return;
    setPhase('guessing');
    setSubmitError('');

    try {
      const nextResult = await requestJson<GuessrRoundResult>('/api/guessr/guess', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gameId: game.gameId, roundId: current.id, guess }),
      });
      setResult(nextResult);
      setTotalScore(nextResult.totalScore);
      setPhase('result');
      setMapOpen(true);
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : 'Could not submit the guess.');
      setPhase('playing');
    }
  };

  const continueGame = () => {
    if (!result) return;
    if (nextState === 'error') {
      setNextState('idle');
      setPreloadKey((value) => value + 1);
      return;
    }
    if (result.complete) {
      setMapOpen(false);
      setMapFullscreen(false);
      setPhase('finished');
      return;
    }
    if (nextState !== 'ready') return;
    setRound((value) => value + 1);
    setGuess(null);
    setResult(null);
    setShotReady(false);
    setNextState('idle');
    setMapFullscreen(false);
    setMapOpen(!window.matchMedia('(max-width: 760px)').matches);
    setPhase('round-loading');
  };

  const toggleBrowserFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      const request = gameRef.current?.requestFullscreen();
      if (request) void request.catch(() => setCanFullscreen(false));
    }
  };

  const currentRound = game?.rounds[round];
  const loadingText = phase === 'setup' ? 'Setting up game...' : phase === 'round-loading' || (phase === 'countdown' && countdown === 0) ? 'Loading round...' : '';

  return (
    <main ref={gameRef} className="guessr-game">
      {currentRound && (
        <img
          className={`guessr-game__shot${shotReady ? ' is-ready' : ''}`}
          src={currentRound.imageUrl}
          alt={`Parkour Guessr round ${round + 1}`}
          draggable={false}
          onLoad={() => setShotReady(true)}
          onError={() => {
            setError('Could not load this round.');
            setPhase('error');
          }}
        />
      )}
      <span className="guessr-game__shade" aria-hidden="true" />

      <div className="guessr-game__topbar">
        <Button asChild className="guessr-game__exit">
          <Link href="/games/parkourguessr">&#8592; Exit</Link>
        </Button>
        {canFullscreen && (
          <Button type="button" className="guessr-game__fullscreen" aria-label={browserFullscreen ? 'Exit browser fullscreen' : 'Enter browser fullscreen'} onClick={toggleBrowserFullscreen}>
            {browserFullscreen ? <Shrink /> : <Expand />}
            <span>{browserFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </Button>
        )}
      </div>

      {game && phase !== 'finished' && phase !== 'error' && (
        <div className="guessr-hud">
          <span><small>Round</small><strong>{round + 1}/{game.roundCount}</strong></span>
          <span><small>Round score</small><strong>{result?.score ?? '—'}</strong></span>
          <span><small>Total</small><strong>{totalScore}/2500</strong></span>
          <span><small>Time</small><strong>{formatTime(elapsed)}</strong></span>
        </div>
      )}

      {(phase === 'setup' || phase === 'round-loading' || phase === 'countdown') && (
        <div className="guessr-game__loading" role="status">
          {phase === 'countdown' && countdown > 0 ? <strong>{countdown}</strong> : <span>{loadingText}</span>}
        </div>
      )}

      {submitError && phase === 'playing' && <p className="guessr-game__error" role="alert">{submitError}</p>}

      {config && game && phase !== 'finished' && phase !== 'error' && (
        <ParkourGuessrMap
          map={config.map}
          value={guess}
          target={result?.target ?? null}
          open={mapOpen}
          fullscreen={mapFullscreen}
          disabled={phase !== 'playing'}
          busy={phase === 'guessing'}
          onChange={(point) => {
            setGuess(point);
            setSubmitError('');
          }}
          onOpenChange={setMapOpen}
          onFullscreenChange={setMapFullscreen}
          onSubmit={() => void submitGuess()}
        />
      )}

      {phase === 'result' && result && (
        <section className="guessr-result" aria-label="Round result">
          <div><span>Distance</span><strong>{(result.distance * 100).toFixed(result.distance < 0.01 ? 2 : 1)}%</strong></div>
          <div><span>Round score</span><strong>{result.score}/500</strong></div>
          <div><span>Total</span><strong>{result.totalScore}/2500</strong></div>
          {nextState === 'error' && <p>Could not preload the next round.</p>}
          <Button type="button" disabled={!result.complete && nextState !== 'ready' && nextState !== 'error'} onClick={continueGame}>
            {result.complete ? 'See Results' : nextState === 'ready' ? 'Continue' : nextState === 'error' ? 'Retry Load' : 'Loading next round...'}
          </Button>
        </section>
      )}

      {phase === 'finished' && result?.game && (
        <section className="guessr-final">
          <span>Game complete</span>
          <h1>{result.game.totalScore}/2500</h1>
          <p>{modeName[result.game.mode]} · {difficultyName[result.game.difficulty]} · {formatTime(result.game.duration)}</p>
          <div>
            <Button type="button" onClick={() => void startGame()}>Play Again</Button>
            <Button asChild variant="secondary"><Link href="/games/parkourguessr">Mode Selection</Link></Button>
          </div>
        </section>
      )}

      {phase === 'error' && (
        <section className="guessr-final">
          <span>Unavailable</span>
          <h1>Game stopped</h1>
          <p>{error || 'Parkour Guessr is unavailable right now.'}</p>
          <div>
            <Button type="button" onClick={() => void startGame()}>Try Again</Button>
            <Button asChild variant="secondary"><Link href="/games/parkourguessr">Mode Selection</Link></Button>
          </div>
        </section>
      )}
    </main>
  );
}
