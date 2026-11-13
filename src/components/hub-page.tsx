import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type HubPageProps = {
  title: string;
  image: string;
  link?: { href: string; label: string };
  children: ReactNode;
};

export default function HubPage({ title, image, link, children }: HubPageProps) {
  const back = (
    <Button asChild className="back-btn">
      <Link href="/">&#8592; Back</Link>
    </Button>
  );

  return (
    <main className="hub-shell overflow-x-hidden">
      <section className="hub-page hub-page--wide">
        <div className="hub-container">
          {link ? (
            <div className="tool-topbar">
              {back}
              <Button asChild className="back-btn">
                <a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
              </Button>
            </div>
          ) : back}
          <header className="page-hero">
            <span className="page-hero__image" style={{ backgroundImage: `url(${image})` }} />
            <span className="page-hero__shade" />
            <div className="page-hero__content">
              <h1>{title}</h1>
            </div>
          </header>
          {children}
        </div>
      </section>
    </main>
  );
}
