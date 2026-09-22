import Image from 'next/image';
import type { ReactNode } from 'react';
import FeatureNav from '@/components/feature-nav';
import { images } from '@/lib/assets';

type LinkCard = {
  name: string;
  url: string;
  bg: string;
  icon: ReactNode;
};

function DiscordIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function RobloxIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.926 23.998 0 18.892 5.075 0.002 24 5.108ZM15.348 10.09l-5.282 -1.453 -1.414 5.273 5.282 1.453z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M11 4.85c-2.195-1.022-5.52-1.565-8.633.979A1 1 0 0 0 2 6.603V19a1 1 0 0 0 1.633.774c2.736-2.236 5.734-1.31 7.367-.255V4.849zm2 0v14.669c1.633-1.056 4.63-1.981 7.367.255A1 1 0 0 0 22 19V6.603a1 1 0 0 0-.367-.774C18.52 3.285 15.195 3.828 13 4.849z" />
    </svg>
  );
}

const officialLinks: LinkCard[] = [
  { name: 'Discord', url: 'https://discord.gg/parkourreborn', bg: images.backgrounds.links.discord, icon: <DiscordIcon /> },
  { name: 'Game', url: 'https://www.roblox.com/games/11639495622/PARKOUR-Reborn', bg: images.backgrounds.links.gamepage, icon: <RobloxIcon /> },
  { name: 'Wiki', url: 'https://parkourreborn.wiki', bg: images.backgrounds.links.wiki, icon: <BookIcon /> },
];

const creatorLinks: LinkCard[] = [
  { name: 'YouTube', url: 'https://www.youtube.com/@ElkkuT', bg: images.backgrounds.links.youtube, icon: <YouTubeIcon /> },
  { name: 'Roblox', url: 'https://www.roblox.com/users/762337022/profile', bg: images.backgrounds.links.roblox, icon: <RobloxIcon /> },
];

export default function Home() {
  return (
    <main className="hub-shell overflow-x-hidden">
      <section className="hub-page">
        <div className="hub-container">
          <header className="hero-panel">
            <div className="hero-panel__logo">
              <Image src={images.logo.hero} alt="Parkour Reborn Hub" width={520} height={240} priority />
            </div>
          </header>
          <FeatureNav />
          <section className="links-panel">
            <div className="panel-title">Links</div>
            <div className="link-groups">
              <LinkGroup title="Official" links={officialLinks} />
              <LinkGroup title="Creator" links={creatorLinks} />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function LinkGroup({ title, links }: { title: string; links: LinkCard[] }) {
  const gridClass = title === 'Official' ? 'link-grid link-grid--official' : 'link-grid link-grid--creator';

  return (
    <div className="link-group">
      <h2>{title}</h2>
      <div className={gridClass}>
        {links.map((link) => (
          <a className="link-card" href={link.url} key={link.name} target="_blank" rel="noopener noreferrer">
            <span className="link-card__image" style={{ backgroundImage: `url(${link.bg})` }} />
            <span className="link-card__shade" />
            <span className="link-card__content">
              <span>{link.icon}</span>
              <strong>{link.name}</strong>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
