import type { CardMapPaths, Franchise } from '../card/CardDefinition';
import type { HolographicProfile } from '../materials/HolographicProfile';
import { parseCardImportManifest } from '../assets/CardImportManifest';
import { importCardBundle, prepareImportedCard, type ImportedCard } from '../assets/CardImporter';

const mapLabels: Record<keyof CardMapPaths, string> = {
  foil: 'Foil coverage', secondaryFoil: 'Secondary foil', metallic: 'Metallic text', height: 'Emboss / height', roughness: 'Roughness', normal: 'Normal',
  direction: 'Diffraction direction', pattern: 'Pattern visibility', stamp: 'Stamp', protection: 'Print protection', laminate: 'Laminate', sparkle: 'Sparkle coverage',
  coverage: 'Packed coverage · RGBA', surface: 'Packed surface · RGB', secondaryDirection: 'Secondary direction', stampDirection: 'Stamp direction',
  secondaryPattern: 'Secondary pattern', stampPattern: 'Stamp pattern', extendedFoil: 'Extended foil coverage',
  hologram: 'Image hologram · depth / window / angle',
};
const imageTypes = '.png,.jpg,.jpeg,.webp,.svg,.avif';

export function createImportDialog(profiles: readonly HolographicProfile[], onImport: (card: ImportedCard) => Promise<void>) {
  const dialog = document.createElement('dialog'); dialog.className = 'import-dialog'; dialog.setAttribute('aria-labelledby', 'import-title');
  dialog.innerHTML = `<form id="import-form">
    <div class="import-heading"><h1 id="import-title">Import card</h1><button type="button" class="import-close" aria-label="Close import">×</button></div>
    <p class="import-note">Loaded locally for this browser session.</p>
    <div class="import-tabs" role="tablist" aria-label="Import method"><button type="button" role="tab" id="images-tab" aria-selected="true" aria-controls="images-import">Images</button><button type="button" role="tab" id="bundle-tab" aria-selected="false" aria-controls="bundle-import">Card bundle</button></div>
    <fieldset id="images-import" role="tabpanel" aria-labelledby="images-tab">
      <div class="import-images">
        <label class="import-image">Front image<input id="import-front" name="front" type="file" accept="${imageTypes}" required><img alt="Selected card front" hidden></label>
        <label class="import-image">Back image<input id="import-back" name="back" type="file" accept="${imageTypes}" required><img alt="Selected card back" hidden></label>
      </div>
      <label>Card name<input id="import-name" name="title" maxlength="120" required autocomplete="off"></label>
      <div class="import-columns"><label>Franchise<select id="import-franchise" name="franchise"><option>Original</option><option>Pokémon</option><option>Yu-Gi-Oh!</option><option>Magic: The Gathering</option></select></label><label>Foil treatment<select id="import-profile" name="profile"></select></label></div>
      <p class="import-foil-note" hidden>Foil covers the whole front. Add coverage maps below to limit it to specific areas.</p>
      <div class="import-columns"><label>Set / edition<input name="set" maxlength="160" autocomplete="off"></label><label>Card number<input name="number" maxlength="60" autocomplete="off"></label></div>
      <details class="import-maps"><summary>Optional material maps</summary><div class="import-columns"><label>Secondary treatment<select id="import-secondary"><option value="">Treatment default</option></select></label><label>Stamp treatment<select id="import-stamp"><option value="">Metallic ink</option></select></label></div><div class="import-map-grid"></div></details>
    </fieldset>
    <fieldset id="bundle-import" role="tabpanel" aria-labelledby="bundle-tab" hidden disabled>
      <p>Select one JSON card manifest with its image files, or choose their folder.</p>
      <label>Bundle files<input id="import-bundle-files" type="file" accept=".json,${imageTypes}" multiple required></label>
      <input id="import-folder" type="file" webkitdirectory multiple hidden>
      <button id="choose-import-folder" type="button" class="import-folder-button">Choose folder</button><p class="import-bundle-status" aria-live="polite"></p>
    </fieldset>
    <p class="import-error" role="alert" hidden></p><p class="import-status" role="status" hidden></p>
    <div class="import-actions"><button class="import-cancel" type="button">Cancel</button><button class="import-submit" type="submit">Import card</button></div>
  </form>`;
  document.body.append(dialog);
  const form = dialog.querySelector<HTMLFormElement>('form')!;
  const imageFields = dialog.querySelector<HTMLFieldSetElement>('#images-import')!, bundleFields = dialog.querySelector<HTMLFieldSetElement>('#bundle-import')!;
  const franchise = dialog.querySelector<HTMLSelectElement>('#import-franchise')!;
  const profile = dialog.querySelector<HTMLSelectElement>('#import-profile')!;
  const foilNote = dialog.querySelector<HTMLElement>('.import-foil-note')!;
  profile.onchange = () => { foilNote.hidden = profile.value === 'print-only'; };
  const secondary = dialog.querySelector<HTMLSelectElement>('#import-secondary')!, stamp = dialog.querySelector<HTMLSelectElement>('#import-stamp')!;
  const folder = dialog.querySelector<HTMLInputElement>('#import-folder')!, bundle = dialog.querySelector<HTMLInputElement>('#import-bundle-files')!;
  const error = dialog.querySelector<HTMLElement>('.import-error')!, status = dialog.querySelector<HTMLElement>('.import-status')!;
  const submit = dialog.querySelector<HTMLButtonElement>('.import-submit')!;
  let method: 'images' | 'bundle' = 'images', busy = false, bundleFiles: File[] = [];
  const previewURLs = new Map<HTMLImageElement, string>();
  const maps = new Map<keyof CardMapPaths, HTMLInputElement>();
  const mapGrid = dialog.querySelector('.import-map-grid')!;
  for (const [key, name] of Object.entries(mapLabels)) {
    const label = document.createElement('label'); label.textContent = name;
    const input = document.createElement('input'); input.id = `import-map-${key}`; input.type = 'file'; input.accept = imageTypes;
    label.append(input); mapGrid.append(label); maps.set(key as keyof CardMapPaths, input);
  }
  const setMethod = (next: typeof method) => {
    if (busy) return; method = next;
    imageFields.hidden = imageFields.disabled = next !== 'images'; bundleFields.hidden = bundleFields.disabled = next !== 'bundle';
    dialog.querySelector('#images-tab')!.setAttribute('aria-selected', String(next === 'images'));
    dialog.querySelector('#bundle-tab')!.setAttribute('aria-selected', String(next === 'bundle'));
    error.hidden = true;
  };
  const drawProfiles = () => {
    const available = profiles.filter(p => p.id === 'print-only' || (p.family === franchise.value && !p.labOnly));
    profile.replaceChildren(new Option('Print only', 'print-only'));
    foilNote.hidden = true;
    available.filter(p => p.id !== 'print-only').forEach(p => profile.add(new Option(p.name, p.id)));
    for (const [select, label] of [[secondary, 'Treatment default'], [stamp, 'Metallic ink']] as const) {
      select.replaceChildren(new Option(label, ''));
      available.filter(p => p.id !== 'print-only').forEach(p => select.add(new Option(p.name, p.id)));
    }
  };
  franchise.onchange = drawProfiles; drawProfiles();
  dialog.querySelector<HTMLButtonElement>('#images-tab')!.onclick = () => setMethod('images');
  dialog.querySelector<HTMLButtonElement>('#bundle-tab')!.onclick = () => setMethod('bundle');
  const setBundleFiles = (files: File[]) => {
    bundleFiles = files; bundle.required = !files.length;
    dialog.querySelector('.import-bundle-status')!.textContent = files.length ? `${files.length} files selected` : '';
  };
  bundle.onchange = () => setBundleFiles([...bundle.files ?? []]); folder.onchange = () => setBundleFiles([...folder.files ?? []]);
  dialog.querySelector<HTMLButtonElement>('#choose-import-folder')!.onclick = () => folder.click();
  for (const name of ['front', 'back']) {
    const input = dialog.querySelector<HTMLInputElement>(`#import-${name}`)!, preview = input.parentElement!.querySelector('img')!;
    input.onchange = () => {
      const previous = previewURLs.get(preview); if (previous) URL.revokeObjectURL(previous);
      const file = input.files?.[0]; preview.hidden = !file;
      if (file) {
        const url = URL.createObjectURL(file); previewURLs.set(preview, url); preview.src = url;
        const title = dialog.querySelector<HTMLInputElement>('#import-name')!;
        if (name === 'front' && !title.value) title.value = file.name.replace(/\.[^.]+$/, '').replaceAll('-', ' ').replaceAll('_', ' ');
      } else { preview.removeAttribute('src'); previewURLs.delete(preview); }
    };
  }
  const close = () => { if (!busy) dialog.close(); };
  dialog.querySelector<HTMLButtonElement>('.import-close')!.onclick = close;
  dialog.querySelector<HTMLButtonElement>('.import-cancel')!.onclick = close;
  dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
  const reset = () => {
    form.reset(); previewURLs.forEach(url => URL.revokeObjectURL(url)); previewURLs.clear();
    dialog.querySelectorAll('img').forEach(image => { image.hidden = true; image.removeAttribute('src'); });
    setBundleFiles([]); drawProfiles(); setMethod('images'); error.hidden = status.hidden = true;
  };
  dialog.addEventListener('close', reset);
  form.onsubmit = async event => {
    event.preventDefault(); if (busy) return;
    error.hidden = true; status.hidden = false; status.textContent = 'Preparing card…'; submit.textContent = 'Importing…';
    busy = true; dialog.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = true; });
    let imported: ImportedCard | undefined;
    try {
      if (method === 'bundle') imported = await importCardBundle(bundleFiles, profiles);
      else {
        const data = new FormData(form), files = new Map<string, File>();
        const take = (input: HTMLInputElement, name: string) => {
          const file = input.files?.[0]; if (!file) return undefined;
          const filename = `${name}.${file.name.split('.').pop()}`; files.set(filename, file); return filename;
        };
        const front = take(dialog.querySelector('#import-front')!, 'front'), back = take(dialog.querySelector('#import-back')!, 'back');
        if (!front || !back) throw new Error('Choose both a front and a back image.');
        const paths: CardMapPaths = {};
        for (const [key, input] of maps) { const path = take(input, key); if (path) paths[key] = path; }
        const spec = parseCardImportManifest({ title: data.get('title'), franchise: franchise.value as Franchise, set: data.get('set'), number: data.get('number'), front, back, profile: profile.value, maps: paths,
          profileOverrides: { ...(secondary.value ? { secondaryProfile: secondary.value } : {}), ...(stamp.value ? { stampProfile: stamp.value } : {}) } }, profiles);
        imported = await prepareImportedCard(spec, files);
      }
      status.textContent = 'Preparing materials…'; await onImport(imported); imported = undefined;
      busy = false; dialog.close();
    } catch (reason) {
      imported?.dispose(); error.hidden = false; error.textContent = reason instanceof Error ? reason.message : 'The card could not be imported.';
    } finally {
      busy = false; status.hidden = true; submit.textContent = 'Import card';
      dialog.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = false; });
    }
  };
  return { open: () => { reset(); dialog.showModal(); dialog.querySelector<HTMLInputElement>('#import-name')!.focus(); }, dispose: () => { previewURLs.forEach(url => URL.revokeObjectURL(url)); dialog.remove(); } };
}
