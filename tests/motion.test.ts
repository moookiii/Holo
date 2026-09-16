import test from 'node:test';
import assert from 'node:assert/strict';
import { Quaternion, Vector3 } from 'three/webgpu';
import { CardMotion, Y_AXIS, Z_AXIS } from '../src/input/Motion.ts';

const closeOrientation = (a: Quaternion, b: Quaternion, epsilon = 1e-6) => assert.ok(a.angleTo(b) < epsilon, `orientation differs by ${a.angleTo(b)} radians`);
const advance = (motion: CardMotion, seconds: number, hz = 120) => { for (let i = 0; i < Math.round(seconds * hz); i++) motion.update(1 / hz); };

test('combined interaction starts face-on and resets a tilted, rotated or flipped card to the front', () => {
  {
    const motion = new CardMotion();
    closeOrientation(motion.orientation, new Quaternion());
    advance(motion, .5); closeOrientation(motion.orientation, new Quaternion());
    motion.setPose(.8, -.4, .7); motion.setHover(.8, -.6);
    motion.requestFlip(); advance(motion, 1);
    motion.reset(); advance(motion, .8);
    closeOrientation(motion.orientation, new Quaternion());
    advance(motion, 1); closeOrientation(motion.orientation, new Quaternion());
  }
});

test('physical flip preserves arbitrary manual orientation across 100 flips', () => {
  const motion = new CardMotion(); motion.setPose(0.4, -0.3, 0.6);
  const manual = motion.manual.clone();
  for (let i = 0; i < 100; i++) {
    motion.requestFlip(); advance(motion, 0.7);
    const expected = manual.clone().multiply(new Quaternion().setFromAxisAngle(Y_AXIS, ((i + 1) % 2) * Math.PI));
    closeOrientation(motion.orientation, expected); closeOrientation(motion.manual, manual);
    assert.ok(Math.abs(motion.orientation.length() - 1) < 1e-12);
  }
});

test('flip moves through intermediate orientations and remains stable when queued', () => {
  const motion = new CardMotion(); motion.setPose(0, 0, 0);
  motion.requestFlip(); advance(motion, 0.29);
  const mid = motion.orientation.angleTo(new Quaternion());
  assert.ok(mid > 1.45 && mid < 1.7);
  motion.requestFlip(); motion.requestFlip(); motion.requestFlip(); advance(motion, 2.4);
  closeOrientation(motion.orientation, new Quaternion());
});

test('inertia has matching displacement at 60 and 240 Hz', () => {
  const slow = new CardMotion(), fast = new CardMotion();
  slow.setMode('rotate'); fast.setMode('rotate');
  slow.setPose(0, 0, 0); fast.setPose(0, 0, 0);
  slow.velocity.set(1.2, -2.1, .7); fast.velocity.copy(slow.velocity);
  advance(slow, 1, 60); advance(fast, 1, 240);
  closeOrientation(slow.orientation, fast.orientation, 1e-6);
  assert.ok(slow.velocity.distanceTo(fast.velocity) < 1e-9);
});

test('arbitrary small rotations stay normalized and zoom converges', () => {
  const motion = new CardMotion(); motion.dragging = true;
  motion.setMode('rotate');
  const step = new Quaternion().setFromAxisAngle(new Vector3(.4, .7, .3).normalize(), .00008);
  for (let i = 0; i < 20000; i++) motion.applyRotation(step, 1 / 240);
  assert.ok(Math.abs(motion.manual.length() - 1) < 1e-12);
  motion.targetZoom = 0.65; advance(motion, 2);
  assert.ok(Math.abs(motion.zoom - 0.65) < 1e-9);
});

test('combined interaction supports drag roll while preserving pointer-follow tilt', () => {
  const motion = new CardMotion(); motion.setPose(.4, -.3); motion.dragging = true;
  const initial = motion.manual.clone(), roll = new Quaternion().setFromAxisAngle(Z_AXIS, .7);
  motion.applyRotation(roll, .016); advance(motion, .1);
  closeOrientation(motion.manual, initial.premultiply(roll));
  const rotated = motion.manual.clone(); motion.setHover(.8, -.6); advance(motion, .1);
  closeOrientation(motion.manual, rotated);
  assert.ok(motion.hover.length() > 0, 'pointer-follow tilt remains active alongside manual rotation');
});

test('mouse-follow roll is bounded, smooth and separate from manual orientation', () => {
  const motion = new CardMotion(); motion.setPose(.3, -.2);
  const initial = motion.manual.clone(); motion.setHover(10, -10); motion.update(1 / 120);
  assert.ok(Math.abs(motion.hover.z) > 0 && Math.abs(motion.hover.z) < .065);
  advance(motion, 1); assert.ok(Math.abs(motion.hover.z) <= .065);
  assert.ok(motion.hover.y > .23 && motion.hover.x < -.19, 'stronger tilt remains bounded');
  closeOrientation(motion.manual, initial);
  motion.setHover(0, 0); advance(motion, 1.4);
  closeOrientation(motion.orientation, initial);
});

test('Tilt moves the edge in the mouse direction away from the viewer', () => {
  const motion = new CardMotion(); motion.setPose(0, 0);
  motion.setHover(1, 0); advance(motion, 1.4);
  assert.ok(new Vector3(1, 0, 0).applyQuaternion(motion.orientation).z < -.23, 'right edge recedes for a rightward pointer');
  motion.setHover(-1, 0); advance(motion, 1.4);
  assert.ok(new Vector3(-1, 0, 0).applyQuaternion(motion.orientation).z < -.23, 'left edge recedes for a leftward pointer');
  motion.setHover(0, 1); advance(motion, 1.4);
  assert.ok(new Vector3(0, -1, 0).applyQuaternion(motion.orientation).z < -.19, 'bottom edge recedes for a downward pointer');
  motion.setHover(0, -1); advance(motion, 1.4);
  assert.ok(new Vector3(0, 1, 0).applyQuaternion(motion.orientation).z < -.19, 'top edge recedes for an upward pointer');
});

test('interrupting reset with a drag or flip continues from the visible pose', () => {
  const motion = new CardMotion(); motion.setMode('rotate'); motion.setPose(1.1, -.4, .5);
  motion.reset(); advance(motion, .25);
  const visible = motion.orientation.clone(); motion.dragging = true; motion.halt();
  motion.applyRotation(new Quaternion(), 0); motion.update(0);
  closeOrientation(motion.orientation, visible);
  motion.reset(); advance(motion, .25);
  const visibleAgain = motion.orientation.clone(); motion.requestFlip(); motion.update(0);
  closeOrientation(motion.orientation, visibleAgain);
});
