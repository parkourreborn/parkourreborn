import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/page-hero';
import TimeTrialHub from '@/components/tools/timetrialhub';
import { Button } from '@/components/ui/button';
import { images } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'Time Trial Hub',
  description: 'Track PARKOUR Reborn time trial records and routes.',
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
              <a href="https://wasans.tully.sh" target="_blank" rel="noopener noreferrer">Official Scoring Website</a>
            </Button>
          </div>
          <PageHero title="Time Trial Hub" image={images.backgrounds.tools.timetrialhub} />
          <TimeTrialHub />
        </div>
      </section>
    </main>
  );
}
