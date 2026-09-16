'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { images } from '@/lib/assets';

type NavItem = {
  title: string;
  image: string;
  href: string;
  badge?: string;
};

type Feature = {
  title: string;
  bg: string;
  items: NavItem[];
};

const features: Feature[] = [
  {
    title: 'Tools',
    bg: images.backgrounds.tools.bg,
    items: [
      { title: 'Tech List', image: images.backgrounds.tools.techlist, href: '/techlist' },
      { title: 'XP Calculator', image: images.backgrounds.tools.xpcalc, href: '/xpcalc' },
      { title: 'Time Trial Hub', image: images.backgrounds.tools.timetrialhub, href: '/timetrialhub' },
      { title: 'Reborn AI', image: images.backgrounds.tools.rebornai, href: '/rebornai' },
    ],
  },
  {
    title: 'Games',
    bg: images.backgrounds.games.bg,
    items: [
      { title: 'Parkour Guessr', image: images.backgrounds.games.parkourguessr, href: '/games/parkourguessr' },
      { title: 'Incremental Parkour', image: images.backgrounds.games.incrementalparkour, href: '/incrementalparkour', badge: 'New' },
      { title: 'Bag Opening Simulator', image: images.backgrounds.games.bagopensimulator, href: '/bagopensimulator' },
      { title: 'Parkour MC', image: images.backgrounds.games.parkourmc, href: '/parkourmc' },
    ],
  },
  {
    title: 'Community',
    bg: images.backgrounds.community.bg,
    items: [
      { title: 'Map', image: images.backgrounds.community.map, href: '/map' },
      { title: 'Contributions', image: images.backgrounds.community.contributions, href: '/contributions' },
      { title: 'Search', image: images.backgrounds.community.search, href: '/search' },
    ],
  },
];

const columnsFor = (count: number) => (count === 4 ? 2 : Math.min(count, 3));

const frameWidth = (columns: number) => {
  if (window.innerWidth <= 532) return columns === 1 ? 188 : 368;
  if (window.innerWidth <= 900) return columns === 1 ? 192 : 370;
  return columns === 1 ? 216 : columns === 2 ? 416 : 616;
};

export default function FeatureNav() {
  const [open, setOpen] = useState<string | null>(null);
  const [cols, setCols] = useState<Record<string, number>>({});
  const navRef = useRef<HTMLDivElement>(null);
  const shellRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const columnsThatFit = useCallback((title: string, count: number) => {
    const shell = shellRefs.current[title];
    if (!shell) return columnsFor(count);

    const rect = shell.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const side = Math.min(center, window.innerWidth - center) - 8;
    const available = Math.max(0, side * 2);
    const max = columnsFor(count);

    for (let next = max; next > 1; next -= 1) {
      if (frameWidth(next) <= available) return next;
    }

    return 1;
  }, []);

  const updateCols = useCallback(() => {
    if (!open) return;
    const card = features.find((item) => item.title === open);
    if (!card) return;
    setCols((current) => ({ ...current, [open]: columnsThatFit(open, card.items.length) }));
  }, [columnsThatFit, open]);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpen(null);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null);
    };

    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  useEffect(() => {
    updateCols();
    window.addEventListener('resize', updateCols);
    return () => window.removeEventListener('resize', updateCols);
  }, [updateCols]);

  return (
    <section className="feature-grid" aria-label="Hub sections" ref={navRef}>
      {features.map((card) => {
        const isOpen = open === card.title;
        const panelId = `feature-nav-${card.title.toLowerCase()}`;
        const columns = cols[card.title] ?? columnsFor(card.items.length);
        const toggle = () => {
          if (isOpen) {
            setOpen(null);
            return;
          }

          setCols((current) => ({ ...current, [card.title]: columnsThatFit(card.title, card.items.length) }));
          setOpen(card.title);
        };

        return (
          <div
            className={`feature-card-shell ${isOpen ? 'is-open' : ''}`}
            key={card.title}
            ref={(element) => {
              shellRefs.current[card.title] = element;
            }}
          >
            <Button className="feature-card" type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={toggle}>
              <span className="feature-card__image" style={{ backgroundImage: `url(${card.bg})` }} />
              <span className="feature-card__shade" />
              <span className="feature-card__content">
                <strong>{card.title}</strong>
              </span>
            </Button>

            <AnimatePresence>
              {isOpen ? (
                <div className={`feature-nav-frame feature-nav-frame--${columns}`}>
                  <motion.div
                    className="feature-nav"
                    id={panelId}
                    role="region"
                    aria-label={`${card.title} navigation`}
                    initial={{ opacity: 0, y: -8, scale: 0.94, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -6, scale: 0.96, filter: 'blur(8px)' }}
                    transition={{ type: 'spring', stiffness: 520, damping: 36, mass: 0.7 }}
                    style={{ transformOrigin: 'top center' }}
                  >
                    <div className="feature-nav__items">
                      {card.items.map((item) => (
                        <Link className="feature-nav__item" href={item.href} key={item.title} onClick={() => setOpen(null)}>
                          <span className="feature-nav__image" style={{ backgroundImage: `url(${item.image})` }} />
                          <span className="feature-nav__shade" />
                          <span className="feature-nav__content">
                            <strong>{item.title}</strong>
                            {item.badge ? <span className="feature-nav__badge">{item.badge}</span> : null}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                </div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </section>
  );
}
