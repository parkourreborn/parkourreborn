'use client';

import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
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

function SignedOut({ label }: { label: string }) {
  const { busy, error, login } = useAuth();

  return (
    <div className="account-empty">
      <span>{label}</span>
      {error ? <span className="account-error">{error}</span> : null}
      <Button className="account-action account-action--go" type="button" disabled={busy} onClick={login}>
        Log in with Discord
      </Button>
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
  const { account, discord, loading, busy, error, logout, updateName, deactivate, deleteAccount } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirm, setConfirm] = useState<'deactivate' | 'delete' | null>(null);
  const [typed, setTyped] = useState('');
  const [actionError, setActionError] = useState('');
  const name = account?.displayName || discord?.globalName || discord?.username || 'Discord user';
  const avatar = discord ? discordAvatar(discord) : '';

  const saveName = async () => {
    setActionError('');
    try {
      await updateName(draft);
      setEditing(false);
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Could not update your name.');
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
        aria-label="Account"
        onInteractOutside={(event) => {
          if (insideMenu(event.detail.originalEvent.target)) event.preventDefault();
        }}
      >
        <header className="account-head">
          <div className="account-head__title">
            <DialogTitle asChild>
              <h2>Account</h2>
            </DialogTitle>
          </div>
          <DialogClose asChild>
            <Button className="account-close" type="button" aria-label="Close account">
              <span aria-hidden="true">&times;</span>
            </Button>
          </DialogClose>
        </header>

        <Tabs className="account-body" defaultValue="account">
          <TabsList className="account-tabs" aria-label="Account sections">
            <TabsTrigger value="account">Profile</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent className="account-panel" value="account" aria-busy={loading || busy}>
            {loading ? <ScreenReaderLoading>Checking login...</ScreenReaderLoading> : null}
            {busy ? <ScreenReaderLoading>Updating account...</ScreenReaderLoading> : null}
            {loading ? <AccountSkeleton /> : null}

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
                        <Button type="button" disabled={busy} onClick={() => { setEditing(false); setActionError(''); }}>Cancel</Button>
                        <Button type="submit" disabled={busy || !draft.trim()}>Save</Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <span><strong>{name}</strong><small>@{discord.username}</small></span>
                      <Button className="account-edit" type="button" aria-label="Change display name" onClick={() => { setDraft(name); setActionError(''); setEditing(true); }}>
                        <Pencil className="size-3.5" aria-hidden="true" />
                        <span aria-hidden="true">Edit</span>
                      </Button>
                    </>
                  )}
                </div>

                {editing && actionError ? <span className="account-error">{actionError}</span> : null}

                <div className="account-group">
                  <span className="account-group__label">Details</span>
                  <dl className="account-facts">
                    <div>
                      <dt>Account created</dt>
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
                </div>

                {error ? <span className="account-error">{error}</span> : null}

                <div className="account-actions">
                  <Button className="account-action account-action--go" type="button" disabled={busy} onClick={logout}>
                    Log out
                  </Button>
                  <Button className="account-action" type="button" disabled={busy} onClick={() => { setConfirm('deactivate'); setActionError(''); }}>
                    Deactivate
                  </Button>
                  <Button className="account-action account-action--risk" type="button" disabled={busy} onClick={() => { setConfirm('delete'); setTyped(''); setActionError(''); }}>
                    Delete account
                  </Button>
                </div>
              </>
            ) : null}

            {!loading && !discord ? <SignedOut label="Not logged in" /> : null}
          </TabsContent>

          <TabsContent className="account-panel" value="stats">
            {loading ? <AccountSkeleton /> : null}
            {!loading && discord ? <Stats /> : null}
            {!loading && !discord ? <SignedOut label="Log in to see your saved progress" /> : null}
          </TabsContent>
        </Tabs>
      </HubDialogContent>
    </HubDialog>
    {confirm ? (
      <HubDialog onOpenChange={(next) => { if (!next && !busy) setConfirm(null); }}>
        <HubDialogContent className="account-dialog account-confirm" aria-describedby="account-confirm-text">
          <header className="account-head"><div className="account-head__title"><DialogTitle asChild><h2>{confirm === 'delete' ? 'Delete account' : 'Deactivate account'}</h2></DialogTitle></div></header>
          <div className="account-confirm__body">
            {confirm === 'deactivate' ? (
              <p id="account-confirm-text">Are you sure you want to deactivate your account? You’ll be logged out. Log in with Discord to reactivate it later.</p>
            ) : (
              <div id="account-confirm-text" className="account-confirm__copy">
                <p>This is permanent and starts instantly. Your account, saves, and scores will be deleted. If you’re unsure, deactivate instead.</p>
                <p>Admin content and uploads stay with “Deleted account” attribution. Provider backups and logs follow their retention schedules.</p>
                <label htmlFor="account-delete-confirm">Type DELETE to confirm</label>
                <input id="account-delete-confirm" value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" autoFocus />
              </div>
            )}
            {actionError ? <p className="account-error">{actionError}</p> : null}
            <div className="account-confirm__actions">
              <Button className="account-action" type="button" disabled={busy} onClick={() => setConfirm(null)}>No</Button>
              <Button className={`account-action ${confirm === 'delete' ? 'account-action--risk' : 'account-action--go'}`} type="button" disabled={busy || (confirm === 'delete' && typed !== 'DELETE')} onClick={() => void finishAction()}>
                {confirm === 'delete' ? 'Yes, delete' : 'Yes, deactivate'}
              </Button>
            </div>
          </div>
        </HubDialogContent>
      </HubDialog>
    ) : null}
    </>
  );
}
