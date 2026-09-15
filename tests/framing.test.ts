import test from 'node:test';
import assert from 'node:assert/strict';
import { Quaternion, Vector3 } from 'three/webgpu';
import { framingDistance } from '../src/camera/Framing.ts';
import { DIMENSIONS } from '../src/card/CardDefinition.ts';

test('normal zoom keeps the card inside portrait and landscape frames at arbitrary angles', () => {
  for (const [width, height] of [[390, 844], [844, 390], [1440, 1100], [320, 568]]) {
    const aspect = width / height, tan = Math.tan(Math.PI / 12);
    for (const d of Object.values(DIMENSIONS)) for (let roll = 0; roll < 180; roll += 15) for (let yaw = 0; yaw < 180; yaw += 30) {
      const q = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), roll * Math.PI / 180)
        .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw * Math.PI / 180));
      const distance = framingDistance(d, q, aspect, 30, height);
      for (const x of [-1, 1]) for (const y of [-1, 1]) {
        const p = new Vector3(x * d.width / 2, y * d.height / 2, 0).applyQuaternion(q);
        assert.ok(Math.abs(p.x / ((distance - p.z) * tan * aspect)) <= 0.91);
        assert.ok(Math.abs(p.y / ((distance - p.z) * tan)) <= 0.97);
      }
    }
  }
});
