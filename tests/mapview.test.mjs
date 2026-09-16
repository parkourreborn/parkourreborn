import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

test('map dragging survives deferred state updates and never places a guess', () => {
  const state = [2, { x: 0, y: 0 }, { width: 400, height: 400 }, { width: 1000, height: 1000 }, true, false];
  const updates = [];
  const refs = [];
  const guesses = [];
  let index = 0;
  const react = {
    forwardRef: (render) => render,
    useCallback: (callback) => callback,
    useEffect: () => {},
    useImperativeHandle: () => {},
    useMemo: (callback) => callback(),
    useRef: (value) => {
      const ref = { current: value };
      refs.push(ref);
      return ref;
    },
    useState: () => {
      const key = index++;
      return [state[key], (update) => updates.push(() => {
        state[key] = typeof update === 'function' ? update(state[key]) : update;
      })];
    },
  };
  const source = readFileSync(new URL('../src/components/community/mapview.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const output = {};
  runInNewContext(code, { exports: output, require: (name) => name === 'react' ? react : name === 'react/jsx-runtime' ? jsx : {} });
  const canvas = output.MapCanvas({ image: 'map.webp', width: 1000, height: 1000, onChange: (point) => guesses.push(point) });
  refs[1].current = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 400 }) };
  const currentTarget = { setPointerCapture: () => {}, hasPointerCapture: () => true, releasePointerCapture: () => {} };
  const event = (type, x, y) => ({ type, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, currentTarget });
  canvas.props.onPointerDown(event('pointerdown', 100, 100));
  canvas.props.onPointerMove(event('pointermove', 120, 115));
  canvas.props.onPointerMove(event('pointermove', 145, 130));
  while (updates.length) updates.shift()();
  assert.equal(state[1].x, 45);
  assert.equal(state[1].y, 30);
  canvas.props.onPointerUp(event('pointerup', 145, 130));
  assert.equal(guesses.length, 0);
  canvas.props.onPointerDown(event('pointerdown', 100, 100));
  canvas.props.onPointerCancel(event('pointercancel', 100, 100));
  assert.equal(guesses.length, 0);
  canvas.props.onPointerDown(event('pointerdown', 123.456, 200));
  canvas.props.onPointerUp(event('pointerup', 123.456, 200));
  assert.equal(guesses.length, 1);
  assert.equal(guesses[0].x, 123.456 / 400);
  assert.equal(guesses[0].y, 0.5);
});
