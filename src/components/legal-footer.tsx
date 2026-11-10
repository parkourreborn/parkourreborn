'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';

const key = 'pr-hub-analytics';
const savedChoice = () => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export default function LegalFooter() {
  const [choice, setChoice] = useState<'yes' | 'no' | null | undefined>(undefined);
  const [settings, setSettings] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const saved = savedChoice();
    setChoice(saved === 'yes' || saved === 'no' ? saved : null);
  }, []);

  // Opened from the footer: move focus to the choice so keyboard users land on it.
  useEffect(() => {
    if (settings) noticeRef.current?.querySelector('button')?.focus();
  }, [settings]);

  const choose = (value: 'yes' | 'no') => {
    try {
      localStorage.setItem(key, value);
    } catch {
      if (value === 'yes') return;
    }
    if (settings) settingsRef.current?.focus();
    setChoice(value);
    setSettings(false);
  };

  const closeSettings = () => {
    setSettings(false);
    settingsRef.current?.focus();
  };

  // The notice is a non-blocking banner, so it is a labelled region rather
  // than a dialog. It is rendered into #consent-root at the top of <body> so
  // it comes first in the tab order.
  const notice = (choice === null || settings) ? (
    <div className="analytics-notice" role="region" aria-label="Analytics choice" ref={noticeRef}>
      <div>
        <strong>Analytics?</strong>
        <p>Can we use Vercel Analytics to see how the hub is used? It only starts if you accept. <Link href="/privacy">Privacy details</Link></p>
      </div>
      <div className="analytics-notice__actions">
        <button type="button" onClick={() => choose('no')}>No thanks</button>
        <button type="button" onClick={() => choose('yes')}>Accept analytics</button>
        {settings && choice !== null && <button type="button" onClick={closeSettings}>Close</button>}
      </div>
    </div>
  ) : null;

  const root = typeof document === 'undefined' ? null : document.getElementById('consent-root');

  return (
    <>
      <footer className="legal-footer">
        <span>Parkour Reborn Hub by ElkkuT</span>
        <nav aria-label="Legal links">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <button type="button" ref={settingsRef} onClick={() => setSettings(true)}>Analytics settings</button>
        </nav>
      </footer>
      {notice && root ? createPortal(notice, root) : notice}
      {choice === 'yes' && <Analytics beforeSend={(event) => savedChoice() === 'yes' ? event : null} />}
    </>
  );
}
