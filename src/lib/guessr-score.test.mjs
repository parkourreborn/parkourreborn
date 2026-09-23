import assert from 'node:assert/strict';
import test from 'node:test';
import { metersPerStud, scoreGuess } from './guessr-score.ts';

test('Guessr distances and scoring', () => {
  const target = { x: 0, y: 0 };
  const at = (meters) => scoreGuess({ x: meters * 4756 / 1722.3 / 5688, y: 0 }, target, 5688, 4800);

  assert.equal(at(0).score, 500);
  assert.equal(at(1).score, 500);
  assert.ok(at(1.1).score < 500);
  assert.ok(at(100).score < 500 && at(100).score > 0);
  assert.equal(at(750).score, 0);
  assert.equal(at(1000).score, 0);
  assert.ok(Math.abs(at(1722.3).distance - 1722.3) < 0.01);
  assert.ok(Math.abs(at(1722.3).distance / metersPerStud - 6150.9) < 0.2);
});
