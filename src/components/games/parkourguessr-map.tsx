'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { LocateFixed, Map, Maximize2, Minimize2, Minus, Plus, X } from 'lucide-react';
import { MapCanvas } from '@/components/community/mapview';
import type { MapCanvasHandle } from '@/components/community/mapview';
import { Button } from '@/components/ui/button';
import type { GuessrMap, MapPoint } from '@/lib/guessr';

type Props = {
  map: GuessrMap;
  value: MapPoint | null;
  target: MapPoint | null;
  open: boolean;
  fullscreen: boolean;
  disabled: boolean;
  busy: boolean;
  onChange: (point: MapPoint) => void;
  onOpenChange: (open: boolean) => void;
  onFullscreenChange: (fullscreen: boolean) => void;
  onSubmit: () => void;
  children?: ReactNode;
};

export default function ParkourGuessrMap({ map, value, target, open, fullscreen, disabled, busy, onChange, onOpenChange, onFullscreenChange, onSubmit, children }: Props) {
  const mapRef = useRef<MapCanvasHandle>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open || (!fullscreen && !window.matchMedia('(max-width: 760px)').matches)) return;
    const previous = document.activeElement;
    stageRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [fullscreen, open]);

  return (
    <>
      <Button className={`guessr-map-launch${open ? '' : ' is-visible'}`} type="button" onClick={() => onOpenChange(true)}><Map aria-hidden="true" />Open Map</Button>
      <section className={`guessr-game-map${open ? ' is-open' : ''}${fullscreen ? ' is-fullscreen' : ''}${target ? ' has-result' : ''}`} aria-label="Guess map" aria-hidden={!open} onKeyDown={(event) => {
        if (event.key !== 'Tab' || (!fullscreen && !window.matchMedia('(max-width: 760px)').matches)) return;
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]')).filter((item) => item.getClientRects().length);
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}>
        <div className="guessr-game-map__bar">
          <strong>Map</strong>
          <span>{Math.round(zoom * 100)}%</span>
          <div className="guessr-game-map__tools">
            <Button type="button" size="icon" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}><Minus /></Button>
            <Button type="button" size="icon" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}><Plus /></Button>
            <Button type="button" size="icon" aria-label="Reset map view" onClick={() => mapRef.current?.reset()}><LocateFixed /></Button>
            <Button type="button" size="icon" className="guessr-game-map__expand" aria-label={fullscreen ? 'Exit fullscreen map' : 'Fullscreen map'} onClick={() => onFullscreenChange(!fullscreen)}>
              {fullscreen ? <Minimize2 /> : <Maximize2 />}
            </Button>
            {!target && <Button type="button" size="icon" aria-label="Close map" onClick={() => {
              onFullscreenChange(false);
              onOpenChange(false);
            }}><X /></Button>}
          </div>
        </div>
        <div ref={stageRef} className="guessr-game-map__stage" tabIndex={0} role="group" aria-label={target ? 'Round result map' : 'Guess location. Use arrow keys to move the marker, Enter to place it.'} onKeyDown={(event) => {
          if (disabled || !ready || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)) return;
          event.preventDefault();
          const point = value ?? { x: 0.5, y: 0.5 };
          const step = event.shiftKey ? 0.01 : 0.002;
          onChange({
            x: Math.min(1, Math.max(0, point.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0))),
            y: Math.min(1, Math.max(0, point.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0))),
          });
        }}>
          <MapCanvas
            ref={mapRef}
            image={map.url}
            width={map.width}
            height={map.height}
            value={value}
            target={target}
            disabled={disabled}
            onChange={onChange}
            onZoomChange={setZoom}
            onLoad={() => setReady(true)}
            onError={() => setReady(false)}
          />
        </div>
        {children || <Button className="guessr-game-map__submit" type="button" disabled={disabled || !ready || !value || busy} onClick={onSubmit}>{busy ? 'Submitting...' : 'Make Guess'}</Button>}
      </section>
    </>
  );
}
