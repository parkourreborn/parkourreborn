'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useAuth } from '@/components/auth-provider';
import { createSaveQueue, fetchGameSave, putGameSave } from '@/lib/pages/gamesave';

export type SaveStatus = 'idle' | 'loading' | 'ready' | 'error';

const idOf = (uid: string | undefined) => (uid ? uid.replace(/^discord-/, '') : '');

export function useParkourSave(frameRef: RefObject<HTMLIFrameElement | null>) {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<SaveStatus>('idle');
  const userRef = useRef(user);
  const live = useRef(false);
  const id = useRef('');
  const profile = useRef('');
  const saves = useRef<ReturnType<typeof createSaveQueue> | null>(null);
  const discordId = idOf(user?.uid);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!live.current || id.current === discordId) return;
    saves.current?.stop();
    window.location.reload();
  }, [discordId]);

  const post = useCallback((message: unknown) => {
    frameRef.current?.contentWindow?.postMessage(message, window.location.origin);
  }, [frameRef]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!frameRef.current || event.source !== frameRef.current.contentWindow) return;

      const data = event.data as { type?: string; json?: string } | null;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'parkour-save:request') post({ type: 'parkour-save:profile', json: profile.current });
      if (data.type === 'parkour-save:push' && typeof data.json === 'string') saves.current?.push(data.json);
    };
    const flush = () => saves.current?.flush();
    const onHidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('message', onMessage);
    window.addEventListener('pagehide', flush);
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', onHidden);

    return () => {
      live.current = false;
      flush();
      window.removeEventListener('message', onMessage);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('online', flush);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, [frameRef, post]);

  const start = useCallback(async () => {
    setStatus('loading');
    live.current = true;
    const current = userRef.current;
    id.current = idOf(current?.uid);

    if (!current) {
      profile.current = '';
      setStatus('ready');
      return;
    }

    let key = await current.getIdToken().catch(() => '');
    const cloud = key ? await fetchGameSave(key).catch(() => null) : null;
    if (!live.current || userRef.current?.uid !== current.uid) return;
    if (!cloud) {
      setStatus('error');
      return;
    }

    saves.current = createSaveQueue(cloud, (json, rev, leaving) => {
      if (userRef.current?.uid !== current.uid) return Promise.resolve({ status: 401, rev });
      if (leaving) return putGameSave(key, json, rev);
      return current.getIdToken().then((next) => {
        key = next;
        if (userRef.current?.uid !== current.uid) return { status: 401, rev };
        return putGameSave(key, json, rev);
      });
    }, (reason) => {
      if (!live.current) return;
      post({ type: 'parkour-save:rejected', reason });
      if (reason === 'conflict') setTimeout(() => {
        if (live.current) window.location.reload();
      }, 600);
    });
    profile.current = cloud.json;
    setStatus('ready');
  }, [post]);

  return { status, busy: loading, guest: !loading && !user, start };
}
