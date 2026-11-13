import type { Metadata } from 'next';
import { Exo_2, IBM_Plex_Mono, Jura, Rajdhani } from 'next/font/google';
import { AuthProvider } from '@/components/auth-provider';
import LegalFooter from '@/components/legal-footer';
import Menu from '@/components/menu';
import Announcements from '@/components/announcements';
import { TooltipProvider } from '@/components/ui/tooltip';
import { images } from '@/lib/assets';
import './globals.css';

// next/font downloads these at build time and serves them from this site, so
// visitors' browsers never contact Google Fonts.
const exo2 = Exo_2({ subsets: ['latin', 'latin-ext'], weight: ['500', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin', 'latin-ext'], weight: ['500', '600', '700'], variable: '--font-plex-mono', display: 'swap' });
const jura = Jura({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'], variable: '--font-jura', display: 'swap' });
const rajdhani = Rajdhani({ subsets: ['latin', 'latin-ext'], weight: ['500', '600', '700'], variable: '--font-rajdhani', display: 'swap' });
const fontVariables = [exo2.variable, plexMono.variable, jura.variable, rajdhani.variable].join(' ');

const site = 'https://www.parkourreborn.com';
const description = 'A hub for PARKOUR Reborn links, tools, games, and community stuff. Everything useful is kept in one spot.';

export const metadata: Metadata = {
  metadataBase: new URL(site),
  applicationName: 'Parkour Reborn Hub',
  title: {
    default: 'Parkour Reborn Hub',
    template: '%s | PR Hub',
  },
  description,
  keywords: [
    'PARKOUR Reborn',
    'Parkour Reborn Hub',
    'Roblox PARKOUR Reborn',
    'PARKOUR Reborn tools',
    'PARKOUR Reborn map',
    'PARKOUR Reborn XP calculator',
    'PARKOUR Reborn time trials',
    'PARKOUR Reborn tech list',
    'PARKOUR Reborn techs',
    'PARKOUR Reborn games',
    'PARKOUR Reborn Discord',
    'PR Hub',
    'xp calculator',
  ],
  authors: [{ name: 'ElkkuT' }],
  creator: 'ElkkuT',
  publisher: 'Parkour Reborn Hub',
  category: 'gaming',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: { icon: images.logo.icon },
  openGraph: {
    type: 'website',
    url: '/',
    locale: 'en_US',
    siteName: 'PARKOUR Reborn',
    title: 'Parkour Reborn Hub',
    description,
    images: [{ url: images.logo.og, width: 760, height: 399, alt: 'PARKOUR Reborn' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Parkour Reborn Hub',
    description,
    images: [images.logo.og],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${fontVariables}`}>
      <body>
        <div className="hub-bg" aria-hidden="true">
          <span className="hub-bg__icons" />
          <span className="hub-bg__shade" />
        </div>
        <AuthProvider>
          <TooltipProvider>
            <Menu />
            {/* The analytics notice renders here so it follows the menu button in the tab order. */}
            <div id="consent-root" />
            <Announcements />
            {children}
          </TooltipProvider>
        </AuthProvider>
        <LegalFooter />
      </body>
    </html>
  );
}
