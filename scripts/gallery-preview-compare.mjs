import { firefox } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { transformWithEsbuild } from 'vite';
const url = process.env.GALLERY_URL || 'http://127.0.0.1:5174';
const out = join(process.cwd(), 'artifacts', 'gallery-preview-compare');
await mkdir(out, { recursive: true });
const source = await readFile('artifacts/gallery-baseline-source/src/card/CardPreviewPreparation.ts', 'utf8');
const { code } = await transformWithEsbuild(source, 'baseline.ts', { loader: 'ts', target: 'es2022' });
const baseline = code.replace(/from '(\.[^']+)'/g, (_match, path) => `from '${new URL(`${path}.ts`, 'http://placeholder/src/card/').pathname}'`)
  .replace(/from "(\.[^"]+)"/g, (_match, path) => `from '${new URL(`${path}.ts`, 'http://placeholder/src/card/').pathname}'`)
  .replaceAll('import.meta.env.BASE_URL', JSON.stringify('/'));
const browser = await firefox.launch({ headless: true, executablePath: join(process.env.LOCALAPPDATA, 'ms-playwright', 'firefox-1543', 'firefox', 'firefox.exe') });
try {
  const page = await browser.newPage();
  await page.route(`${url}/preview-harness`, route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }));
  await page.route('**/src/card/CardPreviewPreparation.ts?baseline', route => route.fulfill({ contentType: 'text/javascript', body: baseline }));
  await page.goto(`${url}/preview-harness`);
  const results = await page.evaluate(async () => {
    const old = await import('/src/card/CardPreviewPreparation.ts?baseline'), current = await import('/src/card/CardPreviewPreparation.ts');
    const { cards } = await import('/src/card/CardDefinition.ts');
    const { generateField } = await import('/src/materials/patterns/ManufacturingField.ts');
    const { generateMotifField } = await import('/src/materials/patterns/MotifField.ts');
    const { prismaticGalleryCards, prismaticPickerCards } = await import('/src/pokemon/PrismaticSurfaces.ts');
    const { pokemon151GalleryCards, pokemon151PickerCards } = await import('/src/pokemon/Pokemon151Surfaces.ts');
    const all = [...cards, ...prismaticGalleryCards(), ...prismaticPickerCards(), ...pokemon151GalleryCards(), ...pokemon151PickerCards()];
    const selected = ['alakazam-base-set', 'common-pokemon-bulbasaur'].map(id => all.find(card => card.id === id));
    selected.push(all.find(card => card.id === 'pokemon:sv08.5-156:holo'));
    selected.push(all.find(card => card.coverageMode === 'reverse'));
    selected.push(all.find(card => card.maps?.metallic));
    const decodeSvg = async (blob, w, h) => {
      const src = URL.createObjectURL(blob), image = new Image(); image.src = src;
      try { await image.decode(); const canvas = new OffscreenCanvas(w, h), ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0, w, h); return new Uint8Array(ctx.getImageData(0, 0, w, h).data); }
      finally { URL.revokeObjectURL(src); }
    };
    const field = async (spec, height, motif) => spec.kind === 'symbol-foil' && spec.motif
      ? generateMotifField(spec.seed, spec.aspect, spec.scale, height, spec.motif, motif) : generateField(spec, height, motif);
    const hash = async preview => Promise.all([...preview.images, new Uint8Array(preview.parameters.buffer)].map(async bytes =>
      [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('')));
    const results = [];
    for (const card of selected) {
      if (!card) throw new Error(`Missing comparison fixture at index ${selected.indexOf(card)}; candidates: ${all.filter(card => card.title.includes('Sylveon')).map(card => card.id)}`);
      const before = await old.prepareCardPreview(card, new AbortController().signal, field, decodeSvg);
      const after = await current.prepareCardPreview(card, new AbortController().signal, field, decodeSvg);
      const a = await hash(before), b = await hash(after);
      if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`Preview pixel mismatch: ${card.id}`);
      results.push({ id: card.id, identical: true, hashes: b });
    }
    return results;
  });
  await writeFile(join(out, 'report.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results.map(({ id, identical }) => ({ id, identical }))));
} finally { await browser.close(); }
