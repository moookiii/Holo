import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three/webgpu';
import { createCardGeometry } from '../src/card/CardGeometry.ts';
import { DIMENSIONS } from '../src/card/CardDefinition.ts';

test('card is a closed manifold solid of correct physical dimensions', () => {
  for (const dimensions of Object.values(DIMENSIONS)) {
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
