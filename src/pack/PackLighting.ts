import type { Scene } from 'three/webgpu';
import type { StudioLighting } from '../lighting/StudioLighting';
import { mix } from './PackMath';

/** Choreographs the existing studio emitters. No alternate card shader or
 * screen-space highlight is introduced for a signature reveal. */
export class PackLighting {
  private saved;
  constructor(private lighting: StudioLighting, private scene: Scene) {
    this.saved = { key: lighting.key.intensity, strip: lighting.strip.intensity, fill: lighting.fill.intensity,
      environment: scene.environmentIntensity, stripPosition: lighting.strip.position.clone(), keyPosition: lighting.key.position.clone(),
      width: lighting.key.width, height: lighting.key.height };
  }
  update(hit: number, sweep: number, restore = 0) {
    const l = this.lighting;
    l.key.intensity = mix(mix(100, 76, hit), this.saved.key, restore);
    l.fill.intensity = mix(mix(.54, .24, hit), this.saved.fill, restore);
    l.strip.intensity = mix(mix(1.6, 2.3, hit), this.saved.strip, restore);
    this.scene.environmentIntensity = mix(mix(.64, .45, hit), this.saved.environment, restore);
    l.strip.position.set(mix(9, -7, hit * sweep), mix(1, 3, hit), 8).lerp(this.saved.stripPosition, restore);
    l.key.width = mix(2.4, this.saved.width, restore); l.key.height = mix(5.5, this.saved.height, restore);
  }
  restore() {
    const l = this.lighting, s = this.saved;
    l.key.intensity = s.key; l.strip.intensity = s.strip; l.fill.intensity = s.fill; this.scene.environmentIntensity = s.environment;
    l.key.width = s.width; l.key.height = s.height; l.strip.position.copy(s.stripPosition); l.key.position.copy(s.keyPosition);
  }
}
