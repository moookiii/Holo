import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gallerySkimLightY } from '../src/gallery/GallerySkim.ts';

test('gallery Skim reflection runs from viewport top to bottom at every sweep depth and size', () => {
  for (const [height, top, bottom] of [[1100, 230, 1100], [720, 360, 720], [2160, 150, 2160]]) {
    for (const lightZ of [5.4, 10, 15.8]) {
      const cameraZ = 24, fov = 35;
      const scale = 2 * cameraZ * Math.tan(fov * Math.PI / 360) / height;
      let previous = -Infinity;
      for (const elevation of [-10, 5, 20, 42.5, 65, 80, 100]) {
        const lightY = gallerySkimLightY(elevation, top, bottom, height, cameraZ, fov, lightZ);
        const reflectedY = lightY * cameraZ / (cameraZ + lightZ);
        const row = height / 2 - reflectedY / scale;
        assert.ok(row >= top - 1e-9 && row <= bottom + 1e-9);
        assert.ok(row >= previous - 1e-9);
        if (elevation <= 5) assert.ok(Math.abs(row - top) < 1e-9);
        if (elevation >= 80) assert.ok(Math.abs(row - bottom) < 1e-9);
        if (elevation === 42.5) assert.ok(Math.abs(row - (top + bottom) / 2) < 1e-9);
        previous = row;
      }
    }
  }
});
