'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { Bell, X } from 'lucide-react';

type Announcement = { id: string; title: string; message: string };

export default function Announcements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [index, setIndex] = useState(0);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const pathname = usePathname();
  const item = items[index];
  const showing = Boolean(item);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/announcements', { cache: 'no-store', signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { announcements?: Announcement[] }) => setItems(data.announcements ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // The bar is placed as the first row inside the page's own frame
  // (.hub-container), so it reads as part of the page rather than a box over
  // it. Each page has its own frame, so it is placed again after navigation.
  // Pages without a frame (the full-screen Guessr game) show no bar.
  useEffect(() => {
    if (!showing) return;
    const frame = document.querySelector('main .hub-container');
    if (!frame) {
      setSlot(null);
      return;
    }

    const element = document.createElement('div');
    element.className = 'announcement-slot';
    frame.prepend(element);
    setSlot(element);
    return () => element.remove();
  }, [pathname, showing]);

  if (!item || !slot) return null;

  return createPortal(
    <aside className="announcement" role="status" aria-label="Announcement" key={item.id}>
      <Bell className="announcement__icon" aria-hidden="true" />
      <strong className="announcement__title">{item.title}</strong>
      <p className="announcement__text">{item.message}</p>
      {items.length > 1 ? <small className="announcement__count">{index + 1}/{items.length}</small> : null}
      <button type="button" className="announcement__close" onClick={() => setIndex((current) => current + 1)} aria-label={`Close announcement: ${item.title}`}>
        <X aria-hidden="true" />
      </button>
    </aside>,
    slot,
  );
}
