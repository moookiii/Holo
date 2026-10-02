import { lightPresets, type StudioLighting } from '../lighting/StudioLighting';

export function galleryLightingControls(root: HTMLElement, lighting: StudioLighting) {
  const label = document.createElement('label'); label.textContent = 'Lighting';
  const select = document.createElement('select'); select.setAttribute('aria-label', 'Gallery lighting');
  for (const preset of lightPresets) select.add(new Option(preset, preset));
  select.value = lighting.preset;
  label.append(select); root.append(label);
  const settings: { key: 'elevation' | 'intensity' | 'speed' | 'filterAngle'; label: HTMLLabelElement; input: HTMLInputElement }[] = [];
  for (const [key, title, min, max, step] of [
    ['elevation', 'Elevation', 5, 80, 1], ['intensity', 'Intensity', .1, 2, .05], ['speed', 'Speed', 0, 2, .1], ['filterAngle', 'Polarizer', 0, 90, 1],
  ] as const) {
    const label = document.createElement('label'); label.textContent = title;
    const input = document.createElement('input'); input.type = 'range'; input.min = String(min); input.max = String(max); input.step = String(step); input.value = String(lighting[key]); input.setAttribute('aria-label', `Gallery light ${title.toLowerCase()}`);
    input.oninput = () => { lighting[key] = Number(input.value); }; label.append(input); root.append(label);
    settings.push({ key, label, input });
  }
  const pause = document.createElement('button');
  const update = () => {
    select.value = lighting.preset;
    const moving = ['Moving light', 'Skim', 'Holo skim'].includes(lighting.preset);
    const direct = ['Moving light', 'Skim', 'Spotlight'].includes(lighting.preset);
    for (const { key, label, input } of settings) {
      input.value = String(lighting[key]);
      label.hidden = key === 'speed' ? !moving : key === 'filterAngle' ? lighting.preset !== 'Polarizer' : key === 'intensity' ? false : !direct;
    }
    pause.hidden = !moving; pause.textContent = lighting.playing ? 'Pause light' : 'Play light'; pause.setAttribute('aria-pressed', String(lighting.playing));
  };
  select.onchange = () => { lighting.setPreset(select.value as typeof lightPresets[number]); update(); };
  pause.onclick = () => { lighting.playing = !lighting.playing; update(); }; update(); root.append(pause);
  return update;
}
