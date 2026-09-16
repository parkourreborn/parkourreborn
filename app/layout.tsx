import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { AuthProvider } from '@/components/auth-provider';
import Menu from '@/components/menu';
import Announcements from '@/components/announcements';
import { TooltipProvider } from '@/components/ui/tooltip';
import { images } from '@/lib/assets';
import './globals.css';

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
  alternates: { canonical: '/' },
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
    <html lang="en">
      <body>
        <div className="hub-bg" aria-hidden="true">
          <span className="hub-bg__icons" />
          <span className="hub-bg__shade" />
        </div>
        <AuthProvider>
          <TooltipProvider>
            <Menu />
            <Announcements />
            {children}
          </TooltipProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
