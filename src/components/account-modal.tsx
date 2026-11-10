'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Pencil, Power, Trash2, X } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { ScreenReaderLoading, Skeleton } from '@/components/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HubDialog, HubDialogContent } from '@/components/ui/hub-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { images } from '@/lib/assets';
import { discordAvatar } from '@/lib/discord';
import { formatDate, formatDateTime } from '@/lib/pages/account';
import { statSources } from '@/lib/pages/account-stats';
import type { GameStats } from '@/lib/pages/account-stats';

type AccountModalProps = {
  onClose: () => void;
};

const insideMenu = (node: EventTarget | null) => (
  node instanceof Element && !!node.closest('[data-radix-popper-content-wrapper], [data-slot="dropdown-menu-content"]')
);

type StatsState = {
  status: 'loading' | 'ready' | 'empty' | 'error';
  stats: GameStats | null;
};

function AccountSkeleton() {
  return (
    <div className="account-skeleton" aria-hidden="true">
      <Skeleton className="account-skeleton__avatar" />
      <Skeleton className="account-skeleton__name" />
      <Skeleton className="account-skeleton__facts" />
      <Skeleton className="account-skeleton__action" />
    </div>
  );
}

function SignedOut() {
  const { busy, error, login } = useAuth();

  return (
    <div className="account-login">
      <Image src={images.logo.main} alt="" width={60} height={60} loading="eager" />
      <strong>Not logged in</strong>
      {error ? <span className="account-error" role="alert">{error}</span> : null}
      <button className="account-btn account-btn--go account-btn--wide" type="button" disabled={busy} onClick={login}>
        <MessageCircle aria-hidden="true" />
        Log in with Discord
      </button>
    </div>
  );
}

