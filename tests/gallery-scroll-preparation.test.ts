import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GalleryScrollPreparation } from '../src/gallery/GalleryScrollPreparation.ts';

test('first and slow scrolls prepare immediately; a stopped fling resumes within 80 ms', () => {
  const gate = new GalleryScrollPreparation();
  gate.scroll(800, 100); assert.ok(gate.ready(100));
  gate.scroll(1600, 116); assert.equal(gate.ready(116), false);
  gate.scroll(2400, 132); assert.equal(gate.ready(211), false); assert.ok(gate.ready(212));
  gate.scroll(2500, 300); assert.ok(gate.ready(300));
  gate.scroll(2510, 316); assert.ok(gate.ready(316));
  gate.scroll(3000, 332); assert.equal(gate.ready(332), false);
  gate.reset(); assert.ok(gate.ready(332));
});
