import type { Metadata } from 'next';
import HubPage from '@/components/hub-page';
import TimeTrialHub from '@/components/tools/timetrialhub';
import { images } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'Time Trial Hub',
  description: 'Track PARKOUR Reborn time trial records and routes.',
  alternates: { canonical: '/timetrialhub' },
};

export default function Page() {
  return (
    <HubPage title="Time Trial Hub" image={images.backgrounds.tools.timetrialhub} link={{ href: 'https://wasans.tully.sh', label: 'Official Scoring Website' }}>
      <TimeTrialHub />
    </HubPage>
  );
}
