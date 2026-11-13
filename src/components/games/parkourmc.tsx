'use client';

import { useState } from 'react';

export default function ParkourMC() {
  const [copyText, setCopyText] = useState('Click to copy');

  async function copyIP() {
    try {
      await navigator.clipboard.writeText("play.parkourreborn.com");
      setCopyText('Copied');
    } catch {
      setCopyText('Could not copy');
    }

    window.setTimeout(() => setCopyText('Click to copy'), 1800);
  }

  return (
    <section className="mc-page" aria-label="Parkour MC server details">
      <div className="mc-server">
        <span>Server IP</span>
        <button className="mc-ip" type="button" onClick={() => void copyIP()}>
          <strong>play.parkourreborn.com</strong>
          <small aria-live="polite">{copyText}</small>
        </button>
      </div>

      <div className="mc-mod">
        <span>Fabric mod required</span>
        <a className="mc-download" href="https://modrinth.com/mod/parkour-reborn" target="_blank" rel="noopener noreferrer">Download</a>
      </div>
    </section>
  );
}
