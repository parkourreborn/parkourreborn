import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { isDeepStrictEqual } from 'node:util';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';
import { createSaveQueue, putGameSave } from './pages/gamesave.ts';

const save = (balance) => JSON.stringify({ version: 1, credits: { balance }, trials: [] });

function load(file, modules) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  runInThisContext(`(function(require, exports) { ${outputText}\n})`)((name) => {
    assert.ok(name in modules, `Unexpected import: ${name}`);
    return modules[name];
  }, exports);
  return exports;
}

function server() {
  const rows = new Map([['users/discord-123', { discord: { id: '123' }, displayName: 'Player' }]]);
  const writes = [];
  const db = {
    collection: (name) => ({ doc: (id) => ({ path: `${name}/${id}` }) }),
    runTransaction: async (run) => run({
      get: async (ref) => ({ data: () => rows.get(ref.path) }),
      set: (ref, value) => {
        rows.set(ref.path, value);
        writes.push(ref.path);
      },
    }),
  };
  const api = load('./server/game-save.ts', {
    'server-only': {},
    'node:util': { isDeepStrictEqual },
    'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 1 } },
    '@/lib/server/firebase-admin': { getAdminDb: () => db },
  });
  const write = async (json, baseRev) => {
    const result = await api.writeSave({ discordId: '123', name: 'Player', save: JSON.parse(json), baseRev });
    return { status: result.ok ? 200 : 409, rev: result.rev };
  };
  return { rows, writes, write };
}

test('autosave coalesces snapshots and skips unchanged progress', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const calls = [];
  const queue = createSaveQueue({ json: save(0), rev: 4 }, async (json, rev) => {
    calls.push({ json, rev });
    return { status: 200, rev: rev + 1 };
  }, assert.fail);
  t.after(() => queue.stop());
  queue.push(save(1));
  queue.push(save(2));
  t.mock.timers.tick(4999);
  assert.equal(calls.length, 0);
  t.mock.timers.tick(1);
  await setImmediate();
  assert.deepEqual(calls, [{ json: save(2), rev: 4 }]);
  queue.push(save(2));
  queue.flush();
  assert.equal(calls.length, 1);
});

test('navigation and hidden-tab flushes wait for the current save and drain newer progress', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const calls = [];
  const queue = createSaveQueue({ json: '', rev: 0 }, (json, rev, leaving) => new Promise((resolve) => calls.push({ json, rev, leaving, resolve })), assert.fail);
  t.after(() => queue.stop());
  queue.push(save(1));
  t.mock.timers.tick(5000);
  queue.push(save(2));
  queue.flush();
  queue.flush();
  assert.equal(calls.length, 1);
  calls[0].resolve({ status: 200, rev: 1 });
  await setImmediate();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].json, save(2));
  assert.equal(calls[1].rev, 1);
  assert.equal(calls[1].leaving, true);
  calls[1].resolve({ status: 200, rev: 2 });
  await setImmediate();
  queue.push(save(3));
  t.mock.timers.tick(5000);
  assert.equal(calls[2].leaving, false);
  calls[2].resolve({ status: 200, rev: 3 });
  await setImmediate();
});

test('a lost response retries the same snapshot before writing newer progress', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const db = server();
  const calls = [];
  const queue = createSaveQueue({ json: '', rev: 0 }, async (json, rev) => {
    calls.push({ json, rev });
    const result = await db.write(json, rev);
    if (calls.length === 1) throw new Error('Response lost');
    return result;
  }, assert.fail);
  t.after(() => queue.stop());
  queue.push(save(1));
  queue.flush();
  queue.push(save(2));
  await setImmediate();
  t.mock.timers.tick(5000);
  await setImmediate();
  t.mock.timers.tick(5000);
  await setImmediate();
  assert.deepEqual(calls, [{ json: save(1), rev: 0 }, { json: save(1), rev: 0 }, { json: save(2), rev: 1 }]);
  assert.equal(db.rows.get('saves/123').doc.credits.balance, 2);
  assert.equal(db.rows.get('saves/123').rev, 2);
  assert.equal(db.writes.length, 2);
});