function Stats() {
  const { user } = useAuth();
  const [pick, setPick] = useState(statSources[0].id);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<StatsState>({ status: 'loading', stats: null });

  const source = statSources.find((item) => item.id === pick) ?? statSources[0];

  useEffect(() => {
    let active = true;
    setState({ status: 'loading', stats: null });

    const run = async () => {
      try {
        const token = await user?.getIdToken();
        if (!token) throw new Error('Signed out');

        const stats = await source.load(token);
        if (active) setState({ status: stats ? 'ready' : 'empty', stats });
      } catch {
        if (active) setState({ status: 'error', stats: null });
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [source, user]);

  return (
    <div className="account-stats" aria-busy={state.status === 'loading'}>
      <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
        <div className={`account-picker${open ? ' is-open' : ''}`}>
          <span id="account-source-label">Source</span>
          <DropdownMenuTrigger asChild>
            <Button className="account-picker__button" type="button" aria-haspopup="listbox" aria-expanded={open} aria-labelledby="account-source-label account-source-value">
              <strong id="account-source-value">{source.name}</strong>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="account-picker__menu" sideOffset={5} align="start" aria-labelledby="account-source-label" style={{ width: 'var(--radix-dropdown-menu-trigger-width)' }}>
            <DropdownMenuRadioGroup value={pick} onValueChange={(value) => {
              setPick(value);
              setOpen(false);
            }}>
              {statSources.map((item) => (
                <DropdownMenuRadioItem className={item.id === pick ? 'is-on' : ''} value={item.id} key={item.id}>
                  {item.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </div>
      </DropdownMenu>

      {state.status === 'loading' ? (
        <>
          <ScreenReaderLoading>Loading stats...</ScreenReaderLoading>
          <div className="account-tiles" aria-hidden="true">
            {[0, 1, 2].map((key) => <Skeleton className="account-tile-skeleton" key={key} />)}
          </div>
        </>
      ) : null}

      {state.status === 'empty' ? <p className="account-note">No saved progress yet. Play {source.name} and it shows up here.</p> : null}
      {state.status === 'error' ? <p className="account-note account-note--bad">Could not load stats right now.</p> : null}

      {state.status === 'ready' && state.stats ? (
        <>
          <div className="account-tiles">
            {state.stats.tiles.map((tile) => (
              <div className="account-tile" key={tile.label}>
                <small>{tile.label}</small>
                <strong>{tile.value}</strong>
              </div>
            ))}
          </div>

          {state.stats.tables.map((table) => (
            <section className="account-table" key={table.title}>
              <h3>{table.title}</h3>
              <div className="account-table__scroll">
                <table>
                  <thead>
                    <tr>{table.columns.map((column) => <th key={column}>{column}</th>)}</tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row) => (
                      <tr key={row[0]}>
                        {row.map((cell, index) => <td key={table.columns[index]}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </>
      ) : null}
    </div>
  );
}

export default function AccountModal({ onClose }: AccountModalProps) {
  const { account, discord, loading, busy, error, logout, updateName, deactivate, deleteAccount, exportData } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirm, setConfirm] = useState<'deactivate' | 'delete' | null>(null);
  const [typed, setTyped] = useState('');
  const [actionError, setActionError] = useState('');
  const name = account?.displayName || discord?.globalName || discord?.username || 'Discord user';
  const avatar = discord ? discordAvatar(discord) : '';
  // These dialogs are opened without a Radix trigger, so Radix has nowhere to
  // send focus when they close. Send it back to whatever opened them.
  const [opener] = useState(() => (typeof document === 'undefined' ? null : document.activeElement as HTMLElement | null));
  const confirmFrom = useRef<HTMLElement | null>(null);
  const refocus = (target: () => HTMLElement | null) => (event: Event) => {
    event.preventDefault();
    const element = target();
    if (element?.isConnected) element.focus();
  };

  const saveName = async () => {
    setActionError('');
    try {
      await updateName(draft);
      setEditing(false);
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Could not update your name.');
    }
  };

  const downloadData = async () => {
    setActionError('');
    try {
      await exportData();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Could not export your data.');
    }
  };

  const finishAction = async () => {
    setActionError('');
    try {
      if (confirm === 'deactivate') await deactivate();
      if (confirm === 'delete') await deleteAccount(typed);
      setConfirm(null);
      onClose();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Could not update your account.');
    }
  };

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <>
    <HubDialog onOpenChange={(next) => {
      if (!next && !confirm) onClose();
    }}>
      <HubDialogContent
        className="account-dialog"
        aria-describedby={undefined}
        onCloseAutoFocus={refocus(() => opener)}
        onInteractOutside={(event) => {
          if (insideMenu(event.detail.originalEvent.target)) event.preventDefault();
        }}
      >
        <DialogTitle className="sr-only">{discord ? 'Account' : 'Log in'}</DialogTitle>
        <div className="account-banner" aria-hidden="true" />
        <DialogClose asChild>
          <button className="account-close" type="button" aria-label="Close">
            <X aria-hidden="true" />
          </button>
        </DialogClose>

        <div className="account-main" aria-busy={loading || busy}>
          {loading ? <ScreenReaderLoading>Checking login...</ScreenReaderLoading> : null}
          {busy ? <ScreenReaderLoading>Updating account...</ScreenReaderLoading> : null}
          {loading ? <AccountSkeleton /> : null}
          {!loading && !discord ? <SignedOut /> : null}

          {!loading && discord ? (
            <>
              <div className="account-id">
                <Avatar className="account-avatar">
                  {avatar ? <AvatarImage src={avatar} alt="" /> : null}
                  <AvatarFallback>{name.slice(0, 1)}</AvatarFallback>
                </Avatar>
                {editing ? (
                  <form className="account-name-edit" onSubmit={(event) => { event.preventDefault(); void saveName(); }}>
                    <input aria-label="Display name" value={draft} maxLength={32} autoFocus onChange={(event) => setDraft(event.target.value)} disabled={busy} />
                    <div>
                      <button className="account-btn" type="button" disabled={busy} onClick={() => { setEditing(false); setActionError(''); }}>Cancel</button>
                      <button className="account-btn account-btn--go" type="submit" disabled={busy || !draft.trim()}>Save</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <span className="account-id__name"><strong>{name}</strong><small>@{discord.username}</small></span>
                    <button className="account-icon-btn" type="button" aria-label="Change display name" onClick={() => { setDraft(name); setActionError(''); setEditing(true); }}>
                      <Pencil aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>

              {editing && actionError ? <span className="account-error" role="alert">{actionError}</span> : null}

              <Tabs className="account-body" defaultValue="account">
                <TabsList className="account-tabs" aria-label="Account sections">
                  <TabsTrigger value="account">Profile</TabsTrigger>
                  <TabsTrigger value="stats">Stats</TabsTrigger>
                </TabsList>

                <TabsContent className="account-panel" value="account">
                  <dl className="account-facts">
                    <div>
                      <dt>Joined</dt>
                      <dd>{formatDate(account?.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>Last login</dt>
                      <dd>{formatDateTime(account?.lastLogin)}</dd>
                    </div>
                    <div>
                      <dt>Discord ID</dt>
                      <dd className="account-facts__mono">{discord.id}</dd>
                    </div>
                  </dl>

                  {error ? <span className="account-error" role="alert">{error}</span> : null}
                  {!editing && !confirm && actionError ? <span className="account-error" role="alert">{actionError}</span> : null}

                  <div className="account-actions">
                    <button className="account-btn account-btn--go" type="button" disabled={busy} onClick={logout}>Log out</button>
                    <button className="account-btn" type="button" disabled={busy} aria-label="Download my data" onClick={() => void downloadData()}>My data</button>
                    <span className="account-actions__gap" />
                    <button className="account-text-btn" type="button" disabled={busy} onClick={(event) => { confirmFrom.current = event.currentTarget; setConfirm('deactivate'); setActionError(''); }}>Deactivate</button>
                    <button className="account-text-btn account-text-btn--risk" type="button" disabled={busy} aria-label="Delete account" onClick={(event) => { confirmFrom.current = event.currentTarget; setConfirm('delete'); setTyped(''); setActionError(''); }}>Delete</button>
                  </div>
                </TabsContent>

                <TabsContent className="account-panel" value="stats">
                  <Stats />
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </div>
      </HubDialogContent>
    </HubDialog>
    {confirm ? (
      <HubDialog onOpenChange={(next) => { if (!next && !busy) setConfirm(null); }}>
        <HubDialogContent className="account-dialog account-confirm" aria-describedby="account-confirm-text" onCloseAutoFocus={refocus(() => confirmFrom.current)}>
          <div className="account-confirm__head">
            <span className={`account-confirm__icon${confirm === 'delete' ? ' is-risk' : ''}`} aria-hidden="true">
              {confirm === 'delete' ? <Trash2 /> : <Power />}
            </span>
            <DialogTitle asChild>
              <h2>{confirm === 'delete' ? 'Delete account?' : 'Deactivate account?'}</h2>
            </DialogTitle>
            <DialogClose asChild>
              <button className="account-icon-btn" type="button" aria-label="Close" disabled={busy}>
                <X aria-hidden="true" />
              </button>
            </DialogClose>
          </div>
          <p id="account-confirm-text" className="account-confirm__text">
            {confirm === 'delete' ? 'Your account, saves and scores are deleted. This can’t be undone.' : 'You’re logged out. Log in again to reactivate.'}
          </p>
          {confirm === 'delete' ? (
            <label className="account-field">
              <span>Type DELETE</span>
              <input value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" autoFocus />
            </label>
          ) : null}
          {actionError ? <p className="account-error" role="alert">{actionError}</p> : null}
          <div className="account-confirm__actions">
            <button className="account-btn" type="button" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button>
            <button
              className={`account-btn ${confirm === 'delete' ? 'account-btn--risk' : 'account-btn--go'}`}
              type="button"
              disabled={busy || (confirm === 'delete' && typed !== 'DELETE')}
              onClick={() => void finishAction()}
            >
              {confirm === 'delete' ? 'Delete' : 'Deactivate'}
            </button>
          </div>
        </HubDialogContent>
      </HubDialog>
    ) : null}
    </>
  );
}
