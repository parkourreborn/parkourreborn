'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ScreenReaderLoading, Skeleton } from '@/components/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DialogClose, DialogTitle } from '@/components/ui/dialog';
import { HubDialog, HubDialogContent } from '@/components/ui/hub-dialog';
import { images } from '@/lib/assets';
import { fetchTimeTrials, fetchWorldRecords, trialKey, wrVideoURL } from '@/lib/pages/timetrials';
import type { TimeTrial, WorldRecord } from '@/lib/pages/timetrials';
import { cleanTimeInput, formatTime, parseTime } from '@/lib/pages/time';
import { calculateWasansScore, formatWasansScore } from '@/lib/pages/wasans';

type VideoMode = 'plat1' | 'plat2' | 'wr';
type Pbs = Record<string, string>;

const saveKey = 'timetrialhub-pbs';
const medals = [
  [images.elements.timetrials.bronze, 'Bronze', 'bronzeTime'],
  [images.elements.timetrials.silver, 'Silver', 'silverTime'],
  [images.elements.timetrials.gold, 'Gold', 'goldTime'],
  [images.elements.timetrials.platinum, 'Plat', 'platinumTime'],
] as const;

function rowScore(trial: TimeTrial, wr: WorldRecord | undefined, value: string) {
  const playerTime = parseTime(value);
  const bronzeTime = parseTime(trial.bronzeTime);
  const platinumTime = parseTime(trial.platinumTime);
  if (playerTime === null || playerTime === 0 || bronzeTime === null || platinumTime === null || !wr) return 0;
  if (playerTime >= bronzeTime) return 0;
  return calculateWasansScore({ playerTime, bronzeTime, platinumTime, worldRecordTime: wr.time }) ?? 0;
}

function invalidTime(trial: TimeTrial, value: string) {
  if (!value) return false;
  const playerTime = parseTime(value);
  const bronzeTime = parseTime(trial.bronzeTime);
  if (playerTime === null) return true;
  if (playerTime === 0 || bronzeTime === null) return false;
  return playerTime > bronzeTime;
}

const isTimeCell = (target: EventTarget | null) => target instanceof HTMLElement && Boolean(target.closest('.tt-time'));

const rowSkeletons = Array.from({ length: 24 });

function EmbedVideo({ url }: { url: string }) {
  if (!url) return <div className="tt-empty">No video yet</div>;

  return (
    <iframe
      src={url}
      title="Platinum route"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}

function RecordVideo({ url }: { url: string }) {
  if (!url) return <div className="tt-empty">No WR video yet</div>;
  return <video src={url} controls playsInline />;
}

function TrialModal({ trial, wr, onClose }: { trial: TimeTrial; wr?: WorldRecord; onClose: () => void }) {
  const [mode, setMode] = useState<VideoMode>('plat1');
  const wrURL = wrVideoURL(wr?.submissionUuid ?? '');

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <HubDialog onOpenChange={(next) => {
      if (!next) onClose();
    }}>
      <HubDialogContent className="tt-dialog tt-trial-dialog" aria-label={`${trial.name} route videos`}>
        <header className="tt-dialog__head">
          <DialogTitle asChild>
            <h2>{trial.name}</h2>
          </DialogTitle>
          <DialogClose asChild>
            <Button className="tt-close" type="button" aria-label="Close">
              <span className="tt-close__icon" />
            </Button>
          </DialogClose>
        </header>

        <div className="tt-dialog__body">
          <div className="tt-meta">
            <span>{trial.district}</span>
            <span>{trial.difficulty}</span>
          </div>

          <div className="tt-tabs" role="tablist" aria-label="Route video">
            <Button className={mode === 'plat1' ? 'is-on' : ''} type="button" role="tab" aria-selected={mode === 'plat1'} onClick={() => setMode('plat1')}>
              Plat 1
            </Button>
            <Button className={mode === 'plat2' ? 'is-on' : ''} type="button" role="tab" aria-selected={mode === 'plat2'} onClick={() => setMode('plat2')}>
              Plat 2
            </Button>
            <Button className={mode === 'wr' ? 'is-on' : ''} type="button" role="tab" aria-selected={mode === 'wr'} onClick={() => setMode('wr')}>
              WR
            </Button>
          </div>

          {mode === 'plat1' ? (
            <div className="tt-video"><EmbedVideo url={trial.videoURL} /></div>
          ) : null}
          {mode === 'plat2' ? (
            <div className="tt-video"><EmbedVideo url={trial.videoURL2} /></div>
          ) : null}
          {mode === 'wr' ? (
            <div className="tt-video"><RecordVideo url={wrURL} /></div>
          ) : null}

          <footer className="tt-medals">
            {medals.map(([icon, label, key]) => (
              <Card className="tt-medal" key={label}>
                <span className="tt-medal__icon" style={{ backgroundImage: `url(${icon})` }} />
                <strong>{formatTime(trial[key])}</strong>
              </Card>
            ))}
            <Card className="tt-medal">
              <span className="tt-medal__icon" style={{ backgroundImage: `url(${images.elements.timetrials.worldrecord})` }} />
              <strong>{wr ? formatTime(wr.time) : 'N/A'}</strong>
            </Card>
          </footer>
        </div>
      </HubDialogContent>
    </HubDialog>
  );
}

