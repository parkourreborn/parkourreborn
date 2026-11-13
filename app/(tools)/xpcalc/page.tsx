import type { Metadata } from 'next';
import HubPage from '@/components/hub-page';
import XPCalculator from '@/components/tools/xpcalc';
import { images } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'XP Calculator',
  description: 'Calculate PARKOUR Reborn levels, XP, and combo score.',
  alternates: { canonical: '/xpcalc' },
};

export default function Page() {
  return (
    <HubPage title="XP Calculator" image={images.backgrounds.tools.xpcalc}>
      <XPCalculator />
    </HubPage>
  );
}
