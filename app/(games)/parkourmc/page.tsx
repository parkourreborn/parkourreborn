import type { Metadata } from 'next';
import Link from 'next/link';
import ParkourMC from '@/components/games/parkourmc';
import PageHero from '@/components/page-hero';
import { Button } from '@/components/ui/button';
import { images } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'Parkour MC',
  description: 'Join the Parkour Reborn Minecraft server.',
};

export default function Page() {
  return (
    <main className="hub-shell overflow-x-hidden">
      <section className="hub-page hub-page--wide">
        <div className="hub-container">
          <Button asChild className="back-btn">
            <Link href="/">&#8592; Back</Link>
          </Button>
          <PageHero title="Parkour MC" image={images.backgrounds.games.parkourmc} />
          <ParkourMC />
        </div>
      </section>
    </main>
  );
}
