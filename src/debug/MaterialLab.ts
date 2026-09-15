import { vec3, vec4, uv, normalWorld, tangentView, bitangentView, mix, output } from 'three/tsl';
import type { Node, WebGPURenderer } from 'three/webgpu';
import type { HolographicMaterial } from '../materials/HolographicMaterial';
import type { StudioLighting } from '../lighting/StudioLighting';
import type { CardMotion } from '../input/Motion';
import { radialStructure, gratingDirection } from '../materials/layers/PatternLayer';

interface LabContext { material: () => HolographicMaterial; renderer: WebGPURenderer; lighting: StudioLighting; motion: CardMotion; }

/** A separate development surface, reachable only with ?lab=1. */
export function createMaterialLab(context: LabContext) {
  const panel = document.createElement('aside'); panel.className = 'material-lab'; panel.setAttribute('aria-label', 'Material lab');
  panel.innerHTML = '<h1>Material lab</h1><div class="lab-tools"></div><div class="lab-fields"></div>';
  document.body.append(panel);
  const fields = panel.querySelector('.lab-fields')!;
  const tools = panel.querySelector('.lab-tools')!;
  const layer = document.createElement('select'); layer.setAttribute('aria-label', 'Optical layer');
  layer.add(new Option('Artwork foil', 'primary')); layer.add(new Option('Secondary foil', 'secondary')); layer.add(new Option('Stamp foil', 'stamp')); tools.append(layer);
  const u = () => layer.value === 'stamp' ? context.material().stampOptics : layer.value === 'secondary' ? context.material().secondaryOptics : context.material().optics;
  const field = () => layer.value === 'stamp' ? context.material().stampFieldTextureNode : layer.value === 'secondary' ? context.material().secondaryFieldTextureNode : context.material().fieldTextureNode;
  const relief = () => layer.value === 'stamp' ? context.material().stampReliefTextureNode : layer.value === 'secondary' ? context.material().secondaryReliefTextureNode : context.material().reliefTextureNode;
  const bindings: Array<() => void> = [];
  const slider = (name: string, min: number, max: number, step: number, current: () => number, set: (n: number) => void) => {
    const label = document.createElement('label');
    const text = document.createElement('span'); text.textContent = name;
    const value = document.createElement('output'); value.textContent = current().toFixed(2);
    const input = document.createElement('input'); input.type = 'range'; input.min = String(min); input.max = String(max); input.step = String(step); input.value = String(current());
    input.oninput = () => { const n = Number(input.value); set(n); value.textContent = n.toFixed(2); };
    bindings.push(() => { if (document.activeElement !== input) { input.value = String(current()); value.textContent = current().toFixed(2); } });
    label.append(text, value, input); fields.append(label);
  };
  for (const [name, key, min, max, step] of [
    ['Foil strength', 'strength', 0, 3, .01], ['Grating period · µm', 'period', .5, 3.2, .01],
    ['Spectral bandwidth', 'bandwidth', .009, .15, .001], ['Secondary order', 'secondary', 0, .7, .01],
    ['Angular width', 'crossWidth', .07, .7, .01], ['Direction', 'angle', -3.14, 3.14, .01],
    ['Crossing grating', 'crossing', 0, .5, .01],
    ['Engraving', 'engraving', 0, 1, .01], ['Line density', 'scale', 20, 500, 1], ['Emboss', 'relief', 0, .8, .01],
    ['Glint density', 'density', 0, .8, .01], ['Glint scale', 'glintScale', 40, 800, 1], ['Glint sharpness', 'sharpness', 30, 900, 1],
    ['Glint intensity', 'glintStrength', 0, 40, .1], ['Facet spread', 'spread', .1, 1, .01],
    ['Metalness', 'metalness', 0, 1, .01], ['Foil roughness', 'roughness', .08, .7, .01],
    ['Laminate', 'laminate', 0, 1, .01], ['Laminate roughness', 'laminateRoughness', .06, .5, .01],
    ['Pattern facet slope', 'facetTilt', 0, 1.5, .01], ['Anisotropy', 'anisotropy', 0, 1, .01],
    ['Silver backing', 'foilReflectance', 0, 1, .01],
    ['Pattern emboss', 'patternRelief', 0, 1.5, .01], ['Normal filtering', 'normalVariance', 0, 1, .01],
    ['Pearl interference', 'iridescence', 0, 1, .01], ['Film IOR', 'filmIOR', 1, 2.5, .01], ['Film minimum · nm', 'filmMin', 0, 2000, 5], ['Film maximum · nm', 'filmMax', 0, 2000, 5],
    ['Pearl body', 'pearlBody', 0, .5, .01],
    ['Substrate darkening', 'substrateDarkening', 0, 1, .01],
    ['Raised varnish', 'varnishRelief', 0, 2, .01],
    ['Image hologram', 'imageHologram', 0, 1, .01], ['Virtual depth · cm', 'imageDepth', 0, .5, .005],
    ['Image contrast', 'imageContrast', .1, 4, .01], ['Image angular width', 'imageWidth', .04, 1, .01],
  ] as const) slider(name, min, max, step, () => u()[key].value, n => { u()[key].value = n; });
  slider('Exposure', .3, 2, .01, () => context.renderer.toneMappingExposure, n => { context.renderer.toneMappingExposure = n; });
  slider('Key light', 0, 180, .5, () => context.lighting.key.intensity, n => { context.lighting.key.intensity = n; });
  slider('Strip light', 0, 6, .05, () => context.lighting.strip.intensity, n => { context.lighting.strip.intensity = n; });
  slider('Key azimuth', -180, 180, 1, () => -30, n => { context.lighting.key.position.set(Math.sin(n * Math.PI / 180) * 14, 9, Math.cos(n * Math.PI / 180) * 14); context.lighting.key.lookAt(0, 0, 0); });
  const mode = document.createElement('select'); mode.setAttribute('aria-label', 'Debug visualization');
  const views: Record<string, () => Node> = {
    Final: () => output,
    UV: () => vec4(uv(), 0, 1),
    Normals: () => vec4(normalWorld.mul(.5).add(.5), 1),
    Tangent: () => vec4(tangentView.mul(.5).add(.5), 1),
    Bitangent: () => vec4((bitangentView as unknown as Node<'vec3'>).mul(.5).add(.5), 1),
    'Foil coverage': () => vec4(vec3(context.material().coverageTextureNode.r), 1),
    'Secondary coverage': () => vec4(vec3(context.material().coverageTextureNode.g), 1),
    'Metallic ink': () => vec4(vec3(context.material().coverageTextureNode.b), 1),
    'Stamp coverage': () => vec4(vec3(context.material().surfaceTextureNode.a.mul(context.material().surfaceControls.hasStamp)), 1),
    'Roughness map': () => vec4(vec3(context.material().surfaceTextureNode.g), 1),
    'Imported normal': () => vec4(context.material().normalTextureNode.rgb, 1),
    'Image hologram data': () => vec4(context.material().hologramTextureNode.rgb, 1),
    'Pattern masks': () => vec4(context.material().patternTextureNode.rgb, 1),
    Emboss: () => vec4(vec3(context.material().surfaceTextureNode.r), 1),
    Direction: () => vec4(mix(radialStructure(u().scale, u().angle, u().aspect).direction, gratingDirection(field().rg, u().angle), u().fieldBlend).mul(.5).add(.5), 0, 1),
    Engraving: () => vec4(vec3(mix(radialStructure(u().scale, u().angle, u().aspect).engraving, relief().a, u().fieldBlend)), 1),
    'Pattern relief': () => vec4(relief().rgb, 1),
    'Pattern coverage': () => vec4(vec3(field().a), 1),
    Print: () => vec4(context.material().printTextureNode.rgb, 1),
  };
  Object.keys(views).forEach(name => mode.add(new Option(name, name)));
  mode.onchange = () => { const material = context.material(); material.outputNode = mode.value === 'Final' ? null : views[mode.value](); material.needsUpdate = true; };
  layer.onchange = () => { bindings.forEach(refresh => refresh()); mode.dispatchEvent(new Event('change')); };
  tools.append(mode);
  const angles = document.createElement('div'); angles.className = 'lab-angles';
  for (const [label, yaw, pitch, roll] of [ ['0°', 0, 0, 0], ['−15°', -15, 0, 0], ['30°', 30, 0, 0], ['60°', 60, 0, 0], ['88°', 88, 0, 0], ['Tilt', -25, 22, 15], ['Back', 180, 0, 0] ] as const) {
    const button = document.createElement('button'); button.textContent = label; button.onclick = () => context.motion.setPose(yaw * Math.PI / 180, pitch * Math.PI / 180, roll * Math.PI / 180); angles.append(button);
  }
  tools.append(angles);
  const copy = document.createElement('button'); copy.textContent = 'Copy tuning';
  copy.onclick = () => { const settings: Record<string, number> = {}; for (const [key, value] of Object.entries(u())) if (typeof value?.value === 'number') settings[key] = value.value; void navigator.clipboard.writeText(JSON.stringify(settings, null, 2)); };
  tools.append(copy);
  let observedMaterial = context.material();
  const refresh = () => {
    const material = context.material();
    const secondaryAvailable = material.secondaryOptics.enabled.value > 0;
    const stampAvailable = material.stampOptics.enabled.value > 0;
    layer.options[1].disabled = !secondaryAvailable;
    layer.options[2].disabled = !stampAvailable;
    let updateView = material !== observedMaterial;
    if (!secondaryAvailable && layer.value === 'secondary') { layer.value = 'primary'; updateView = true; }
    if (!stampAvailable && layer.value === 'stamp') { layer.value = 'primary'; updateView = true; }
    observedMaterial = material;
    if (updateView) mode.dispatchEvent(new Event('change'));
    bindings.forEach(binding => binding());
  };
  refresh();
  const refreshTimer = window.setInterval(refresh, 350);
  return { dispose: () => { clearInterval(refreshTimer); panel.remove(); } };
}