function TrialRowsSkeleton() {
  return (
    <>
      {rowSkeletons.map((_, index) => (
        <div className="tt-row tt-row--skeleton" key={index} aria-hidden="true">
          <Skeleton className="tt-skeleton-cell tt-skeleton-cell--district" />
          <Skeleton className="tt-skeleton-cell tt-skeleton-cell--name" />
          <Skeleton className="tt-skeleton-cell tt-skeleton-cell--input" />
          <Skeleton className="tt-skeleton-cell tt-skeleton-cell--score" />
        </div>
      ))}
    </>
  );
}

export default function TimeTrialHub() {
  const [trials, setTrials] = useState<TimeTrial[]>([]);
  const [records, setRecords] = useState<Record<string, WorldRecord>>({});
  const [pbs, setPbs] = useState<Pbs>({});
  const [selected, setSelected] = useState<TimeTrial | null>(null);
  const [trialsLoading, setTrialsLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [trialsError, setTrialsError] = useState('');
  const [recordsError, setRecordsError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const rowPress = useRef<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(saveKey);
      if (saved) setPbs(JSON.parse(saved) as Pbs);
    } catch {}

    setLoaded(true);
  }, []);

  useEffect(() => {
    fetchTimeTrials()
      .then(setTrials)
      .catch(() => setTrialsError('Firebase trials are unavailable right now.'))
      .finally(() => setTrialsLoading(false));

    fetchWorldRecords()
      .then(setRecords)
      .catch(() => setRecordsError('World records are unavailable right now.'))
      .finally(() => setRecordsLoading(false));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(saveKey, JSON.stringify(pbs));
  }, [loaded, pbs]);

  const scores = useMemo(() => trials.map((trial) => rowScore(trial, records[trialKey(trial.name)], pbs[trial.name] ?? '')), [pbs, records, trials]);
  const averageScore = trials.length ? scores.reduce((total, score) => total + score, 0) / trials.length : 0;

  const setPb = (name: string, value: string) => setPbs((current) => ({...current, [name]: value}));
  const cleanPb = (name: string) => setPbs((current) => ({...current, [name]: cleanTimeInput(current[name] ?? '')}));

  return (
    <div className="tt-page">
      <section className="tt-summary">
        <Card className="xp-result xp-result--big tt-average">
          <span>Average Wasans score</span>
          {recordsLoading ? <Skeleton className="tt-average-skeleton" /> : <strong>{formatWasansScore(averageScore)}</strong>}
        </Card>
      </section>

      {recordsError ? <div className="tt-note">{recordsError}</div> : null}
      {trialsError ? <div className="tt-note tt-note--bad">{trialsError}</div> : null}

      <section className="tt-panel" aria-busy={trialsLoading || recordsLoading}>
        <div className="tt-table">
          <div className="tt-row tt-row--head">
            <span>District</span>
            <span>Trial</span>
            <span>Your Time</span>
            <span>Score</span>
          </div>

          {trialsLoading ? <ScreenReaderLoading>Loading trials...</ScreenReaderLoading> : null}
          {recordsLoading ? <ScreenReaderLoading>Loading world records...</ScreenReaderLoading> : null}
          {trialsLoading ? <TrialRowsSkeleton /> : null}
          {!trialsLoading && !trials.length && !trialsError ? <div className="tt-state">No trials found yet.</div> : null}

          {trials.map((trial) => {
            const wr = records[trialKey(trial.name)];
            const value = pbs[trial.name] ?? '';
            const score = rowScore(trial, wr, value);
            const invalid = invalidTime(trial, value);
            const waitingForWr = recordsLoading && !wr && (parseTime(value) ?? 0) > 0 && !invalid;
            const openRow = (event: React.MouseEvent<HTMLButtonElement>) => {
              if (rowPress.current !== trial.name || isTimeCell(event.target)) return;
              setSelected(trial);
            };

            return (
              <Button
                className="tt-row"
                type="button"
                key={trial.name}
                onPointerDown={(event) => {
                  rowPress.current = isTimeCell(event.target) ? null : trial.name;
                }}
                onClick={openRow}
              >
                <span data-label="District">{trial.district}</span>
                <strong data-label="Trial">{trial.name}</strong>
                <label className="tt-time" data-label="Your Time" onClick={(event) => event.stopPropagation()}>
                  <input
                    value={value}
                    inputMode="decimal"
                    placeholder="0.000"
                    aria-label={`${trial.name} personal best`}
                    onChange={(event) => setPb(trial.name, event.target.value)}
                    onBlur={() => cleanPb(trial.name)}
                  />
                  {invalid ? <small>Invalid</small> : null}
                </label>
                <span className="tt-score" data-label="Score">{waitingForWr ? <Skeleton className="tt-score-skeleton" /> : formatWasansScore(score)}</span>
              </Button>
            );
          })}
        </div>
      </section>

      {selected ? <TrialModal trial={selected} wr={records[trialKey(selected.name)]} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
