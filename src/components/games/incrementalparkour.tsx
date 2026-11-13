'use client';

import { useEffect, useRef, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { useParkourSave } from '@/lib/use-parkour-save';

const TOP_EDGE = 72;

export default function IncrementalParkour() {
  const boxRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const barTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [full, setFull] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const [atTop, setAtTop] = useState(false);
  const { status, busy, guest, start } = useParkourSave(frameRef);
  const playing = status === 'ready';
  const waiting = busy || status === 'loading';

  function peek() {
    setPeeking(true);
    clearTimeout(barTimer.current);
    barTimer.current = setTimeout(() => setPeeking(false), 2600);
  }

  useEffect(() => {
    function onFull() {
      if (!document.fullscreenElement) {
        setFull(false);
        setAtTop(false);
      }
    }

    function onBlur() {
      if (document.activeElement === frameRef.current) peek();
    }

    document.addEventListener('fullscreenchange', onFull);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('fullscreenchange', onFull);
      window.removeEventListener('blur', onBlur);
      clearTimeout(barTimer.current);
    };
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!playing || !frame) return;

    function onMove(e: MouseEvent) {
      setAtTop(e.clientY < TOP_EDGE);
    }

    function hook() {
      frame?.contentDocument?.addEventListener('mousemove', onMove);
    }

    frame.addEventListener('load', hook);
    return () => {
      frame.removeEventListener('load', hook);
      frame.contentDocument?.removeEventListener('mousemove', onMove);
    };
  }, [playing]);

  function trackTop(e: React.MouseEvent) {
    if (!full) return;
    const top = frameRef.current?.getBoundingClientRect().top ?? 0;
    setAtTop(e.clientY - top < TOP_EDGE);
  }

  function toggleFull() {
    const box = boxRef.current;
    if (!box) return;
    peek();
    if (full) {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      setFull(false);
      setAtTop(false);
      return;
    }
    setFull(true);
    void box.requestFullscreen?.({ navigationUI: 'hide' })?.catch(() => {});
  }

  function play() {
    peek();
    void start();
  }

  return (
    <section
      ref={boxRef}
      className={`ip-frame${full ? ' is-full' : ''}${peeking ? ' is-peek' : ''}${atTop ? ' is-top' : ''}`}
      aria-label="Incremental Parkour game"
      onPointerDown={peek}
      onMouseMove={trackTop}
      onMouseLeave={() => setAtTop(false)}
    >
      {playing ? (
        <div className="ip-stage">
          <iframe ref={frameRef} src="/games/incrementalparkour/index.html" title="Incremental Parkour" allow="autoplay; fullscreen" />
          <div className="ip-top">
            <button className="ip-full" type="button" onClick={toggleFull} title={full ? 'Exit fullscreen' : 'Fullscreen'}>
              {full ? <Minimize className="size-4" aria-hidden="true" /> : <Maximize className="size-4" aria-hidden="true" />}
              <span>{full ? 'Exit' : 'Fullscreen'}</span>
            </button>
          </div>
        </div>
      ) : (
        <button className="ip-start" type="button" onClick={play} disabled={waiting}>
          <strong>{waiting ? 'Loading' : 'Play'}</strong>
          <small>{status === 'error' ? 'save did not load, tap to retry' : 'loads about 12 mb'}</small>
          {guest ? <small className="ip-start__tip">log in or your progress wont save</small> : null}
        </button>
      )}
    </section>
  );
}
