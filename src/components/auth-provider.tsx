'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { browserLocalPersistence, onAuthStateChanged, setPersistence, signInWithCustomToken, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { getClientAuth, hasFirebaseConfig } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { DialogTitle } from '@/components/ui/dialog';
import { HubDialog, HubDialogContent } from '@/components/ui/hub-dialog';
import type { DiscordProfile } from '@/lib/discord';
import type { AccountMeta } from '@/lib/pages/account';

type AuthContextValue = {
  user: User | null;
  discord: DiscordProfile | null;
  account: AccountMeta | null;
  loading: boolean;
  busy: boolean;
  error: string;
  updateName: (name: string) => Promise<void>;
  deactivate: () => Promise<void>;
  deleteAccount: (confirm: string) => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const authMessage = (error: unknown) => {
  if (typeof error !== 'object' || !error || !('code' in error)) return 'Auth failed. Try again.';

  const code = String(error.code);
  if (code === 'auth/unauthorized-domain') return 'This domain is not allowed in Firebase Auth yet.';
  if (code === 'auth/operation-not-allowed') return 'Firebase login is not enabled yet.';
  if (code === 'auth/network-request-failed') return 'Network issue. Try again in a bit.';
  return 'Discord login failed. Check Firebase and Discord setup.';
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [discord, setDiscord] = useState<DiscordProfile | null>(null);
  const [account, setAccount] = useState<AccountMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reactivationPending, setReactivationPending] = useState(false);

  const clearAccount = useCallback(() => {
    setUser(null);
    setDiscord(null);
    setAccount(null);
  }, []);

  const accountCall = async (method: 'PATCH' | 'POST' | 'DELETE', body: object) => {
    const current = getClientAuth().currentUser;
    if (!current) throw new Error('Log in again.');
    const token = await current.getIdToken();
    const response = await fetch('/api/account', {
      method,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({})) as { error?: string; name?: string; nameChangedAt?: number };
    if (!response.ok) throw new Error(data.error || 'Could not update your account.');
    return data;
  };

  const loadDiscord = useCallback(async (nextUser: User) => {
    const token = await nextUser.getIdToken();
    await fetch('/api/auth/session', { method: 'POST', headers: { authorization: `Bearer ${token}` } }).catch(() => {});

    const response = await fetch('/api/auth/me', {
      headers: { authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
      await signOut(getClientAuth());
      clearAccount();
      return;
    }
    if (!response.ok) throw new Error('Could not load Discord profile');
    const data = await response.json() as { discord: DiscordProfile | null; account: AccountMeta | null };
    setDiscord(data.discord);
    setAccount(data.account);
  }, [clearAccount]);

  useEffect(() => {
    if (!hasFirebaseConfig) {
      setLoading(false);
      setError('Firebase env is missing.');
      return;
    }

    const auth = getClientAuth();
    let active = true;
    let stop = () => {};

    const watchAuth = () => {
      stop = onAuthStateChanged(auth, async (nextUser) => {
        try {
          if (nextUser?.isAnonymous) {
            await signOut(auth);
            clearAccount();
            return;
          }

          setUser(nextUser);

          if (nextUser) await loadDiscord(nextUser);
          else {
            clearAccount();
          }
        } catch (nextError) {
          setError(authMessage(nextError));
        } finally {
          setLoading(false);
        }
      }, (nextError) => {
        setError(authMessage(nextError));
        setLoading(false);
      });
    };

    const boot = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);

        const response = await fetch('/api/auth/discord/session', { method: 'POST' });
        if (response.ok) {
          const data = await response.json() as { token: string | null; reactivate?: boolean };
          if (data.reactivate) {
            await signOut(auth);
            setReactivationPending(true);
          } else if (data.token) await signInWithCustomToken(auth, data.token);
        }
      } catch (nextError) {
        setError(authMessage(nextError));
      } finally {
        if (active) watchAuth();
      }
    };

    boot();

    return () => {
      active = false;
      stop();
    };
  }, [clearAccount, loadDiscord]);

  const login = async () => {
    if (!hasFirebaseConfig) {
      setError('Firebase env is missing.');
      return;
    }

    const auth = getClientAuth();
    setBusy(true);
    setError('');

    try {
      await setPersistence(auth, browserLocalPersistence);
      const response = await fetch('/api/auth/discord/start', { method: 'POST' });

      if (!response.ok) throw new Error('Could not start Discord login');

      const data = await response.json() as { url: string };
      window.location.href = data.url;
    } catch (nextError) {
      setError(authMessage(nextError));
      setBusy(false);
    }
  };

  const logout = async () => {
    if (!hasFirebaseConfig) return;

    const current = getClientAuth().currentUser;
    if (!current) {
      await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
      clearAccount();
      return;
    }

    setBusy(true);
    setError('');

    try {
      await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
      await signOut(getClientAuth());
      clearAccount();
    } catch (nextError) {
      setError(authMessage(nextError));
    } finally {
      setBusy(false);
    }
  };

  const updateName = async (name: string) => {
    setBusy(true);
    try {
      const data = await accountCall('PATCH', { displayName: name });
      setAccount((current) => current ? { ...current, displayName: data.name ?? current.displayName, nameChangedAt: data.nameChangedAt ?? current.nameChangedAt } : current);
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async () => {
    setBusy(true);
    try {
      await accountCall('POST', { action: 'deactivate' });
      await signOut(getClientAuth()).catch(() => {});
      clearAccount();
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async (confirm: string) => {
    setBusy(true);
    try {
      await accountCall('DELETE', { confirm });
      await signOut(getClientAuth()).catch(() => {});
      clearAccount();
    } finally {
      setBusy(false);
    }
  };

  const cancelReactivation = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/auth/discord/session', { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not cancel. Try again.');
      setReactivationPending(false);
      setError('');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not cancel. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const reactivate = async () => {
    setBusy(true);
    setError('');
    let issued = false;
    try {
      const response = await fetch('/api/auth/discord/session', { method: 'PUT' });
      const data = await response.json() as { token?: string; error?: string };
      if (!response.ok || !data.token) throw new Error(data.error || 'Could not reactivate your account.');
      issued = true;
      await signInWithCustomToken(getClientAuth(), data.token);
      setReactivationPending(false);
    } catch (nextError) {
      if (issued) setReactivationPending(false);
      setError(issued ? 'Could not finish login. Log in with Discord again.' : nextError instanceof Error ? nextError.message : 'Could not reactivate your account.');
    } finally {
      setBusy(false);
    }
  };

  const value: AuthContextValue = {
    user,
    discord,
    account,
    loading,
    busy,
    error,
    updateName,
    deactivate,
    deleteAccount,
    login,
    logout,
    clearError: () => setError(''),
  };

  return <AuthContext.Provider value={value}>
    {children}
    {reactivationPending ? (
      <HubDialog onOpenChange={(next) => { if (!next && !busy) void cancelReactivation(); }}>
        <HubDialogContent className="account-dialog account-confirm" aria-describedby={undefined}>
          <header className="account-head"><div className="account-head__title"><DialogTitle asChild><h2>Reactivate account</h2></DialogTitle></div></header>
          <div className="account-confirm__body">
            {error ? <p className="account-error">{error}</p> : null}
            <div className="account-confirm__actions">
              <Button className="account-action" type="button" disabled={busy} onClick={() => void cancelReactivation()}>Cancel</Button>
              <Button className="account-action account-action--go" type="button" disabled={busy} onClick={() => void reactivate()}>Reactivate</Button>
            </div>
          </div>
        </HubDialogContent>
      </HubDialog>
    ) : null}
  </AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
