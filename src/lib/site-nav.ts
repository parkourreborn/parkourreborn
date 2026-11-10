import { images } from '@/lib/assets';

export type NavItem = {
  title: string;
  image: string;
  href: string;
  badge?: string;
  external?: boolean;
};

export type NavSection = {
  title: string;
  bg: string;
  items: NavItem[];
};

// The hub's pages, grouped as on the home page. The Tab menu is built from the
// same list so the two never drift apart.
export const hubSections: NavSection[] = [
  {
    title: 'Tools',
    bg: images.backgrounds.tools.bg,
    items: [
      { title: 'Tech List', image: images.backgrounds.tools.techlist, href: '/techlist' },
      { title: 'XP Calculator', image: images.backgrounds.tools.xpcalc, href: '/xpcalc' },
      { title: 'Time Trial Hub', image: images.backgrounds.tools.timetrialhub, href: '/timetrialhub' },
      { title: 'Reborn AI', image: images.backgrounds.tools.rebornai, href: '/rebornai', badge: 'New' },
    ],
  },
  {
    title: 'Games',
    bg: images.backgrounds.games.bg,
    items: [
      { title: 'Parkour Guessr', image: images.backgrounds.games.parkourguessr, href: '/games/parkourguessr', badge: 'New' },
      { title: 'Incremental Parkour', image: images.backgrounds.games.incrementalparkour, href: '/incrementalparkour', badge: 'New' },
      { title: 'Bag Opening Simulator', image: images.backgrounds.games.bagopensimulator, href: '/bagopensimulator', badge: 'Coming Soon' },
      { title: 'Parkour MC', image: images.backgrounds.games.parkourmc, href: '/parkourmc', badge: 'New' },
    ],
  },
  {
    title: 'Community',
    bg: images.backgrounds.community.bg,
    items: [
      { title: 'Map', image: images.backgrounds.community.map, href: '/map' },
      { title: 'Contributions', image: images.backgrounds.community.contributions, href: '/contributions', badge: 'Coming Soon' },
      { title: 'Search', image: images.backgrounds.community.search, href: '/search' },
    ],
  },
];

const wiki: NavItem = { title: 'Wiki', image: images.backgrounds.links.wiki, href: 'https://parkourreborn.wiki', external: true };

// The Tab menu shows only pages that are out, plus the wiki under Community.
export const menuSections: NavSection[] = hubSections.map((section) => ({
  ...section,
  items: [
    ...section.items.filter((item) => item.badge !== 'Coming Soon'),
    ...(section.title === 'Community' ? [wiki] : []),
  ],
}));
