export type CloudSave = {
  json: string;
  rev: number;
};

export type PutResult = {
  status: number;
  rev: number;
};

const text = (value: unknown) => (value === undefined || value === null ? '' : JSON.stringify(value));

export async function fetchGameSave(token: string): Promise<CloudSave | null> {
  const response = await fetch('/api/game/save', {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(6000),
  });

  if (!response.ok) return null;

  const data = await response.json() as { save?: unknown; rev?: number };
  return { json: text(data.save), rev: Number(data.rev ?? 0) };
}

export async function putGameSave(token: string, json: string, baseRev: number): Promise<PutResult> {
  const body = `{"save":${json},"baseRev":${baseRev}}`;
  const response = await fetch('/api/game/save', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body,
    keepalive: new TextEncoder().encode(body).length <= 60 * 1024,
    signal: AbortSignal.timeout(10000),
  });

  const data = await response.json().catch(() => null) as { rev?: number } | null;
  const rev = data?.rev;
  if (response.ok && (typeof rev !== 'number' || !Number.isSafeInteger(rev) || rev < 0)) throw new Error('Bad save response');
  return { status: response.status, rev: rev ?? baseRev };
}

export function createSaveQueue(cloud: CloudSave, write: (json: string, rev: number, leaving: boolean) => Promise<PutResult>, reject: (reason: string) => void) {
  let latest = cloud.json;
  let saved = cloud.json;
  let rev = cloud.rev;
  let pending: CloudSave | null = null;
  let invalid = '';
  let sending = false;
  let stopped = false;
  let leaving = false;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const dirty = () => pending || (latest && latest !== saved && latest !== invalid);

  function schedule() {
    if (stopped || sending || timer || !dirty() || failures >= 3) return;
    timer = setTimeout(() => {
      timer = undefined;
      void commit();
    }, 5000);
  }

  async function commit() {
    if (stopped || sending) return;
    if (!dirty()) {
      leaving = false;
      return;
    }
    pending ??= { json: latest, rev };
    sending = true;

    try {
      const result = await write(pending.json, pending.rev, leaving);
      if (stopped) return;
      if (result.status === 200) {
        saved = pending.json;
        rev = result.rev;
        pending = null;
        failures = 0;
      } else if (result.status === 409) {
        stopped = true;
        reject('conflict');
      } else if (result.status === 413 || result.status === 422) {
        invalid = pending.json;
        pending = null;
        failures = 0;
        reject('invalid');
      } else {
        failures += 1;
      }
    } catch {
      failures += 1;
    } finally {
      sending = false;
    }

    if (failures || !dirty()) leaving = false;
    if (leaving && !stopped && dirty()) void commit();
    else schedule();
  }

  return {
    push(json: string) {
      latest = json;
      failures = 0;
      schedule();
    },
    flush() {
      clearTimeout(timer);
      timer = undefined;
      leaving = true;
      failures = 0;
      void commit();
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
    },
  };
}
