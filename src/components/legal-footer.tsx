'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const saved = savedChoice();
    setChoice(saved === 'yes' || saved === 'no' ? saved : null);
  }, []);

  const choose = (value: 'yes' | 'no') => {
    try {
      localStorage.setItem(key, value);
    } catch {
      if (value === 'yes') return;
    }
    setChoice(value);
    setSettings(false);
  };

  return (
    <>
      <footer className="legal-footer">
        <span>Parkour Reborn Hub by ElkkuT</span>
        <nav aria-label="Legal links">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <button type="button" onClick={() => setSettings(true)}>Analytics settings</button>
        </nav>
      </footer>
      {(choice === null || settings) && (
        <div className="analytics-notice" role="dialog" aria-label="Analytics choice">
          <div>
            <strong>Analytics?</strong>
            <p>Can we use Vercel Analytics to see how the hub is used? It only starts if you accept. <Link href="/privacy">Privacy details</Link></p>
          </div>
          <div className="analytics-notice__actions">
            <button type="button" onClick={() => choose('no')}>No thanks</button>
            <button type="button" onClick={() => choose('yes')}>Accept analytics</button>
            {settings && choice !== null && <button type="button" onClick={() => setSettings(false)}>Close</button>}
          </div>
        </div>
      )}
      {choice === 'yes' && <Analytics beforeSend={(event) => savedChoice() === 'yes' ? event : null} />}
    </>
  );
}