test('stale saves from another tab cannot overwrite newer progress', async () => {
  const db = server();
  assert.equal((await db.write(save(1), 0)).status, 200);
  assert.equal((await db.write(save(2), 0)).status, 409);
  assert.equal((await db.write(save(2), null)).status, 409);
  assert.equal(db.rows.get('saves/123').doc.credits.balance, 1);
  db.rows.get('users/discord-123').status = 'deactivated';
  await assert.rejects(db.write(save(1), 0), /Account unavailable/);
});

test('conflicts stop the queue and invalid snapshots wait for new progress', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const status of [409, 413, 422]) {
    let calls = 0;
    const rejected = [];
    const queue = createSaveQueue({ json: '', rev: 0 }, async () => {
      calls += 1;
      return { status, rev: 0 };
    }, (reason) => rejected.push(reason));
    queue.push(save(1));
    queue.flush();
    await setImmediate();
    queue.flush();
    t.mock.timers.tick(10000);
    assert.equal(calls, 1);
    assert.deepEqual(rejected, [status === 409 ? 'conflict' : 'invalid']);
    queue.push(save(2));
    queue.flush();
    await setImmediate();
    assert.equal(calls, status === 409 ? 1 : 2);
    queue.stop();
  }
});

test('temporary failures retry with a limit and can resume when connectivity returns', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  const queue = createSaveQueue({ json: '', rev: 0 }, async () => {
    calls += 1;
    return { status: calls > 3 ? 200 : 503, rev: 1 };
  }, assert.fail);
  t.after(() => queue.stop());
  queue.push(save(1));
  queue.flush();
  for (let i = 0; i < 4; i += 1) {
    await setImmediate();
    t.mock.timers.tick(5000);
  }
  assert.equal(calls, 3);
  queue.flush();
  await setImmediate();
  assert.equal(calls, 4);
});

test('switching accounts stops queued writes even if a request finishes later', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let finish;
  let calls = 0;
  const queue = createSaveQueue({ json: '', rev: 0 }, () => {
    calls += 1;
    return new Promise((resolve) => { finish = resolve; });
  }, assert.fail);
  queue.push(save(1));
  queue.flush();
  queue.push(save(2));
  queue.stop();
  finish({ status: 200, rev: 1 });
  await setImmediate();
  queue.flush();
  t.mock.timers.tick(10000);
  assert.equal(calls, 1);
});

test('save requests use keepalive within its size budget and reject missing acknowledgements', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return Response.json({ rev: 1 });
  });
  await putGameSave('token', save(1), 0);
  await putGameSave('token', JSON.stringify({ version: 1, data: 'x'.repeat(70 * 1024) }), 1);
  assert.equal(calls[0].options.keepalive, true);
  assert.equal(calls[1].options.keepalive, false);
  assert.equal(calls[0].options.headers.authorization, 'Bearer token');
  assert.equal(JSON.parse(calls[0].options.body).baseRev, 0);
  globalThis.fetch.mock.mockImplementation(async () => Response.json({}));
  await assert.rejects(putGameSave('token', save(1), 0), /Bad save response/);
});

test('an explicit bearer token takes precedence over a stale session cookie', async () => {
  const { readSession } = load('./server/session.ts', {
    'server-only': {},
    '@/lib/server/auth': { accountFor: async ({ uid }) => ({ discordId: uid, data: { displayName: uid } }) },
    '@/lib/server/firebase-admin': { getAdminAuth: () => ({
      verifyIdToken: async (token) => {
        if (token === 'expired') throw new Error('Expired');
        return { uid: 'current' };
      },
      verifySessionCookie: async () => ({ uid: 'previous' }),
    }) },
  });
  const request = (token) => ({ headers: new Headers(token ? { authorization: `Bearer ${token}` } : {}), cookies: { get: () => ({ value: 'cookie' }) } });
  assert.equal((await readSession(request('valid'))).uid, 'current');
  assert.equal(await readSession(request('expired')), null);
  assert.equal((await readSession(request())).uid, 'previous');
});
