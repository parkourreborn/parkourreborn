// Stale-while-revalidate memory cache. A fresh value is returned as is; a
// stale one is still returned right away while a refresh runs in the
// background; only a missing (or very old) value makes the caller wait.
// Failed refreshes keep the last good value, so a flaky upstream does not
// turn into errors for users.

type Entry<T> = { at: number; value: T };

export function swrCache<T>({ freshMs, maxStaleMs, maxEntries = 500 }: { freshMs: number; maxStaleMs: number; maxEntries?: number }) {
  const entries = new Map<string, Entry<T>>();
  const inflight = new Map<string, Promise<T>>();

  function refresh(key: string, load: () => Promise<T>) {
    const running = inflight.get(key);
    if (running) return running;
    const promise = load()
      .then((value) => {
        entries.delete(key);
        entries.set(key, { at: Date.now(), value });
        // Oldest first in a Map, so the front is what to drop.
        while (entries.size > maxEntries) entries.delete(entries.keys().next().value as string);
        return value;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, promise);
    return promise;
  }

  return {
    async get(key: string, load: () => Promise<T>): Promise<{ value: T; at: number }> {
      const entry = entries.get(key);
      const age = entry ? Date.now() - entry.at : Infinity;
      if (entry && age < freshMs) return entry;
      if (entry && age < maxStaleMs) {
        refresh(key, load).catch(() => {});
        return entry;
      }
      const value = await refresh(key, load);
      return { value, at: entries.get(key)?.at ?? Date.now() };
    },
    peek(key: string) {
      return entries.get(key) ?? null;
    },
    clear() {
      entries.clear();
    },
  };
}
