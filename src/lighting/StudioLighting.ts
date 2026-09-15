import { Scene, Color, DirectionalLight, RectAreaLight, RectAreaLightNode, HemisphereLight, Mesh, PlaneGeometry, MeshBasicNodeMaterial, PMREMGenerator, Vector3, WebGPURenderer, RenderTarget } from 'three/webgpu';
import { areaLightTables } from './AreaLightTables';

export type LightPreset = 'Studio' | 'Strip' | 'Soft' | 'Low key';

export class StudioLighting {
  readonly key = new RectAreaLight(0xfff9ec, 130, 1.5, 2.5);
  readonly strip = new DirectionalLight(0xe7f0ff, 1.4);
  readonly back = new DirectionalLight(0xffffff, 1.1);
  readonly fill = new HemisphereLight(0xffffff, 0x777777, 0.65);
  private environment?: RenderTarget;
  constructor(private scene: Scene) {
    RectAreaLightNode.setLTC(areaLightTables);
    this.key.position.set(-7, 9, 12); this.strip.position.set(9, 1, 8); this.back.position.set(-5, 4, -12);
    this.key.lookAt(0, 0, 0);
    scene.add(this.key, this.strip, this.back, this.fill);
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
    const values = { Studio: [130, 1.4, 0.65, 0.7], Strip: [25, 3.5, 0.4, 0.6], Soft: [9.2, 0.3, 1.2, 1.1], 'Low key': [40, 1.8, 0.16, 0.28] }[preset];
    this.key.width = preset === 'Soft' ? 7 : 1.5; this.key.height = preset === 'Soft' ? 11 : 2.5;
    [this.key.intensity, this.strip.intensity, this.fill.intensity, this.scene.environmentIntensity] = values;
  }
  dispose() { this.environment?.dispose(); }
}
