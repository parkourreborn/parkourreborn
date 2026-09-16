import type { MetadataRoute } from 'next';

const site = 'https://www.parkourreborn.com';

const pages = [
  '',
  '/techlist',
  '/xpcalc',
  '/timetrialhub',
  '/rebornai',
  '/games/parkourguessr',
  '/incrementalparkour',
  '/bagopensimulator',
  '/map',
  '/contributions',
];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map((page) => ({
    url: `${site}${page}`,
    lastModified: new Date(),
    changeFrequency: page ? 'weekly' : 'daily',
    priority: page ? 0.7 : 1,
  }));
}
