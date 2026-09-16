import { NextResponse } from 'next/server';
import type { CommunityResource, CommunityResourceType } from '@/lib/pages/search';
import { getAdminDb } from '@/lib/server/firebase-admin';
import { cleanUrl } from '@/lib/url';

type GifData = {
  link?: string;
  redirect?: string;
  active?: unknown;
};

type LinkData = {
  link?: string;
  description?: string;
  active?: unknown;
};

type FileData = {
  link?: string;
  description?: string;
  downloadable?: boolean;
  active?: unknown;
};

export const dynamic = 'force-dynamic';

const text = (value: unknown) => (value === undefined || value === null ? '' : String(value).trim());
const sortType = { gif: 0, file: 1, link: 2 } satisfies Record<CommunityResourceType, number>;

async function getDocs<T>(name: string) {
  const snapshot = await getAdminDb().collection(name).get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, data: doc.data() as T & { active?: unknown } }))
    .filter((doc) => doc.data.active !== false);
}

function cleanResource(id: string, type: CommunityResourceType, data: GifData | LinkData | FileData): CommunityResource | null {
  const link = cleanUrl(data.link);
  if (!id || !link) return null;

  const resource: CommunityResource = {
    id: `${type}:${id}`,
    name: id,
    type,
    link,
  };

  if (type === 'gif' && 'redirect' in data) {
    const redirect = cleanUrl(data.redirect);
    if (redirect) resource.redirect = redirect;
  }

  if ('description' in data) {
    const description = text(data.description);
    if (description) resource.description = description;
  }

  if (type === 'file' && 'downloadable' in data) resource.downloadable = data.downloadable === true;

  return resource;
}

export async function GET() {
  try {
    const [gifs, files, links] = await Promise.all([
      getDocs<GifData>('gifs'),
      getDocs<FileData>('files'),
      getDocs<LinkData>('links'),
    ]);

    const resources = [
      ...gifs.map((doc) => cleanResource(doc.id, 'gif', doc.data)),
      ...files.map((doc) => cleanResource(doc.id, 'file', doc.data)),
      ...links.map((doc) => cleanResource(doc.id, 'link', doc.data)),
    ]
      .filter((item): item is CommunityResource => Boolean(item))
      .sort((a, b) => sortType[a.type] - sortType[b.type] || a.name.localeCompare(b.name));

    return NextResponse.json(resources);
  } catch {
    return NextResponse.json({ error: 'Community search unavailable' }, { status: 500 });
  }
}
