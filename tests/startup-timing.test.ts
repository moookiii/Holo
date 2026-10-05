import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureStartupPipelines, startupFrameReadiness, startupMark, startupTiming } from '../src/rendering/LoadTiming.ts';

test('an active blank gallery, incomplete viewport and failed cards cannot report all visible frames', () => {
  assert.deepEqual(startupFrameReadiness({ visible: 0, visibleExpected: 18, visibleFailed: 0 }, true),
    { firstCardDrawn: false, galleryAllVisibleDrawn: false });
  assert.equal(startupFrameReadiness({ visible: 17, visibleExpected: 18, visibleFailed: 0 }, false).galleryAllVisibleDrawn, false);
  assert.equal(startupFrameReadiness({ visible: 18, visibleExpected: 18, visibleFailed: 1 }, false).galleryAllVisibleDrawn, false);
  assert.equal(startupFrameReadiness({ visible: 18, visibleExpected: 18, visibleFailed: 0 }, false).galleryAllVisibleDrawn, true);
  assert.deepEqual(startupFrameReadiness(undefined, true), { firstCardDrawn: true, galleryAllVisibleDrawn: false });
});

test('first viewer readiness does not suppress later gallery milestones or compilation capture', () => {
  for (const name of Object.keys(startupTiming)) delete startupTiming[name];
  assert.equal(captureStartupPipelines(), true);
  startupMark('firstCardInteractive');
  assert.equal(captureStartupPipelines(), false);
  startupMark('galleryUIAvailable');
  assert.ok(startupTiming.galleryUIAvailable !== undefined);
  assert.equal(captureStartupPipelines(), true);
  startupMark('galleryFirstCardSubmitted');
  assert.equal(captureStartupPipelines(), true);
  startupMark('galleryAllVisiblePresented');
  assert.equal(captureStartupPipelines(), false);
  const recorded = startupTiming.galleryAllVisiblePresented;
  startupMark('galleryAllVisiblePresented'); assert.equal(startupTiming.galleryAllVisiblePresented, recorded);
});
