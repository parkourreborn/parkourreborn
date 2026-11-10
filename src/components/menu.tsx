'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Clock, ClipboardList, ArrowBigLeft, House, Search } from 'lucide-react';
import { images } from '@/lib/assets';
import MenuAuth from '@/components/menu-auth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';

const mainLinks = [
  { name: 'Tech List', href: '/techlist', icon: ClipboardList },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Time Trial Hub', href: '/timetrialhub', icon: Clock },
];

const redirectLinks = [
  { name: 'Wiki', href: 'https://parkourreborn.wiki', icon: BookOpen },
];

const MenuIcon = ({ open }: { open: boolean }) => (
  <span className={`menu-icon ${open ? 'is-open' : ''}`} aria-hidden="true">
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
  const pathname = usePathname();
  const panelRef = useRef<HTMLElement>(null);
  const navClass = (href: string) => `side-menu__link${pathname === href ? ' side-menu__link--on' : ''}`;
  const guessr = pathname === '/games/parkourguessr' || pathname === '/games/parkourguessr/play';

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) requestAnimationFrame(() => document.getElementById('menu-toggle')?.focus());
  }, []);

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

  // While open, the menu behaves like a dialog: focus starts inside, Tab
  // cycles within it, and Escape closes it and returns focus to the button.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    panel.inert = !open;
    if (!open) return;

    const items = () => [...panel.querySelectorAll<HTMLElement>(focusable)].filter((item) => item.offsetParent !== null);
    const frame = requestAnimationFrame(() => {
      if (!panel.contains(document.activeElement)) (panel.querySelector<HTMLElement>('[aria-current="page"]') ?? items()[0])?.focus();
    });

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
      const active = document.activeElement;
      if (!panel.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', keyboard);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', keyboard);
    };
  }, [open, close]);

  if (pathname === '/games/parkourguessr/play') return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button id="menu-toggle" className={`menu-toggle ${open ? 'is-open' : ''}`} type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="side-menu">
          <MenuIcon open={open} />
        </Button>
      </SheetTrigger>

      <aside
        id="side-menu"
        ref={panelRef}
        className={`side-menu ${open ? 'is-open' : ''}`}
        aria-hidden={!open}
        aria-label="Site menu"
        role="dialog"
        aria-modal={open}
      >
        <div className="side-menu__brand">
          <Image src={images.logo.main} alt="" width={34} height={34} />
          <span>PR Hub</span>
        </div>

        <nav className="side-menu__nav" aria-label="Main menu">
          <span className="side-menu__label">Hub</span>

          <Link href="/" className={navClass('/')} aria-current={pathname === '/' ? 'page' : undefined} onClick={() => setOpen(false)}>
            <House className="side-menu__icon size-8" aria-hidden="true" />
            <span>Home</span>
          </Link>

          {mainLinks.map(({ href, icon: Icon, name }) => (
            <Link
              href={href}
              className={navClass(href)}
              key={name}
              aria-current={pathname === href ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              <Icon className="side-menu__icon size-8" aria-hidden="true" />
              <span>{name}</span>
            </Link>
          ))}
          <span className="side-menu__label side-menu__label--links">Links</span>

          {redirectLinks.map(({ href, icon: Icon, name }) => (
            <Link
              href={href}
              className="side-menu__link"
              key={name}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              <Icon className="side-menu__icon size-8" aria-hidden="true" />
              <span>{name}</span>
              <span className="side-menu__out" aria-hidden="true">&#8599;</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </Link>
          ))}
        </nav>
        <div className="side-menu__footer">
          <MenuAuth />
          <Button className="side-menu__resume" type="button" onClick={() => close(true)}>
            <ArrowBigLeft className="side-menu__resume-icon size-7" aria-hidden="true" />
            <span className="side-menu__resume-text">Resume</span>
          </Button>
        </div>
      </aside>

      <Button className={`menu-scrim ${open ? 'is-open' : ''}`} type="button" tabIndex={-1} aria-hidden="true" onClick={() => setOpen(false)} />
    </Sheet>
  );
}
