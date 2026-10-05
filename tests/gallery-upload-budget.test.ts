import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GalleryUploadBudget, GALLERY_UPLOAD_BYTES_PER_FRAME, GALLERY_UPLOAD_MS_PER_FRAME } from '../src/gallery/GalleryUploadBudget.ts';

test('byte budget admits several previews and defers the rest until the next frame', () => {
  const budget = new GalleryUploadBudget(() => 0), bytes = 2765504;
  budget.beginFrame();
  for (let i = 0; i < 3; i++) { assert.equal(budget.allows(bytes), true); budget.record(bytes); }
  assert.equal(budget.allows(bytes), false);
  assert.ok(budget.stats().frameUploadBytes <= GALLERY_UPLOAD_BYTES_PER_FRAME);
  budget.beginFrame(); assert.equal(budget.allows(bytes), true); assert.equal(budget.stats().frameUploads, 0);
});

test('slow uploads stop the burst, with one upload guaranteed in each frame', () => {
  let time = 0; const budget = new GalleryUploadBudget(() => time);
  budget.beginFrame(); time += GALLERY_UPLOAD_MS_PER_FRAME * 2;
  assert.equal(budget.allows(12), true); budget.record(12);
  assert.equal(budget.allows(12), false);
  budget.beginFrame(); assert.equal(budget.allows(12), true);
});
