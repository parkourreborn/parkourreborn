import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import { guessrDifficulties, guessrModes } from './guessr.ts';

function setup() {
  let reads = 0;
  let fail = false;
  const rows = Array.from({ length: 5 }, (_, index) => ({
    id: String(index), imageUrl: 'https://example.com/image.jpg', mode: 'classic', difficulty: 'normal',
    status: 'published', coordinates: { x: 0.5, y: 0.5 }, mapVersionId: 'map-a',
  }));
  const maps = [{ id: 'map-a', imageUrl: 'https://example.com/map.jpg', width: '5688', height: '4800', active: true }];
  const db = {
    collection: (name) => {
      const filters = [];
      let limit = Infinity;
      const query = {
        where: (field, operator, value) => {
          assert.equal(operator, '==');
          filters.push([field, value]);
          return query;
        },
        limit: (count) => { limit = count; return query; },
        get: async () => {
          reads += 1;
          if (fail) throw new Error('Unavailable');
          const docs = (name === 'guessrMaps' ? maps : rows)
            .filter((row) => filters.every(([field, value]) => row[field] === value))
            .slice(0, limit).map((row) => ({ id: row.id, data: () => row }));
          return { docs, empty: docs.length === 0, size: docs.length };
        },
      };
      return query;
    },
  };
  const modules = {
    'server-only': {},
    zod: { z },
    '@/lib/guessr': { guessrDifficulties, guessrModes },
    '@/lib/server/firebase-admin': { getAdminDb: () => db },
  };
  const source = readFileSync(new URL('./server/guessr.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const api = {};
  runInThisContext(`(function(require, exports) { ${outputText}\n})`)((name) => {
    assert.ok(name in modules, `Unexpected import: ${name}`);
    return modules[name];
  }, api);
  return { api, rows, maps, reads: () => reads, fail: (value) => { fail = value; } };
}

test('availability shares reads, validates images and expires after 30 seconds', async (t) => {
  t.mock.timers.enable({ apis: ['Date'] });
  const db = setup();
  db.rows.push({ ...db.rows[0], id: 'invalid', coordinates: { x: 2, y: 0 } });
  const first = db.api.getGuessrAvailability('map-a');
  assert.equal(db.api.getGuessrAvailability('map-a'), first);
  const choices = await first;
  assert.equal(db.reads(), 4);
  assert.deepEqual(choices[0], { mode: 'classic', difficulty: 'normal', count: 5, available: true });
  assert.ok(choices.slice(1).every((item) => !item.available && item.count === 0));
  db.rows[0].status = 'disabled';
  assert.equal((await db.api.getPublishedGuessrImages('map-a', 'classic', 'normal')).length, 4);
  assert.equal((await db.api.getGuessrAvailability('map-a'))[0].count, 5);
  t.mock.timers.tick(30001);
  assert.equal((await db.api.getGuessrAvailability('map-a'))[0].available, false);
  assert.equal(db.reads(), 9);
});

test('availability is scoped to the map and failed reads are retried', async () => {
  const db = setup();
  await db.api.getGuessrAvailability('map-a');
  assert.ok((await db.api.getGuessrAvailability('map-b')).every((item) => item.count === 0));
  assert.equal(db.reads(), 8);
  db.fail(true);
  await assert.rejects(db.api.getGuessrAvailability('map-a'), /Unavailable/);
  db.fail(false);
  assert.equal((await db.api.getGuessrAvailability('map-a'))[0].count, 5);
  assert.equal(db.reads(), 16);
});

test('active map checks remain fresh and reject missing or multiple maps', async () => {
  const db = setup();
  assert.equal((await db.api.getActiveGuessrMap()).width, 5688);
  db.maps.push({ ...db.maps[0], id: 'map-b' });
  await assert.rejects(db.api.getActiveGuessrMap(), /being updated/);
  db.maps.splice(0);
  await assert.rejects(db.api.getActiveGuessrMap(), /unavailable/);
});
