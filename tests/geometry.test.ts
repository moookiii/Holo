import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three/webgpu';
import { createCardGeometry } from '../src/card/CardGeometry.ts';
import { DIMENSIONS } from '../src/card/CardDefinition.ts';
import { ALPHA_DIMENSIONS } from '../src/magic/materials.ts';
import { createGalleryCardGeometry, galleryGeometryDimensions } from '../src/gallery/GalleryGeometry.ts';

test('card is a closed manifold solid of correct physical dimensions', () => {
  for (const dimensions of [...Object.values(DIMENSIONS), ALPHA_DIMENSIONS]) {
    const geometry = createCardGeometry(dimensions);
    const size = geometry.boundingBox!.getSize(new Vector3());
    assert.ok(Math.abs(size.x - dimensions.width) < 1e-5);
    assert.ok(Math.abs(size.y - dimensions.height) < 1e-5);
    assert.ok(Math.abs(size.z - dimensions.thickness) < 1e-7);
    assert.equal(geometry.groups.length, 3);
    const positions = geometry.getAttribute('position');
    const index = geometry.getIndex()!;
    const edges = new Map<string, number>();
    const key = (i: number) => [positions.getX(i), positions.getY(i), positions.getZ(i)].map(v => v.toFixed(5)).join(',');
    for (let i = 0; i < index.count; i += 3) {
      const triangle = [key(index.getX(i)), key(index.getX(i + 1)), key(index.getX(i + 2))];
      for (let j = 0; j < 3; j++) {
        const edge = [triangle[j], triangle[(j + 1) % 3]].sort().join('|');
        edges.set(edge, (edges.get(edge) || 0) + 1);
      }
    }
    assert.ok([...edges.values()].every(count => count === 2), 'every welded edge belongs to exactly two triangles');
    geometry.dispose();
  }
});

test('Alpha corners clear the scan background and retain their circular cut in gallery placement', () => {
  const d = ALPHA_DIMENSIONS;
  const geometry = createCardGeometry(d);
  const gallery = createGalleryCardGeometry(galleryGeometryDimensions(d));
  const face = geometry.getAttribute('position'), preview = gallery.getAttribute('position');
  // At 45 degrees the former 3.2 mm radius lay in the white scan corner.
  const corner = 1 + 10;
  const insetX = (d.width / 2 - face.getX(corner)) / d.width * 672;
  const insetY = (d.height / 2 - face.getY(corner)) / d.height * 936;
  assert.ok(insetX > 12 && insetY > 12, 'diagonal cut remains inside the black scan border');
  for (let i = 0; i < face.count; i++) {
    assert.ok(Math.abs(preview.getX(i) * d.width - face.getX(i)) < 1e-6);
    assert.ok(Math.abs(preview.getY(i) * d.height - face.getY(i)) < 1e-6);
    assert.ok(Math.abs(preview.getZ(i) * d.height - face.getZ(i)) < 1e-7);
  }
  geometry.dispose(); gallery.dispose();
});
