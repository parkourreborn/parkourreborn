'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';

type Announcement = { id: string; title: string; message: string };

export default function Announcements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/announcements', { cache: 'no-store', signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { announcements?: Announcement[] }) => setItems(data.announcements ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const item = items[index];
  if (!item) return null;

  return (
    <aside className="announcement" role="status" aria-label="Website announcement" key={item.id}>
      <Bell className="announcement__icon" aria-hidden="true" />
      <div className="announcement__content">
        <strong>{item.title}</strong>
        <p>{item.message}</p>
        {items.length > 1 && <small>{index + 1} of {items.length}</small>}
      </div>
      <button type="button" className="announcement__close" onClick={() => setIndex((current) => current + 1)} aria-label={`Close announcement: ${item.title}`}>
        <X size={18} aria-hidden="true" />
      </button>
    </aside>
  );
}
