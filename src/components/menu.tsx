'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowBigLeft, ArrowUpRight } from 'lucide-react';
import { images } from '@/lib/assets';
import { menuSections } from '@/lib/site-nav';
import MenuAuth from '@/components/menu-auth';
import { Button } from '@/components/ui/button';

const MenuIcon = () => (
  <span className="menu-icon" aria-hidden="true">
    <span />
    <span />
    <span />
  </span>
);

const focusable = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Nothing is focused: a fresh page load, a click on empty space, or after the
// focused element went away.
const nothingFocused = () => {
  const active = document.activeElement;
  return !active || active === document.body || active === document.documentElement;
};

export default function Menu() {
  const [open, setOpen] = useState(false);
  // Tiles and their images are only rendered once the menu has been opened.
  const [seen, setSeen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const guessr = pathname === '/games/parkourguessr' || pathname === '/games/parkourguessr/play';

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) document.getElementById('menu-toggle')?.focus();
  }, []);

  useEffect(() => {
    if (open) setSeen(true);
  }, [open]);

  // Like the in-game Tab menu: Tab opens the menu, but only while nothing on
  // the page has focus. Once something is focused, Tab moves focus as usual,
  // so keyboard and screen reader users can reach everything.
  useEffect(() => {
    if (guessr) return;

    const keyboard = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
      if (!nothingFocused()) return;

      event.preventDefault();
      setOpen((current) => !current);
    };

    document.addEventListener('keydown', keyboard, true);
    return () => document.removeEventListener('keydown', keyboard, true);
  }, [guessr]);

  // While open, the menu behaves like a dialog: the page behind stops
  // scrolling, focus starts inside, Tab cycles within it, and Escape closes it
  // and returns focus to the menu button.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    panel.inert = !open;
    if (!open) return;

    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = 'hidden';

    const items = () => [...panel.querySelectorAll<HTMLElement>(focusable)].filter((item) => item.offsetParent !== null);
    if (!panel.contains(document.activeElement)) {
      (panel.querySelector<HTMLElement>('[aria-current="page"]') ?? panel.querySelector<HTMLElement>('.pause-menu__tile') ?? items()[0])?.focus();
    }

    const keyboard = (event: KeyboardEvent) => {
      // Leave keys alone while a dialog opened from the menu (the account
      // panel) has focus, or when the Tab-to-toggle handler already used it.
      const current = document.activeElement;
      if (event.defaultPrevented || (current && !panel.contains(current) && current.closest('[role="dialog"]'))) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
        return;
      }

      if (event.key !== 'Tab') return;
      const list = items();
      if (!list.length) return;

      const first = list[0];
      const last = list[list.length - 1];
      if (!panel.contains(current)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', keyboard);
    return () => {
      root.style.overflow = overflow;
      document.removeEventListener('keydown', keyboard);
    };
  }, [open, close]);

  if (pathname === '/games/parkourguessr/play') return null;

  return (
    <>
      <Button
        id="menu-toggle"
        className="menu-toggle"
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((current) => !current)}
      >
        <MenuIcon />
      </Button>

      <div
        id="site-menu"
        ref={panelRef}
        className={`pause-menu${open ? ' is-open' : ''}`}
        role="dialog"
        aria-modal={open}
        aria-label="Menu"
        aria-hidden={!open}
        onClick={(event) => {
          if (event.target === event.currentTarget) close(true);
        }}
      >
        {open || seen ? (
          <div className="pause-menu__inner">
            <div className="pause-menu__head">
              <Link href="/" className="pause-menu__brand" aria-current={pathname === '/' ? 'page' : undefined} onClick={() => setOpen(false)}>
                <Image src={images.logo.main} alt="" width={34} height={34} />
                <span>PR Hub</span>
              </Link>
            </div>

            {menuSections.map((section) => (
              <section className="pause-menu__section" aria-labelledby={`menu-${section.title.toLowerCase()}`} key={section.title}>
                <h2 id={`menu-${section.title.toLowerCase()}`}>{section.title}</h2>
                <div className="pause-menu__grid">
                  {section.items.map((item) => {
                    const tile = (
                      <>
                        <Image className="pause-menu__img" src={item.image} alt="" fill sizes="(max-width: 760px) 50vw, 260px" />
                        <span className="pause-menu__name">
                          {item.title}
                          {item.external ? <ArrowUpRight aria-hidden="true" /> : null}
                        </span>
                      </>
                    );

                    return item.external ? (
                      <a className="pause-menu__tile" href={item.href} target="_blank" rel="noopener noreferrer" key={item.title} onClick={() => setOpen(false)}>
                        {tile}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      <Link
                        className="pause-menu__tile"
                        href={item.href}
                        key={item.title}
                        aria-current={pathname === item.href ? 'page' : undefined}
                        onClick={() => setOpen(false)}
                      >
                        {tile}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}

            <div className="pause-menu__foot">
              <MenuAuth />
              <button type="button" className="pause-menu__resume" onClick={() => close(true)}>
                <ArrowBigLeft aria-hidden="true" />
                <span>Resume</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
