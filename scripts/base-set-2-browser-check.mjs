import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

let executablePath = process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if (!existsSync(executablePath)) {
  const root = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(root)).filter(name => /^chromium-\d+$/.test(name)).sort().reverse()) {
    const candidate = join(root, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(candidate)) { executablePath = candidate; break; }
  }
}
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const out = join(process.cwd(), 'artifacts', 'base-set-2-browser');
await mkdir(out, { recursive: true });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400 && response.url().includes('127.0.0.1')) errors.push(`${response.status()} ${response.url()}`); });
// Only discovery is stubbed to keep live API outages out of this local UI test.
// Actual Base Set 2 metadata, assets, collation, preparation and rendering run normally.
await page.route('https://api.tcgdex.net/v2/en/series', route => route.fulfill({ json: [{ id: 'base', name: 'Base' }] }));
await page.route('https://api.tcgdex.net/v2/en/series/base', route => route.fulfill({ json: { id: 'base', name: 'Base', sets: [
  { id: 'base4', name: 'Base Set 2' }, { id: 'base1', name: 'Base Set' }, { id: 'base2', name: 'Jungle' },
] } }));
try {
  await page.goto(process.env.HOLO_BROWSER_URL || 'http://127.0.0.1:5173/?backend=webgl');
  await page.waitForFunction(() => window.__holo?.ready, null, { timeout: 90000 });
  const seeds = await page.evaluate(async () => {
    const { baseSet2Cards } = await import('/src/pokemon/BaseSet2Catalog.ts');
    const { collatePokemon } = await import('/src/pokemon/collator.ts');
    const seeds = {};
    for (let seed = 0; seed < 1000; seed++) { const pull = collatePokemon('base4', 'mewtwo', seed, baseSet2Cards).pulls[10]; if (pull.variant === 'normal' || pull.card.id === 'base4-13') seeds[pull.variant] ??= seed; }
    return seeds;
  });
  for (const [artwork, variant] of [['Mewtwo', 'holo'], ['Pidgeot', 'normal'], ['Raichu', 'holo'], ['Gyarados', 'normal']]) {
    await page.evaluate(() => window.__holo.pack.browse());
    await page.getByRole('button', { name: /Pokémon/ }).click();
    await page.getByRole('button', { name: /^Base$/ }).click();
    await page.getByRole('button', { name: /^Base Set 2 Opening available/ }).waitFor();
    const names = await page.locator('.pokemon-pack-tile strong').allTextContents();
    assert.equal(names.indexOf('Base Set 2'), names.indexOf('Fossil') + 1);
    await page.getByRole('button', { name: /^Base Set 2 Opening available/ }).click();
    await page.getByRole('button', { name: /^Mewtwo booster/ }).waitFor();
    assert.equal(await page.locator('button.pokemon-booster').count(), 4);
    assert.match(await page.locator('.pokemon-browser [role=status]').textContent(), /20 Cosmos holos/);
    await page.screenshot({ path: join(out, `${artwork}-selection.png`) });
    await page.evaluate(seed => { const original = crypto.getRandomValues.bind(crypto); crypto.getRandomValues = array => { array[0] = seed; crypto.getRandomValues = original; return array; }; }, seeds[variant]);
    await page.getByRole('button', { name: new RegExp(`^${artwork} booster`) }).click();
    await page.waitForFunction(() => window.__holo.pack.stats().state === 'PackReady', null, { timeout: 120000 });
    const pulls = await page.evaluate(() => window.__holo.pack.stats().meshIds.map(id => {
      const card = window.__holo.scene.getObjectByProperty('uuid', id).userData.cardInstance.definition;
      return { id: card.pokemon.id, variant: card.pokemon.variant, profile: card.profile, pending: card.pokemon.treatmentStatus, maps: card.maps };
    }));
    assert.equal(pulls.length, 11); assert.equal(pulls[10].variant, variant);
    assert.ok(pulls.every(p => p.id.startsWith('base4-') && (p.variant === 'holo' ? p.profile === 'pokemon-base-set-2-cosmos' && p.maps?.foil?.endsWith('-foil.png') && p.maps?.motif?.endsWith('-cosmos.png') : p.profile === 'print-only' && !p.maps)));
    assert.equal(pulls[10].pending, undefined);
    if(variant==='holo') {
      const registered=await page.evaluate(async()=>{
        const mesh=window.__holo.scene.getObjectByProperty('uuid',window.__holo.pack.stats().meshIds[10]);
        const card=mesh.userData.cardInstance.definition,field=mesh.material[0].fieldTextureNode.value;
        const {width,height,data}=field.image,image=new Image();image.src=card.maps.motif;await image.decode();
        const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
        const png=ctx.getImageData(0,0,image.width,image.height).data;let missing=0,extra=0;
        for(let y=0;y<height;y++)for(let x=0;x<width;x++){
          const px=Math.min(image.width-1,Math.floor((x+.5)/width*image.width)),py=Math.min(image.height-1,Math.floor((1-(y+.5)/height)*image.height));
          const mask=png[(py*image.width+px)*4],actual=data[(y*width+x)*4+3];
          if(mask>127&&actual<80)missing++;if(mask===0&&actual>8)extra++;
        }
        return {missing,extra,flipY:field.flipY};
      });
      assert.deepEqual(registered,{missing:0,extra:0,flipY:false});
    }

    await page.screenshot({ path: join(out, `${artwork}-sealed.png`) });
    await page.evaluate(() => { window.__holo.pack.setStage('reveal', 10); window.__holo.pack.tick(2); });
    await page.screenshot({ path: join(out, `${artwork}-rare.png`) });
    await page.evaluate(() => window.__holo.pack.close());
    console.log(`${artwork}: seed ${seeds[variant]}, ${pulls[10].id}, ${variant}`);
  }
  const wrappers = await page.evaluate(async () => {
    const { prepareWrapper } = await import('/src/pokemon/assets.ts');
    const { baseSet2Set } = await import('/src/pokemon/BaseSet2Catalog.ts');
    return Promise.all(baseSet2Set.boosters.map(async booster => {
      const wrapper = await prepareWrapper(baseSet2Set, booster, new AbortController().signal);
      return { id: booster.id, width: wrapper.width, height: wrapper.height, printedSeals: wrapper.printedSeals, backBounds: booster.backBounds, back: wrapper.back };
    }));
  });
  assert.ok(wrappers.every(w => w.printedSeals && w.width > 6 && w.width < 9 && w.height === 13 && w.backBounds));
  assert.deepEqual(errors, []);
  console.log('Wrapper framing:', wrappers.map(({back, ...summary}) => summary));
} catch (error) {
  await page.screenshot({ path: join(out, 'failure.png') });
  console.error(error, errors); process.exitCode = 1;
} finally { await browser.close(); }
