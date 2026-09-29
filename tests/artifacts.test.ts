import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, MeshPhysicalMaterial } from 'three/webgpu';
import { buildBird } from '../src/artifacts/RoboticBird.ts';
import { artifacts } from '../src/artifacts/registry.ts';

test('bird fulfills registry assembly contract and batches repeated components', () => {
  const bird = buildBird();
  assert.deepEqual([...bird.groups.keys()].sort(), artifacts[0].explodedGroups.map(g => g.id).sort());
  let meshes = 0;
  bird.root.traverse(object => { if (object instanceof Mesh) meshes++; });
  assert.ok(meshes < 150, `Expected batched geometry across sixteen assemblies, got ${meshes} meshes`);
  assert.ok(bird.root.userData.geometryStats.triangles < 700_000);
  bird.dispose();
});

test('inspection restores shell and disposal releases every rendered resource', () => {
  const bird = buildBird();
  const shells: Mesh[] = [], resources = new Set<{ addEventListener: Function }>();
  bird.root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    resources.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      resources.add(material);
      if (material instanceof MeshPhysicalMaterial) shells.push(object);
    }
  });
  assert.ok(shells.length > 5);
  bird.inspect('hidden'); assert.ok(shells.every(shell => !shell.visible));
  bird.inspect('frosted'); assert.ok(shells.every(shell => shell.visible));
  bird.inspect('clear'); assert.ok(shells.every(shell => shell.visible));
  let disposed = 0;
  for (const resource of resources) resource.addEventListener('dispose', () => disposed++);
  bird.dispose(); assert.equal(disposed, resources.size);
});
