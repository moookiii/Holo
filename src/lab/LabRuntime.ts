import type { CardDefinition } from '../card/CardDefinition';
import type { CardFactory } from '../card/CardFactory';
import type { HolographicProfile } from '../materials/HolographicProfile';
import type { HolographicMaterial, ProfileFields } from '../materials/HolographicMaterial';
import type { Mechanism, Region } from './LayerCatalog';

export type Isolation = 'none' | 'optical' | 'neutral' | 'spectral' | 'sparkle' | 'physical' | 'relief' | 'varnish' | 'laminate' | 'selected' | 'bypass';
export class LabRuntime {
  isolation: Isolation = 'none';
  region: Region = 'primary';
  mechanism: Mechanism = 'diffraction';
  private fields: ProfileFields = {};
  private fieldKey = '';
  private mapKey = '';
  private material?: HolographicMaterial;
  private request = 0;
  private timer?: number;
  private mapOwner?: string;
  private latest?: HolographicProfile;
  private running = false;
  private disposed = false;
  constructor(private factory: CardFactory, private getMaterial: () => HolographicMaterial, private getCard: () => CardDefinition, private status: (message: string) => void, private refreshed: () => void) {}
  apply(profile: HolographicProfile, immediate = false) {
    this.latest = structuredClone(profile); ++this.request;
    const material = this.getMaterial();
    if (material !== this.material) { this.material = material; this.fieldKey = ''; this.mapKey = ''; this.fields = {}; }
    // Never briefly replace an untouched card's manufacturing field with a neutral one.
    if (this.fieldKey) { material.setProfile(profile, this.fields); this.inspect(material); }
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.prepare(), immediate ? 0 : 160);
  }
  private async prepare() {
    if (this.running || this.disposed || !this.latest) return;
    this.running = true;
    const request = this.request, profile = this.latest, card = this.getCard(), material = this.getMaterial();
    let owner: string | undefined;
    try {
      const fieldKey = JSON.stringify([card.id, ...[profile, profile.secondary, profile.stamp].map(p => p && [p.structure.field, p.structure.scale, p.structure.motif]), profile.maps?.motif, profile.maps?.secondaryMotif, profile.maps?.stampMotif]);
      const mapKey = JSON.stringify([card.id, profile.maps, profile.watermark]);
      if (fieldKey !== this.fieldKey || mapKey !== this.mapKey) {
        this.status('Preparing material…');
        const fields = fieldKey === this.fieldKey ? this.fields : await this.factory.prepareProfile(profile, { ...card, maps: { ...card.maps, ...profile.maps } });
        const image = material.printTextureNode.value.image as HTMLImageElement;
        // Edited maps have an explicit temporary owner, released after the material stops using them.
        owner = profile.maps ? `lab-maps-${request}` : undefined;
        const maps = mapKey === this.mapKey ? undefined : await this.factory.maps.load({ ...card, id: owner ?? card.id, maps: { ...card.maps, ...profile.maps } }, image.width / image.height, profile.watermark === 'quarter-century');
        if (this.disposed || request !== this.request || material !== this.getMaterial()) { if (owner) this.factory.maps.release(owner); return; }
        if (maps) { material.setMaps(maps); if (this.mapOwner && this.mapOwner !== owner) this.factory.maps.release(this.mapOwner); this.mapOwner = owner; }
        this.fields = fields; this.fieldKey = fieldKey; this.mapKey = mapKey;
      }
      material.setProfile(profile, this.fields); this.inspect(material); this.refreshed(); this.status('Live · shared optical renderer');
    } catch (error) { if (owner && owner !== this.mapOwner) this.factory.maps.release(owner); this.status(`Could not apply: ${error instanceof Error ? error.message : error}`); }
    finally { this.running = false; if (!this.disposed && request !== this.request) void this.prepare(); }
  }
  private inspect(material: HolographicMaterial) {
    const mode = this.isolation;
    if (mode === 'none') return;
    const optics = [material.optics, material.secondaryOptics, material.stampOptics];
    const index = ['primary', 'secondary', 'stamp'].indexOf(this.region);
    if (mode === 'selected' || mode === 'bypass') {
      if (mode === 'selected') optics.forEach((u, i) => { if (i !== index) u.enabled.value = 0; });
      const target = optics[index];
      const selected = this.mechanism;
      const keep = (name: Mechanism) => mode === 'selected' ? name === selected : name !== selected;
      if (!keep('diffraction')) target.strength.value = 0;
      if (!keep('sparkle')) target.glintStrength.value = 0;
      if (!keep('image')) target.imageHologram.value = 0;
      if (!keep('reflection')) { target.neutralGain.value = 0; target.foilReflectance.value = target.sheen.value = 0; }
      if (!keep('relief')) target.relief.value = target.patternRelief.value = target.facetTilt.value = 0;
      if (!keep('varnish')) target.varnishRelief.value = target.frameVarnish.value = 0;
      if (!keep('laminate')) target.laminate.value = 0;
      if (!keep('film')) target.iridescence.value = target.pearlBody.value = 0;
      return;
    }
    const optical = ['optical', 'spectral', 'sparkle'].includes(mode);
    material.physicalGain.value = optical ? 0 : 1;
    for (const u of optics) {
      u.spectralGain.value = ['optical', 'spectral'].includes(mode) ? 1 : 0;
      u.sparkleGain.value = ['optical', 'sparkle'].includes(mode) ? 1 : 0;
      u.neutralGain.value = ['optical', 'neutral'].includes(mode) ? 1 : 0;
      if (mode !== 'neutral' && !optical) u.foilReflectance.value = u.sheen.value = 0;
      if (['relief', 'varnish', 'laminate'].includes(mode)) {
        u.iridescence.value = u.pearlBody.value = 0;
        if (mode !== 'relief') u.relief.value = u.patternRelief.value = u.facetTilt.value = 0;
        if (mode !== 'varnish') u.varnishRelief.value = u.frameVarnish.value = 0;
        if (mode === 'relief') u.laminate.value = 0;
      }
    }
    if (mode === 'varnish' || mode === 'laminate') { material.surfaceControls.normalScale.value = 0; material.surfaceControls.embossStrength.value = 0; material.surfaceControls.embossOverride.value = 1; }
  }
  dispose() { this.disposed = true; ++this.request; clearTimeout(this.timer); if (this.mapOwner) this.factory.maps.release(this.mapOwner); }
}
