'use client';

import { useEffect, useMemo, useState } from 'react';
import { CardSkeleton, ScreenReaderLoading, Skeleton } from '@/components/skeleton';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogTitle } from '@/components/ui/dialog';
import { HubDialog, HubDialogContent } from '@/components/ui/hub-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { fetchCommunityResources } from '@/lib/pages/search';
import type { CommunityResource, CommunityResourceType } from '@/lib/pages/search';
import { useProgressiveList } from '@/lib/use-progressive-list';

type TypeOption = {
  id: CommunityResourceType;
  label: string;
};

type ResourceModalProps = {
  item: CommunityResource;
  onClose: () => void;
};

const typeOptions: TypeOption[] = [
  { id: 'gif', label: 'GIFs' },
  { id: 'file', label: 'Files' },
  { id: 'link', label: 'Links' },
];

const labels: Record<CommunityResourceType, string> = {
  gif: 'GIF',
  file: 'File',
  link: 'Link',
};

const sortType = { gif: 0, file: 1, link: 2 } satisfies Record<CommunityResourceType, number>;

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 8V5.8C8 4.8 8.8 4 9.8 4h8.4c1 0 1.8.8 1.8 1.8v8.4c0 1-.8 1.8-1.8 1.8H16" />
    <path d="M5.8 8h8.4c1 0 1.8.8 1.8 1.8v8.4c0 1-.8 1.8-1.8 1.8H5.8c-1 0-1.8-.8-1.8-1.8V9.8C4 8.8 4.8 8 5.8 8z" />
  </svg>
);

const skeletons = Array.from({ length: 18 });

function safeURL(link: string) {
  try {
    const url = new URL(link);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

async function copyURL(link: string) {
  try {
    await navigator.clipboard.writeText(link);
  } catch {}
}

function ResourceModal({ item, onClose }: ResourceModalProps) {
  const action = item.type === 'file' && item.downloadable ? 'Download' : 'Open';
  const openURL = item.type === 'gif' ? item.redirect || item.link : item.link;
  const canOpen = safeURL(openURL);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <HubDialog onOpenChange={(next) => {
      if (!next) onClose();
    }}>
      <HubDialogContent
        className={`tt-dialog search-dialog search-dialog--${item.type}`}
        aria-label={item.name}
        onOpenAutoFocus={(event) => {
          // Focus the dialog itself rather than its first button, so the copy
          // button's tooltip does not pop open as soon as the dialog opens.
          event.preventDefault();
          (event.currentTarget as HTMLElement | null)?.focus();
        }}
      >
        <header className="tt-dialog__head">
          <DialogTitle asChild><h2>{item.name}</h2></DialogTitle>
          <div className="search-head-actions">
            {item.type === 'gif' ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button className="tt-copy" type="button" aria-label="Copy GIF link" onClick={() => void copyURL(openURL)}><CopyIcon /></Button>
                </TooltipTrigger>
                <TooltipContent>Copy GIF link</TooltipContent>
              </Tooltip>
            ) : null}
            <DialogClose asChild>
              <Button className="tt-close" type="button" aria-label="Close"><span className="tt-close__icon" /></Button>
            </DialogClose>
          </div>
        </header>

        <div className="tt-dialog__body">
          <div className="tt-meta"><span>{labels[item.type]}</span></div>

          {item.type === 'gif' ? (
            <div className="search-gif">
              {canOpen ? (
                <a className="search-gif__link" href={openURL} target="_blank" rel="noopener noreferrer">
                  <img src={item.link} alt={item.name} />
                </a>
              ) : <img src={item.link} alt={item.name} />}
            </div>
          ) : (
            <div className="search-info">
              {item.description ? <p>{item.description}</p> : <p>No description yet.</p>}
              {canOpen ? <a className="search-url" href={item.link} target="_blank" rel="noopener noreferrer">{item.link}</a> : <span className="search-url">Link looks broken.</span>}
              {canOpen ? (
                <a className="account-btn account-btn--go search-action" href={item.link} target="_blank" rel="noopener noreferrer" download={item.type === 'file' && item.downloadable ? '' : undefined}>
                  {action}
                </a>
              ) : null}
            </div>
          )}
        </div>
      </HubDialogContent>
    </HubDialog>
  );
}

function ResourceCard({ item, onSelect }: { item: CommunityResource; onSelect: (item: CommunityResource) => void }) {
  const [loaded, setLoaded] = useState(item.type !== 'gif');

  return (
    <Button className={`search-card search-card--${item.type}`} type="button" onClick={() => onSelect(item)}>
      {item.type === 'gif' ? (
        <span className={`search-card__preview${loaded ? ' is-loaded' : ''}`}>
          {!loaded ? <Skeleton className="card-media-skeleton" /> : null}
          <img src={item.link} alt="" loading="lazy" onLoad={() => setLoaded(true)} onError={() => setLoaded(true)} />
        </span>
      ) : null}
      <span className="search-card__body">
        <strong>{item.name}</strong>
        {item.description ? <span>{item.description}</span> : null}
      </span>
    </Button>
  );
}

export default function CommunitySearch() {
  const [items, setItems] = useState<CommunityResource[]>([]);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<CommunityResourceType>('gif');
  const [selected, setSelected] = useState<CommunityResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCommunityResources()
      .then(setItems)
      .catch(() => setError('Community stuff is unavailable right now.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return items
      .filter((item) => item.type === type)
      .filter((item) => {
        if (!search) return true;
        return [item.name, item.type, labels[item.type], item.description ?? ''].some((value) => value.toLowerCase().includes(search));
      })
      .sort((a, b) => sortType[a.type] - sortType[b.type] || a.name.localeCompare(b.name));
  }, [items, query, type]);
  const shown = useProgressiveList(filtered, `${query.trim().toLowerCase()}-${type}-${items.length}`);

  return (
    <div className="search-page">
      <section className="search-panel">
        <label>
          <span>Search library</span>
          <input value={query} placeholder="Search..." onChange={(event) => setQuery(event.target.value)} />
        </label>

        <div className="search-filters" aria-label="Resource type">
          {typeOptions.map((option) => (
            <Button className={type === option.id ? 'is-on' : ''} type="button" aria-pressed={type === option.id} key={option.id} onClick={() => setType(option.id)}>
              {option.label}
            </Button>
          ))}
        </div>
      </section>

      {error ? <div className="tt-note tt-note--bad">{error}</div> : null}

      <section className="search-results" aria-live="polite" aria-busy={loading || shown.revealing}>
        {loading ? <ScreenReaderLoading>Loading resources...</ScreenReaderLoading> : null}
        {shown.revealing ? <ScreenReaderLoading>Loading more resources...</ScreenReaderLoading> : null}
        {loading ? skeletons.map((_, index) => <CardSkeleton className="search-card" media={type === 'gif'} key={index} />) : null}
        {!loading && !items.length && !error ? <div className="tt-state">No resources found yet.</div> : null}
        {!loading && items.length > 0 && !filtered.length ? <div className="tt-state">No matches found.</div> : null}

        {!loading ? shown.visibleItems.map((item) => <ResourceCard item={item} key={item.id} onSelect={setSelected} />) : null}
        {!loading && shown.revealing ? skeletons.slice(0, 6).map((_, index) => <CardSkeleton className="search-card" media={type === 'gif'} key={`more-${index}`} />) : null}
        {!loading && shown.hasMore ? <div className="skeleton-sentinel" ref={shown.sentinelRef} aria-hidden="true" /> : null}
      </section>

      {selected ? <ResourceModal item={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
