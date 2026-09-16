'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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

export default function Menu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navClass = (href: string) => `side-menu__link${pathname === href ? ' side-menu__link--on' : ''}`;

  useEffect(() => {
    if (pathname === '/games/parkourguessr/play') return;

    const typing = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return target.matches('input, textarea, select, [contenteditable="true"]');
    };

    const clearFocus = () => {
      if (document.activeElement instanceof HTMLElement && !typing(document.activeElement)) document.activeElement.blur();
    };

    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        event.stopImmediatePropagation();
        clearFocus();
        setOpen((current) => !current);
        requestAnimationFrame(clearFocus);
        return;
      }

      if (typing(event.target)) return;

      if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof HTMLElement && event.target.closest('a, button, [role="button"]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    const focus = (event: FocusEvent) => {
      if (typing(event.target)) return;
      if (event.target instanceof HTMLElement) event.target.blur();
    };

    document.addEventListener('keydown', keyboard, true);
    document.addEventListener('focusin', focus, true);
    return () => {
      document.removeEventListener('keydown', keyboard, true);
      document.removeEventListener('focusin', focus, true);
    };
  }, [pathname]);

  if (pathname === '/games/parkourguessr/play') return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className={`menu-toggle ${open ? 'is-open' : ''}`} type="button" tabIndex={-1} aria-label="Open menu" aria-expanded={open}>
          <MenuIcon open={open} />
        </Button>
      </SheetTrigger>

      <aside className={`side-menu ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <div className="side-menu__brand">
          <Image src={images.logo.main} alt="" width={34} height={34} />
          <span>PR Hub</span>
        </div>

        <nav className="side-menu__nav" aria-label="Main menu">
          <span className="side-menu__label">Hub</span>

          <Link href="/" className={navClass('/')} aria-current={pathname === '/' ? 'page' : undefined} tabIndex={-1} onClick={() => setOpen(false)}>
            <House className="side-menu__icon size-8" aria-hidden="true" />
            <span>Home</span>
          </Link>

          {mainLinks.map(({ href, icon: Icon, name }) => (
            <Link
              href={href}
              className={navClass(href)}
              key={name}
              aria-current={pathname === href ? 'page' : undefined}
              tabIndex={-1}
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
              tabIndex={-1}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              <Icon className="side-menu__icon size-8" aria-hidden="true" />
              <span>{name}</span>
              <span className="side-menu__out" aria-hidden="true">&#8599;</span>
            </Link>
          ))}
        </nav>
        <div className="side-menu__footer">
          <MenuAuth />
          <Button className="side-menu__resume" type="button" tabIndex={-1} onClick={() => setOpen(false)}>
            <ArrowBigLeft className="side-menu__resume-icon size-7" aria-hidden="true" />
            <span className="side-menu__resume-text">Resume</span>
          </Button>
        </div>
      </aside>

      <Button className={`menu-scrim ${open ? 'is-open' : ''}`} type="button" tabIndex={-1} aria-label="Close menu" onClick={() => setOpen(false)} />
    </Sheet>
  );
}
