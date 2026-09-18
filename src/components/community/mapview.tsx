'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogPortal, DialogTitle } from '@/components/ui/dialog';
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
  disabled?: boolean;
  className?: string;
  alt?: string;
  onChange?: (point: MapPoint) => void;
  onZoomChange?: (zoom: number) => void;
  onLoad?: () => void;
  onError?: () => void;
};

export type MapCanvasHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
};

type Drag = { id: number; x: number; y: number; startX: number; startY: number; moved: boolean };
type Pinch = { distance: number; zoom: number; pan: MapPoint; center: MapPoint };

const maxZoom = 16;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const distance = (a: MapPoint, b: MapPoint) => Math.hypot(a.x - b.x, a.y - b.y);

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvas({
  image,
  width = 0,
  height = 0,
  padding = 24,
  value = null,
  target = null,
  disabled = false,
  className = '',
  alt = 'PARKOUR Reborn world map',
  onChange,
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

    if (place && loaded && !disabled && onChange) {
      const point = pointOnMap(event.clientX, event.clientY);
      if (point) onChange(point);
    }
  };

  return (
    <div
      ref={stageRef}
      className={`map-canvas ${className}`.trim()}
      style={{ touchAction: 'none' }}
      role="application"
      aria-label={onChange ? disabled ? 'Parkour Reborn result map' : 'Parkour Reborn guess map. Drag to pan and tap to place a marker.' : `${alt}. Drag to pan and scroll or pinch to zoom.`}
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
            onLoad?.();
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
              onLoad?.();
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
          {[{ point: value, name: 'guess', label: 'Your guess' }, { point: target, name: 'target', label: 'Actual location' }].map(({ point, name, label }) => point && (
            <svg key={name} className={`map-marker map-marker--${name}`} style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%`, transform: 'translate(-50%, -100%)' }} viewBox="0 0 24 30" role="img" aria-label={label}>
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
  const modalRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      modalRef.current?.focus();
      mapRef.current?.reset();
    });
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;

      const focusable = modalRef.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next) onClose();
    }}>
      <DialogPortal>
        <DialogPrimitive.Content className="map-modal" aria-label="Map viewer" ref={modalRef} tabIndex={-1}>
          <div className="tt-dialog__head map-modal__bar">
            <DialogTitle asChild><h2>Map</h2></DialogTitle>
            <div className="map-modal__tools">
              <Button type="button" onClick={() => mapRef.current?.zoomIn()}>Zoom In</Button>
              <Button type="button" onClick={() => mapRef.current?.zoomOut()}>Zoom Out</Button>
              <Button type="button" onClick={() => mapRef.current?.reset()}>Reset</Button>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <DialogClose asChild>
              <Button className="tt-close" type="button" aria-label="Close map">
                <span className="tt-close__icon" />
              </Button>
            </DialogClose>
          </div>
          <MapCanvas ref={mapRef} image={image} className="map-modal__stage" onZoomChange={setZoom} />
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
