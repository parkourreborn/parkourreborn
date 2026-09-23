'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { LocateFixed, Minus, Plus, Settings2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import { mapDistance, metersPerStud } from '@/lib/guessr-score';
import type { MapPoint } from '@/lib/guessr';

type MapViewerProps = {
  image: string;
  open: boolean;
  onClose: () => void;
};

type MapCanvasProps = {
  image: string;
  width?: number;
  height?: number;
  padding?: number;
  value?: MapPoint | null;
  target?: MapPoint | null;
  points?: MapPoint[];
  valueLabel?: string;
  disabled?: boolean;
  className?: string;
  alt?: string;
  inputLabel?: string;
  onChange?: (point: MapPoint) => void;
  onRemove?: (index: number) => void;
  onZoomChange?: (zoom: number) => void;
  onLoad?: (width: number, height: number) => void;
  onError?: () => void;
};

export type MapCanvasHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
};

type Drag = { id: number; x: number; y: number; startX: number; startY: number; moved: boolean };
type Pinch = { distance: number; zoom: number; pan: MapPoint; center: MapPoint };

const maxZoom = 100;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const distance = (a: MapPoint, b: MapPoint) => Math.hypot(a.x - b.x, a.y - b.y);

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvas({
  image,
  width = 0,
  height = 0,
  padding = 24,
  value = null,
  target = null,
  points,
  valueLabel = 'Your guess',
  disabled = false,
  className = '',
  alt = 'PARKOUR Reborn world map',
  inputLabel = 'Parkour Reborn guess map. Drag to pan and tap to place a marker.',
  onChange,
  onRemove,
  onZoomChange,
  onLoad,
  onError,
}, ref) {
  const stageRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, MapPoint>());
  const drag = useRef<Drag | null>(null);
  const pinch = useRef<Pinch | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<MapPoint>({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [natural, setNatural] = useState({ width, height });
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const mapWidth = width || natural.width;
  const mapHeight = height || natural.height;
  const ready = size.width > 16 && size.height > 16 && mapWidth > 0 && mapHeight > 0;

  const base = useMemo(() => {
    if (!ready) return { width: 0, height: 0 };
    const scale = Math.min(Math.max(1, size.width - padding) / mapWidth, Math.max(1, size.height - padding) / mapHeight);
    return { width: mapWidth * scale, height: mapHeight * scale };
  }, [mapHeight, mapWidth, padding, ready, size.height, size.width]);

  const clampPan = useCallback((next: MapPoint, nextZoom = zoom) => {
    const maxX = Math.max(0, (base.width * nextZoom - size.width) / 2);
    const maxY = Math.max(0, (base.height * nextZoom - size.height) / 2);
    return { x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
  }, [base.height, base.width, size.height, size.width, zoom]);

  const changeZoom = useCallback((next: number, anchor: MapPoint = { x: 0, y: 0 }) => {
    const value = clamp(next, 1, maxZoom);
    const ratio = value / zoom;
    const nextPan = {
      x: anchor.x - (anchor.x - pan.x) * ratio,
      y: anchor.y - (anchor.y - pan.y) * ratio,
    };
    setZoom(value);
    setPan(clampPan(nextPan, value));
  }, [clampPan, pan.x, pan.y, zoom]);

  const reset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useImperativeHandle(ref, () => ({
    zoomIn: () => changeZoom(zoom * 1.22),
    zoomOut: () => changeZoom(zoom / 1.22),
    reset,
  }), [changeZoom, reset, zoom]);

  useEffect(() => {
    onZoomChange?.(zoom);
  }, [onZoomChange, zoom]);

  const measure = useCallback(() => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (rect && rect.width > 0 && rect.height > 0) setSize({ width: rect.width, height: rect.height });
  }, []);

  useEffect(() => {
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (stageRef.current) observer?.observe(stageRef.current);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  useEffect(() => {
    reset();
  }, [image, mapHeight, mapWidth, reset]);

  useEffect(() => {
    setPan((current) => clampPan(current));
  }, [clampPan]);

  const pointInStage = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
  };

  const pointOnMap = (clientX: number, clientY: number) => {
    const rect = layerRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return null;
    const point = { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height };
    if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) return null;
    return point;
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      changeZoom(zoom * (event.deltaY > 0 ? 0.88 : 1.12), pointInStage(event.clientX, event.clientY));
    };

    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [changeZoom, zoom]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);

    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = {
        distance: distance(a, b),
        zoom,
        pan,
        center: pointInStage((a.x + b.x) / 2, (a.y + b.y) / 2),
      };
      drag.current = null;
    } else {
      drag.current = { id: event.pointerId, x: point.x, y: point.y, startX: point.x, startY: point.y, moved: false };
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = Array.from(pointers.current.values());
      const center = pointInStage((a.x + b.x) / 2, (a.y + b.y) / 2);
      const nextZoom = clamp(pinch.current.zoom * (distance(a, b) / Math.max(1, pinch.current.distance)), 1, maxZoom);
      const ratio = nextZoom / pinch.current.zoom;
      const nextPan = {
        x: center.x - (pinch.current.center.x - pinch.current.pan.x) * ratio,
        y: center.y - (pinch.current.center.y - pinch.current.pan.y) * ratio,
      };
      setZoom(nextZoom);
      setPan(clampPan(nextPan, nextZoom));
      return;
    }

    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    if (Math.hypot(point.x - current.startX, point.y - current.startY) > 5) current.moved = true;
    const dx = point.x - current.x;
    const dy = point.y - current.y;
    if (current.moved) setPan((value) => clampPan({ x: value.x + dx, y: value.y + dy }));
    current.x = point.x;
    current.y = point.y;
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const current = drag.current;
    const place = event.type === 'pointerup' && pointers.current.size === 1 && current?.id === event.pointerId && !current.moved && !pinch.current;
    pointers.current.delete(event.pointerId);

    if (pointers.current.size === 1) {
      const [id, point] = Array.from(pointers.current.entries())[0];
      drag.current = { id, x: point.x, y: point.y, startX: point.x, startY: point.y, moved: true };
    } else {
      drag.current = null;
    }
    pinch.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);

    if (place && loaded && !disabled) {
      const rect = layerRef.current?.getBoundingClientRect();
      const index = rect && points?.findIndex((point) => {
        const x = rect.left + point.x * rect.width;
        const y = rect.top + point.y * rect.height;
        return Math.abs(event.clientX - x) <= 20 && event.clientY >= y - 36 && event.clientY <= y + 12;
      });
      if (index !== undefined && index >= 0 && onRemove) {
        onRemove(index);
        return;
      }
      const point = pointOnMap(event.clientX, event.clientY);
      if (point) onChange?.(point);
    }
  };

  return (
    <div
      ref={stageRef}
      className={`map-canvas ${className}`.trim()}
      style={{ touchAction: 'none' }}
      role="application"
      aria-label={onChange ? disabled ? 'Parkour Reborn result map' : inputLabel : `${alt}. Drag to pan and scroll or pinch to zoom.`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={onPointerUp}
    >
      {(!mapWidth || !mapHeight) && (
        <img
          className="map-canvas__probe"
          src={image}
          alt=""
          aria-hidden="true"
          onLoad={(event) => {
            setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight });
            onLoad?.(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
            measure();
          }}
          onError={onError}
        />
      )}
      {ready && (
        <div
          ref={layerRef}
          className="map-canvas__layer"
          style={{ width: base.width * zoom, height: base.height * zoom, transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px)` }}
        >
          <img
            className="map-canvas__image"
            src={image}
            alt={alt}
            draggable={false}
            onLoad={(event) => {
              if (!width || !height) setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight });
              setLoaded(true);
              onLoad?.(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
              measure();
            }}
            onError={() => {
              setLoadError(true);
              onError?.();
            }}
          />
          {value && target && (
            <svg className="map-canvas__line" viewBox={`0 0 ${mapWidth} ${mapHeight}`} preserveAspectRatio="none" aria-hidden="true">
              <line x1={value.x * mapWidth} y1={value.y * mapHeight} x2={target.x * mapWidth} y2={target.y * mapHeight} />
            </svg>
          )}
          {points && points.length > 1 && (
            <svg className="map-canvas__line" viewBox={`0 0 ${mapWidth} ${mapHeight}`} preserveAspectRatio="none" aria-hidden="true">
              <polyline points={points.map((point) => `${point.x * mapWidth},${point.y * mapHeight}`).join(' ')} />
            </svg>
          )}
          {[{ point: value, name: 'guess', label: valueLabel }, { point: target, name: 'target', label: 'Actual location' }].map(({ point, name, label }) => point && (
            <svg key={name} className={`map-marker map-marker--${name}`} style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%`, transform: 'translate(-50%, -100%)' }} viewBox="0 0 24 30" role="img" aria-label={label}>
              <path d="M12 29C10 25 2 17 2 11a10 10 0 0 1 20 0c0 6-8 14-10 18Z" fill="currentColor" stroke="#24171c" strokeWidth="2" />
              <circle cx="12" cy="11" r="4" fill="#24171c" />
            </svg>
          ))}
          {points?.map((point, index) => (
            <svg key={index} className="map-marker map-marker--measure" style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%`, transform: 'translate(-50%, -100%)' }} viewBox="0 0 24 30" role="img" aria-label={`Measurement point ${index + 1}`}>
              <path d="M12 29C10 25 2 17 2 11a10 10 0 0 1 20 0c0 6-8 14-10 18Z" fill="currentColor" stroke="#24171c" strokeWidth="2" />
              <circle cx="12" cy="11" r="4" fill="#24171c" />
            </svg>
          ))}
        </div>
      )}
      {(!ready || !loaded || loadError) && <span className="map-canvas__loading">{loadError ? 'Could not load map' : 'Loading map...'}</span>}
    </div>
  );
});

export default function MapViewer({ image, open, onClose }: MapViewerProps) {
  const mapRef = useRef<MapCanvasHandle>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [cursor, setCursor] = useState<MapPoint | null>(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);
  const total = points.reduce((sum, point, index) => index ? sum + mapDistance(points[index - 1], point, mapSize.width, mapSize.height) : sum, 0);

  const toggleMeasure = () => {
    setMeasuring((current) => !current);
    setPoints([]);
    setCursor(null);
  };

  const addPoint = (point: MapPoint) => {
    setPoints((current) => [...current, point]);
    setCursor(null);
  };

  const removePoint = (index: number) => {
    setPoints((current) => current.filter((_, pointIndex) => pointIndex !== index));
    setCursor(null);
  };

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      stageRef.current?.focus({ preventScroll: true });
      mapRef.current?.reset();
    });
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next) onClose();
    }}>
      <DialogPortal>
        <DialogPrimitive.Content className="map-modal" aria-label="Map viewer">
          <DialogTitle className="sr-only">Map</DialogTitle>
          <section className="guessr-game-map is-open is-fullscreen" aria-label="Map">
            <div className="guessr-game-map__bar">
              <strong>Map</strong>
              <span>{Math.round(zoom * 100)}%</span>
              <div className="guessr-game-map__tools">
                <Button type="button" size="icon" aria-label="Zoom out" onClick={() => mapRef.current?.zoomOut()}><Minus /></Button>
                <Button type="button" size="icon" aria-label="Zoom in" onClick={() => mapRef.current?.zoomIn()}><Plus /></Button>
                <Button type="button" size="icon" aria-label="Reset map view" onClick={() => mapRef.current?.reset()}><LocateFixed /></Button>
                <Button type="button" size="icon" aria-label="Map options" aria-expanded={optionsOpen} aria-controls="map-options" onClick={() => setOptionsOpen((current) => !current)}><Settings2 /></Button>
                <Button type="button" size="icon" aria-label="Close map" onClick={onClose}><X /></Button>
              </div>
            </div>
            <div ref={stageRef} className="guessr-game-map__stage" tabIndex={0} role="group" aria-label={measuring ? 'Measure map. Use arrow keys to move a point, Enter to add it.' : 'Map. Drag to pan and scroll or pinch to zoom.'} onKeyDown={(event) => {
              if (!measuring || !ready || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(event.key)) return;
              event.preventDefault();
              const current = cursor ?? points.at(-1) ?? { x: 0.5, y: 0.5 };
              if (event.key === 'Enter' || event.key === ' ') {
                addPoint(current);
                return;
              }
              const step = event.shiftKey ? 0.01 : 0.002;
              setCursor({
                x: Math.min(1, Math.max(0, current.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0))),
                y: Math.min(1, Math.max(0, current.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0))),
              });
            }}>
              <MapCanvas ref={mapRef} image={image} value={cursor} valueLabel="Measure cursor" points={measuring ? points : undefined} disabled={!measuring} inputLabel="Parkour Reborn measure map. Drag to pan and tap to add a point." onChange={measuring ? addPoint : undefined} onRemove={measuring ? removePoint : undefined} onZoomChange={setZoom} onLoad={(width, height) => {
                setMapSize({ width, height });
                setReady(true);
              }} onError={() => setReady(false)} />
            </div>
            {optionsOpen && (
              <aside id="map-options" className="map-options" aria-label="Map options">
                <strong>Options</strong>
                <Button type="button" aria-pressed={measuring} onClick={toggleMeasure}>Measure {measuring ? 'On' : 'Off'}</Button>
                {measuring && <p>Tap to add points. Tap a pin to remove it.</p>}
                {measuring && points.length > 0 && (
                  <ol>
                    {points.map((_, index) => <li key={index}><span>Point {index + 1}</span><Button type="button" size="icon" aria-label={`Remove point ${index + 1}`} onClick={() => removePoint(index)}><X /></Button></li>)}
                  </ol>
                )}
              </aside>
            )}
            {measuring && <div className="map-measure" role="status"><span>{points.length} points</span><strong>{total.toFixed(1)} meters ({(total / metersPerStud).toFixed(1)} studs)</strong></div>}
          </section>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
