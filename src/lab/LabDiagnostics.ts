import { vec3, vec4, normalWorld, texture } from 'three/tsl';
import type { Node } from 'three/webgpu';
import type { HolographicMaterial } from '../materials/HolographicMaterial';
import type { AssetManager } from '../assets/AssetManager';
export const diagnosticOptions: Array<[string, string]> = [ ['final','Final material'], ['print','Print only'], ['foil','Primary foil coverage'], ['secondary','Secondary foil coverage'], ['metal','Metallic coverage'], ['stamp','Stamp coverage'], ['laminate','Laminate coverage'], ['height','Authored height'], ['roughness','Authored roughness'], ['normal','Authored normals'], ['normals','Shaded normals'], ['direction','Primary direction field'], ['pattern','Pattern channels'], ['hologram','Image / depth data'] ];
export class LabDiagnostics {
  private applied = '';
  private previous?: HolographicMaterial;
  private sequence = 0;
  mode = 'final';
  constructor(private material: () => HolographicMaterial, private assets: AssetManager, private report: (message: string) => void) {}
  async refresh() {
    const m = this.material(), mode = this.mode, sequence = ++this.sequence;
    if (m === this.previous && this.applied === mode) return;
    try {
      let node: Node | null = null;
      const gray = (n: Node<'float'>) => vec4(vec3(n), 1);
      const views: Record<string, () => Node> = {
        print: () => vec4(m.printTextureNode.rgb,1), foil: () => gray(m.coverageTextureNode.r), secondary: () => gray(m.coverageTextureNode.g), metal: () => gray(m.coverageTextureNode.b),
        stamp: () => gray(m.surfaceTextureNode.a.mul(m.surfaceControls.hasStamp)), laminate: () => gray(m.coverageTextureNode.a), height: () => gray(m.surfaceTextureNode.r), roughness: () => gray(m.surfaceTextureNode.g),
        normal: () => vec4(m.normalTextureNode.rgb,1), normals: () => vec4(((m.normalNode ?? normalWorld) as Node<'vec3'>).mul(.5).add(.5),1), direction: () => vec4(m.fieldTextureNode.rgb,1), pattern: () => vec4(m.patternTextureNode.rgb,1), hologram: () => vec4(m.hologramTextureNode.rgb,1),
      };
      if (mode.startsWith('map:')) { const t = await this.assets.load(mode.slice(4), false); node = vec4(texture(t).rgb, 1); }
      else if (mode !== 'final') node = views[mode]?.() ?? null;
      if (sequence !== this.sequence || this.material() !== m) return;
      m.outputNode = node; m.needsUpdate = true; this.previous = m; this.applied = mode;
    } catch (error) { this.report(`Map preview failed: ${error instanceof Error ? error.message : error}`); }
  }
  dispose() { ++this.sequence; const m = this.material(); m.outputNode = null; m.needsUpdate = true; }
}
