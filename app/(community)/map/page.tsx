import type { Metadata } from 'next';
import Link from 'next/link';
import MapCard from '@/components/community/mapcard';
import PageHero from '@/components/page-hero';
import { Button } from '@/components/ui/button';
import { images } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'Map',
  description: 'View the PARKOUR Reborn map.',
};

export default function Page() {
  return (
    <main className="hub-shell overflow-x-hidden">
      <section className="hub-page hub-page--wide">
        <div className="hub-container">
          <div className="tool-topbar">
            <Button asChild className="back-btn">
              <Link href="/">&#8592; Back</Link>
            </Button>
            <Button asChild className="back-btn">
              <a href="https://map.themirrorcafe.cc" target="_blank" rel="noopener noreferrer">Official Interactive Map</a>
            </Button>
          </div>
          <PageHero title="Map" image={images.backgrounds.community.map} />
          <MapCard image={images.elements.map.normal} />
        </div>
      </section>
    </main>
  );
}
