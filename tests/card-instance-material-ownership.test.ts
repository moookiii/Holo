import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BufferGeometry, Material } from 'three/webgpu';
import { CardInstance } from '../src/card/CardInstance.ts';
import type { CardDefinition } from '../src/card/CardDefinition.ts';

test('disposing a card releases its faces without invalidating a domain-owned shared edge', () => {
  const geometry = new BufferGeometry(), edge = new Material();
  const faces = Array.from({ length: 4 }, () => new Material());
  const disposed = new Map<Material, number>();
  for (const material of [...faces, edge]) material.addEventListener('dispose', () => disposed.set(material, (disposed.get(material) ?? 0) + 1));
  let releases = 0;
  const card = (id: string, owned: Material[]) => new CardInstance({ id } as CardDefinition,
    geometry, [...owned, edge], () => releases++, owned);
  const first = card('first', faces.slice(0, 2)), second = card('second', faces.slice(2));
  first.dispose(); first.dispose();
  assert.equal(releases, 1);
  assert.equal(disposed.get(edge), undefined);
  assert.equal(second.disposed, false);
  assert.deepEqual(faces.map(face => disposed.get(face) ?? 0), [1, 1, 0, 0]);
  second.dispose();
  assert.equal(releases, 2);
  assert.equal(disposed.get(edge), undefined);
  edge.dispose(); geometry.dispose();
  assert.equal(disposed.get(edge), 1);
});

test('ordinary card instances still dispose every material exactly once', () => {
  const geometry = new BufferGeometry(), materials = [new Material(), new Material(), new Material()];
  let disposals = 0, releases = 0;
  materials.forEach(material => material.addEventListener('dispose', () => disposals++));
  const card = new CardInstance({ id: 'owned' } as CardDefinition, geometry, materials, () => releases++);
  card.dispose(); card.dispose();
  assert.equal(disposals, 3);
  assert.equal(releases, 1);
  geometry.dispose();
});
