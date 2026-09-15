import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeGratingAxis } from '../src/materials/patterns/Orientation.ts';

test('filtering opposite grating directions preserves their common physical axis', () => {
  for (let degrees = -180; degrees <= 180; degrees++) {
    const angle = degrees * Math.PI / 180;
    const a = encodeGratingAxis(angle), b = encodeGratingAxis(angle + Math.PI);
    const x = (a[0] + b[0]) / 255 - 1, y = (a[1] + b[1]) / 255 - 1;
    const filteredAngle = Math.atan2(y, x) * .5;
    assert.ok(Math.hypot(x, y) > .999999, 'equivalent axes must not cancel in a mipmap');
    assert.ok(Math.abs(Math.cos(filteredAngle - angle)) > .999999, 'filtered orientation must remain physically equivalent');
  }
});
