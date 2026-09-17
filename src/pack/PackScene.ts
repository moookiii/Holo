import { Group, Vector3, type Scene } from 'three/webgpu';
import type { CardInstance } from '../card/CardInstance';
import type { PackWrapper } from './wrapper/PackWrapper';
import type { PackState } from './PackOpeningState';
import { ease, mix, orientation } from './PackMath';
import { randomSequence } from './PackDefinition';

export interface PackPose {
  state: PackState; intro: number; tear: number; mouth: number; extract: number; settle: number;
  reveal: number; active: number; hit: number; hover: number; selected: number; inspect: number;
  grip: number; tension: number; release: number; pointerX: number; pointerY: number;
}
export class PackScene {
  readonly root = new Group();
  private variations: { x: number; y: number; yaw: number; pitch: number }[];
  private inspectStart?: { position: Vector3; quaternion: ReturnType<typeof orientation> };
  private initialized = false;
  constructor(readonly cards: CardInstance[], readonly wrapper: PackWrapper, scene: Scene, seed: number) {
    const random = randomSequence(seed);
    this.variations = cards.map(() => ({ x: (random() - .5) * .023, y: (random() - .5) * .023, yaw: (random() - .5) * .002, pitch: (random() - .5) * .001 }));
    // The loaded card meshes begin at their factory origin. Keep the opening
    // hidden until update establishes the sealed in-pack pose, avoiding a frame
    // where the full card faces appear over the wrapper during handoff.
    this.root.name = 'Pack opening'; this.root.visible = false;
    this.root.add(wrapper.root, ...cards.map(card => card.mesh)); scene.add(this.root);
  }
  beginInspect(index: number) { const mesh = this.cards[index].mesh; this.inspectStart = { position: mesh.position.clone(), quaternion: mesh.quaternion.clone() }; }
  update(p: PackPose, dt: number, portrait: boolean, reduced: boolean, snap = false) {
    const smoothing = snap || !this.initialized ? 1 : 1 - Math.exp(-dt * (reduced ? 26 : 14));
    const preview = ['RevealCard', 'HitReveal', 'PackSummary', 'Inspect'].includes(p.state);
    const extracted = preview ? 1 : p.settle;
    const packQ = orientation();
    this.wrapper.root.quaternion.slerp(packQ, smoothing);
    const wrapperPosition = new Vector3(0, -p.extract * 4.8, 0).applyQuaternion(packQ);
    wrapperPosition.x -= 7 * extracted; wrapperPosition.y += -extracted * 11 + (1 - ease(p.intro)) * 2;
    this.wrapper.root.position.lerp(wrapperPosition, smoothing);
    this.wrapper.root.visible = extracted < .995;
    this.wrapper.deform({ tear: p.tear, mouth: p.mouth, grip: p.grip, release: p.release, tension: reduced ? 0 : p.tension,
      collapse: ease((p.extract - .8) / .2), pullX: p.pointerX, pullY: p.pointerY });
    const mid = (this.cards.length - 1) / 2;
    this.cards.forEach((card, i) => {
      const mesh = card.mesh, variation = this.variations[i];
      const position = new Vector3(variation.x + i * .006 * extracted, -.12 + variation.y - i * .006 * extracted, (mid - i) * .046);
      let q = packQ.clone().multiply(orientation(Math.PI + variation.yaw, variation.pitch));
      position.applyQuaternion(packQ);
      position.applyQuaternion(orientation().slerp(orientation(-.42, -.12, -.025), extracted));
      position.add(new Vector3(0, p.extract * 7.4 * (1 - extracted), 0).applyQuaternion(packQ));
      position.y += (1 - ease(p.intro)) * 2;
      position.z -= extracted * 2.4;
      if (extracted > 0) {
        q.slerp(orientation(Math.PI - .42 + variation.yaw, .12 + variation.pitch, -.025), extracted);
      }
      if (preview) {
        if (i < p.active) {
          position.set(-18 + i * .06, -1.8 + i * .035, -2.4 - i * .042); q = orientation(-.25, .03, .12 - i * .02);
        } else if (i === p.active) {
          const r = ease(p.reveal);
          position.y += r * .28 + Math.sin(r * Math.PI) * .65;
          // Lift toward the lens before turning: the far edge clears every
          // lower card throughout the 180-degree reveal, including edge-on.
          position.z += r * 3.55 + Math.sin(r * Math.PI) * 3.6;
          q = orientation(mix(Math.PI - .42, -.15, r), mix(.12, .035, r), mix(-.025, 0, r));
          if (p.state === 'HitReveal') {
            q = orientation(reduced ? -.12 : mix(-.24, .035, ease(p.hit)), .025, 0);
            position.set(0, .14, 1.15);
          }
        }
      }
      if (p.state === 'PackSummary' || p.state === 'Inspect') {
        const d = i - mid;
        position.set(d * (portrait ? .78 : 3.35), portrait ? -d * 1.7 : -.28 * d * d, i * .45);
        // Give the spread a subtle backward lean so the cards read as a
        // physical fan rather than five flat panels facing the camera.
        q = orientation(d * .035, -.16, -d * (portrait ? .055 : .085));
        if (p.hover === i) { position.y += portrait ? .35 : .85; position.z += 3; q = orientation(-.1, .02); }
        if (p.state === 'Inspect') {
          if (i === p.selected && this.inspectStart) {
            position.copy(this.inspectStart.position).lerp(new Vector3(), ease(p.inspect));
            q.copy(this.inspectStart.quaternion).slerp(orientation(-.10, .025), ease(p.inspect));
          } else { position.x += Math.sign(d || 1) * ease(p.inspect) * 22; position.z -= ease(p.inspect) * 5; }
        }
      }
      // A newly exposed card stays a physical card below the leading card.
      mesh.position.lerp(position, smoothing); mesh.quaternion.slerp(q, smoothing);
      // Cards are fully enclosed before extraction. Keeping them out of renderer
      // traversal lets their pipelines compile asynchronously during the tactile
      // wrapper sequence instead of blocking entry to the pack.
      mesh.visible = p.extract > .001 || preview;
    });
    this.root.updateMatrixWorld(true);
    this.initialized = true; this.root.visible = true;
  }
  take(index: number) { const card = this.cards[index]; card.mesh.removeFromParent(); return card; }
  dispose(except?: CardInstance) { this.root.removeFromParent(); this.wrapper.dispose(); this.cards.forEach(card => { if (card !== except) card.dispose(); }); }
}
