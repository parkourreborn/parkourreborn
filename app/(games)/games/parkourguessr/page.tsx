import type { Metadata } from 'next';
import Link from 'next/link';
import ParkourGuessrSelect from '@/components/games/parkourguessr-select';
import PageHero from '@/components/page-hero';
import { Button } from '@/components/ui/button';
import { images } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'Parkour Guessr',
  description: 'Play Parkour Reborn geoguessr.',
};

export default async function Page({ searchParams }: { searchParams: Promise<{ unavailable?: string }> }) {
  const params = await searchParams;

  return (
    <main className="hub-shell overflow-x-hidden">
      <section className="hub-page hub-page--wide">
        <div className="hub-container">
          <Button asChild className="back-btn">
            <Link href="/">&#8592; Back</Link>
          </Button>
          <PageHero title="Parkour Guessr" image={images.backgrounds.games.parkourguessr} />
          <ParkourGuessrSelect notice={params.unavailable === 'invalid' ? 'Pick a mode and difficulty before starting.' : ''} />
        </div>
      </section>
    </main>
  );
}
