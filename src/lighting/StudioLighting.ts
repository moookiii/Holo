import { Scene, Color, DirectionalLight, SpotLight, RectAreaLight, RectAreaLightNode, HemisphereLight, Mesh, PlaneGeometry, MeshBasicNodeMaterial, PMREMGenerator, Vector3, WebGPURenderer, RenderTarget } from 'three/webgpu';
import { inspection } from './inspection';
import { areaLightTables } from './AreaLightTables';

export const lightPresets = ['Studio', 'Strip', 'Soft', 'Low key', 'Moving light', 'Blacklight', 'Skim', 'Holo skim', 'Spotlight', 'Ring light', 'Polarizer'] as const;
export type LightPreset = typeof lightPresets[number];

export class StudioLighting {
  readonly key = new RectAreaLight(0xfff9ec, 130, 1.5, 2.5);
  readonly strip = new DirectionalLight(0xe7f0ff, 1.4);
  readonly back = new DirectionalLight(0xffffff, 1.1);
  readonly fill = new HemisphereLight(0xffffff, 0x777777, 0.65);
  readonly spot = new SpotLight(0xfff5e6, 0, 0, .16, .65, 2);
  // Six tangent area emitters form a continuous annulus around the viewing axis.
  // Their zero intensity outside Ring light keeps the lighting graph stable.
  readonly ring = Array.from({ length: 6 }, () => new RectAreaLight(0xfffaf0, 0, 2.25, .7));
  preset: LightPreset = 'Studio';
  azimuth = -30;
  elevation = 35;
  intensity = 1;
  speed = 1;
  filterAngle = 0;
  playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  private phase = 0;
  private applied = '';
  private environment?: RenderTarget;
  constructor(private scene: Scene) {
    RectAreaLightNode.setLTC(areaLightTables);
    this.key.position.set(-7, 9, 12); this.strip.position.set(9, 1, 8); this.back.position.set(-5, 4, -12);
    this.key.lookAt(0, 0, 0);
    this.spot.position.set(0, 2, 12);
    scene.add(this.key, this.strip, this.back, this.fill, this.spot, this.spot.target);
    this.spot.visible = false;
    this.ring.forEach((segment, index) => {
      const angle = index * Math.PI / 3;
      segment.position.set(Math.cos(angle) * 2.15, Math.sin(angle) * 2.15, 13);
      segment.lookAt(0, 0, 0);
      segment.rotateZ(angle + Math.PI / 2);
      segment.visible = false;
      scene.add(segment);
    });
  }
  async createEnvironment(renderer: WebGPURenderer) {
    const studio = new Scene(); studio.background = new Color(0.045, 0.045, 0.045);
    const geometry = new PlaneGeometry(1, 1);
    const panels: Mesh[] = [];
    const addPanel = (position: number[], size: number[], radiance: number) => {
      const material = new MeshBasicNodeMaterial({ color: new Color(radiance, radiance, radiance) });
      const mesh = new Mesh(geometry, material);
      mesh.position.fromArray(position); mesh.scale.set(size[0], size[1], 1); mesh.lookAt(new Vector3());
      studio.add(mesh); panels.push(mesh);
    };
    addPanel([-8, 8, 12], [7, 11], 5);
    addPanel([9, 0, 9], [1.8, 15], 6.5);
    addPanel([0, 12, 1], [12, 3], 3.5);
    addPanel([-5, 4, -12], [6, 10], 3.8);
    addPanel([9, -3, -9], [2, 12], 3);
    const pmrem = new PMREMGenerator(renderer);
    this.environment = pmrem.fromScene(studio, 0, 0.1, 100, { size: 256 });
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.7;
    pmrem.dispose(); geometry.dispose(); panels.forEach(p => (p.material as MeshBasicNodeMaterial).dispose());
  }
  setPreset(preset: LightPreset) {
    this.preset = preset; this.phase = 0; this.applied = '';
    // Center the gallery sweep so its highlight reaches both outer card columns.
    // Skim keeps its lower, offset grazing angle for the single-card viewer.
    this.azimuth = preset === 'Moving light' ? 0 : preset === 'Skim' ? -15 : -30;
    this.elevation = preset === 'Skim' ? 8 : 35;
    this.update(0);
  }
  update(dt: number) {
    const p = this.preset;
    const animated = p === 'Moving light' || p === 'Skim' || p === 'Holo skim';
    if (this.playing) this.phase += Math.min(Math.max(dt, 0), .05) * this.speed * (animated ? 1.25 : 1);
    const signature = [p, this.azimuth, this.elevation, this.intensity, this.filterAngle].join(':');
    if (signature === this.applied && !animated) return;
    this.applied = signature;
    const values = { Studio: [130, 1.4, .65, .7], Strip: [25, 3.5, .4, .6], Soft: [9.2, .3, 1.2, 1.1], 'Low key': [40, 1.8, .16, .28] };
    const base = values[p as keyof typeof values] ?? values.Studio;
    [this.key.intensity, this.strip.intensity, this.fill.intensity, this.scene.environmentIntensity] = base;
    this.key.color.set(p === 'Blacklight' ? 0x7026ff : 0xfff9ec);
    this.strip.color.set(p === 'Blacklight' ? 0x4422ff : 0xe7f0ff);
    this.key.width = p === 'Soft' ? 7 : p === 'Skim' ? .3 : 1.5;
    this.key.height = p === 'Soft' ? 11 : p === 'Skim' ? 8 : 2.5;
    this.key.position.set(-7, 9, 12); this.strip.position.set(9, 1, 8);
    this.back.intensity = 1.1;
    // Keep the light list stable: intensity is a uniform, visibility rebuilds card pipelines.
    // Smooth reversals without lingering at the dim ends of any animated sweep.
    const sweepMotion = Math.asin(.97 * Math.sin(this.phase * .65)) / Math.asin(.97);
    if (p === 'Moving light' || p === 'Skim' || p === 'Spotlight') {
      // A rounded triangle spends less time at the sweep's dim endpoints than a sine.
      // Keep both sweeping sources in front, including after position adjustments.
      const sweepCenter = Math.max(-55, Math.min(55, this.azimuth));
      const sweepSpan = Math.min(50, 70 - Math.abs(sweepCenter));
      const angle = (p === 'Moving light' || p === 'Skim' ? sweepCenter + sweepMotion * sweepSpan : this.azimuth) * Math.PI / 180;
      const elevation = this.elevation * Math.PI / 180;
      if (p === 'Skim') {
        // Orbit outside the card at constant distance. Compressing only Z brings
        // the tall emitter through the card and creates a pointed near-field flare.
        const radius = 16;
        this.key.position.set(Math.sin(angle) * Math.cos(elevation) * radius,
          Math.sin(elevation) * radius, Math.cos(angle) * Math.cos(elevation) * radius);
      } else {
        this.key.position.set(Math.sin(angle) * 14, Math.sin(elevation) * 14, Math.cos(angle) * Math.cos(elevation) * 14);
      }
      this.strip.intensity = .15;
      this.spot.position.copy(this.key.position);
    }
    if (p === 'Moving light') {
      this.key.width = 1.8; this.key.height = 3;
      this.strip.intensity = .7; this.fill.intensity = .85; this.scene.environmentIntensity = .75;
    }
    if (p === 'Skim') { this.key.intensity = 95; this.strip.intensity = .5; this.fill.intensity = .55; this.scene.environmentIntensity = .42; }
    if (p === 'Blacklight') { this.key.intensity = 90; this.strip.intensity = 2; this.fill.intensity = .08; this.scene.environmentIntensity = .08; this.back.intensity = .1; }
    if (p === 'Spotlight') { this.key.intensity = 0; this.strip.intensity = 0; this.fill.intensity = .12; this.scene.environmentIntensity = .12; }
    if (p === 'Ring light') { this.key.intensity = 0; this.strip.intensity = 0; this.fill.intensity = .38; this.scene.environmentIntensity = .32; }
    this.key.lookAt(0, 0, 0);
    this.key.intensity *= this.intensity; this.strip.intensity *= this.intensity;
    this.fill.intensity *= this.intensity; this.back.intensity *= this.intensity;
    this.scene.environmentIntensity *= this.intensity; this.spot.intensity = p === 'Spotlight' ? 650 * this.intensity : 0;
    this.spot.visible = p === 'Spotlight';
    this.ring.forEach(segment => { segment.visible = p === 'Ring light'; segment.intensity = p === 'Ring light' ? 14 * this.intensity : 0; });
    inspection.holoSweep.value = p === 'Holo skim' ? 1 : 0;
    inspection.sweepDirection.value.set(sweepMotion * .75, .12, .45).normalize();
    inspection.polarizer.value = p === 'Polarizer' ? .15 + .85 * Math.cos(this.filterAngle * Math.PI / 180) ** 2 : 1;
  }
  dispose() { this.environment?.dispose(); }
}
