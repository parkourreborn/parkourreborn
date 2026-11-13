'use client';

import { useState } from 'react';
import Image from 'next/image';
import MapViewer from '@/components/community/mapview';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type MapCardProps = {
  image: string;
};

export default function MapCard({ image }: MapCardProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className="map-card">
        <Button className="map-card__open" type="button" aria-label="Open fullscreen map" onClick={() => setOpen(true)}>
          Fullscreen
        </Button>
        <Image src={image} alt="PARKOUR Reborn world map" width={5688} height={4800} sizes="(max-width: 1152px) 100vw, 1120px" />
      </Card>
      <MapViewer image={image} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
