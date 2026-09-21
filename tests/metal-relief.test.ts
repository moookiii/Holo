import test from 'node:test';
import assert from 'node:assert/strict';
import { createMetalReliefGeometry, sampleHeight } from '../src/card/MetalReliefGeometry.ts';
import { mintedGold } from '../src/materials/profiles/metal.ts';

test('metal height samples use top-origin images and bilinear registered UVs', () => {
  const f = { width: 2, height: 2, data: [0, 255, 128, 64] };
  assert.equal(sampleHeight(f, .25, .75), 0);
  assert.equal(sampleHeight(f, .75, .75), 1);
  assert.equal(sampleHeight(f, .25, .25), 128/255);
  assert.ok(Math.abs(sampleHeight(f, .5, .5) - 447/1020) < 1e-10);
});

test('cast collectible is closed, has two independently displaced faces and an outward edge', () => {
  const d = { width: 4.445, height: 6.985, thickness: .3, cornerRadius: .22, bevel: .045 };
  const front = { width: 2, height: 2, data: [255,255,255,255] }, back = { ...front, data: [128,128,128,128] };
  const g = createMetalReliefGeometry(d, front, back, .045, .03, 24);
  assert.ok(Math.abs(g.boundingBox!.max.z - (.15+.045)) < 1e-6);
  assert.ok(Math.abs(g.boundingBox!.min.z + (.15+.03*128/255)) < 1e-6);
  const p = g.getAttribute('position'), index = g.getIndex()!, edges = new Map<string, number>();
  const key = (i: number) => [p.getX(i),p.getY(i),p.getZ(i)].map(n => n.toFixed(5)).join(',');
  for (let i = 0; i < index.count; i += 3) {
    const tri = [0,1,2].map(j => key(index.getX(i+j)));
    for (let j = 0; j < 3; j++) { const k = [tri[j],tri[(j+1)%3]].sort().join('|'); edges.set(k,(edges.get(k)??0)+1); }
  }
  assert.ok([...edges.values()].every(n => n === 2), 'closed manifold including face/bevel seams');
  assert.deepEqual(g.groups.map(g => g.materialIndex), [0,1,2]);
  assert.ok([...g.getAttribute('normal').array].every(Number.isFinite));
  g.dispose();
});

test('minted gold uses a pure conductor with no prismatic, sparkle or film energy', () => {
  assert.equal(mintedGold.metallicInk?.metalness, 1);
  assert.equal(mintedGold.diffraction.strength, 0);
  assert.equal(mintedGold.glints.strength, 0);
  assert.equal(mintedGold.surface.iridescence, 0);
  assert.equal(mintedGold.surface.laminate, 0);
  assert.equal(mintedGold.structure.field, 'plain');
});
