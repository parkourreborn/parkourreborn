import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="hub-shell overflow-x-hidden">
      <section className="hub-page hub-page--wide">
        <div className="hub-container">
          <div className="not-found">
            <span className="not-found__code">{'// Error 404'}</span>
            <h1>Page not found</h1>
            <p>This page does not exist or has moved. Try one of these instead.</p>
            <nav className="not-found__links" aria-label="Popular pages">
              <Link href="/">Home</Link>
              <Link href="/techlist">Tech List</Link>
              <Link href="/rebornai">Reborn AI</Link>
              <Link href="/timetrialhub">Time Trial Hub</Link>
              <Link href="/search">Search</Link>
            </nav>
          </div>
        </div>
      </section>
    </main>
  );
}
