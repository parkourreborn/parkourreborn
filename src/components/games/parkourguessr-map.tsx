'use client';

import { useRef, useState } from 'react';
import { LocateFixed, Maximize2, Minimize2, Minus, Plus, X } from 'lucide-react';
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
};

export default function ParkourGuessrMap({ map, value, target, open, fullscreen, disabled, busy, onChange, onOpenChange, onFullscreenChange, onSubmit }: Props) {
  const mapRef = useRef<MapCanvasHandle>(null);
  const [zoom, setZoom] = useState(1);

  return (
    <>
      <Button className={`guessr-map-launch${open ? '' : ' is-visible'}`} type="button" onClick={() => onOpenChange(true)}>Open Map</Button>
      <section className={`guessr-game-map${open ? ' is-open' : ''}${fullscreen ? ' is-fullscreen' : ''}`} aria-label="Guess map" aria-hidden={!open}>
        <div className="guessr-game-map__bar">
          <strong>Map</strong>
          <span>{Math.round(zoom * 100)}%</span>
          <div className="guessr-game-map__tools">
            <Button type="button" size="icon" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}><Minus /></Button>
            <Button type="button" size="icon" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}><Plus /></Button>
            <Button type="button" size="icon" aria-label="Reset map view" onClick={() => mapRef.current?.reset()}><LocateFixed /></Button>
            <Button type="button" size="icon" aria-label={fullscreen ? 'Exit fullscreen map' : 'Fullscreen map'} onClick={() => onFullscreenChange(!fullscreen)}>
              {fullscreen ? <Minimize2 /> : <Maximize2 />}
            </Button>
            <Button type="button" size="icon" aria-label="Close map" onClick={() => {
              onFullscreenChange(false);
              onOpenChange(false);
            }}><X /></Button>
          </div>
        </div>
        <MapCanvas
          ref={mapRef}
          image={map.url}
          width={map.width}
          height={map.height}
          value={value}
          target={target}
          disabled={disabled}
          className="guessr-game-map__stage"
          onChange={onChange}
          onZoomChange={setZoom}
        />
        <div className="guessr-game-map__foot">
          <span>{value ? 'Marker placed' : 'Tap the map to place your guess'}</span>
          {!disabled && <Button type="button" disabled={!value || busy} onClick={onSubmit}>{busy ? 'Submitting...' : 'Make Guess'}</Button>}
        </div>
      </section>
    </>
  );
}
