import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, MeshPhysicalMaterial, Raycaster, Vector3 } from 'three/webgpu';
import { buildBird } from '../src/artifacts/RoboticBird.ts';
import { artifacts } from '../src/artifacts/registry.ts';
import { shellDepth } from '../src/artifacts/bird/BirdEnvelope.ts';

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

test('populated boards, drive train and harness remain inside the assembled shell', () => {
  const bird = buildBird();
  bird.root.updateMatrixWorld(true);
  const point = new Vector3();
  try {
    for (const id of ['boards', 'boards-back', 'boards-core', 'mechanics', 'wires', 'wires-back']) {
      bird.groups.get(id)!.traverse(object => {
        if (!(object instanceof Mesh)) return;
        const positions = object.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
          assert.ok(Math.abs(point.z) <= shellDepth(point.x, point.y, .015) + .001,
            `${id} protrudes through the shell at ${point.toArray()}`);
        }
      });
    }
  } finally { bird.dispose(); }
});

test('lower head has acrylic cheeks and a closed chin behind the beak', () => {
  const bird = buildBird();
  bird.root.updateMatrixWorld(true);
  const panels: Mesh[] = [];
  bird.groups.get('head')!.traverse(object => {
    if (object instanceof Mesh && object.material instanceof MeshPhysicalMaterial) panels.push(object);
  });
  const ray = new Raycaster();
  try {
    for (const [x, y] of [[1.83, 1.30], [2.1, 1.40], [2.28, 1.43]]) {
      for (const sign of [-1, 1]) {
        ray.set(new Vector3(x, y, sign * 3), new Vector3(0, 0, -sign));
        const hits = ray.intersectObjects(panels, false);
        assert.ok(hits.length && sign * hits[0].point.z > .03, `Missing cheek at ${x}, ${y}, ${sign}`);
      }
      ray.set(new Vector3(x, -1, 0), new Vector3(0, 1, 0));
      const hits = ray.intersectObjects(panels, false);
      assert.ok(hits.length && hits[0].point.y < y, `Missing underside at ${x}`);
    }
  } finally { bird.dispose(); }
});
