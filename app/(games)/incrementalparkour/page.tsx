import type { Metadata } from 'next';
import Link from 'next/link';
import IncrementalParkour from '@/components/games/incrementalparkour';
import PageHero from '@/components/page-hero';
import { Button } from '@/components/ui/button';
import { images } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'Incremental Parkour',
  description: 'Play PARKOUR Reborn 2d incremental game.',
};

export default function Page() {
  return (
    <main className="hub-shell overflow-x-hidden">
      <section className="hub-page hub-page--wide">
        <div className="hub-container">
          <Button asChild className="back-btn">
            <Link href="/">&#8592; Back</Link>
          </Button>
          <PageHero title="Incremental Parkour" image={images.backgrounds.games.incrementalparkour} />
          <IncrementalParkour />
        </div>
      </section>
    </main>
  );
}
