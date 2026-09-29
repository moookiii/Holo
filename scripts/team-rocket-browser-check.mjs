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
const out = join(process.cwd(), 'artifacts', 'team-rocket-browser');
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
    const { teamRocketCards } = await import('/src/pokemon/TeamRocketCatalog.ts');
    const { collatePokemon } = await import('/src/pokemon/collator.ts');
    const found = {};
    for (let seed=0; seed<5000; seed++) {
      const p=collatePokemon('base5','gyarados-unlimited',seed,teamRocketCards).pulls[10];
      const key=p.card.id==='base5-83'?'secret':p.variant;found[key]??=seed;
      if(Object.keys(found).length===3)break;
    }
    return found;
  });
  const cases=[['Gyarados','Unlimited','secret'],['Giovanni','Unlimited','normal'],['Jessie & James','Unlimited','holo'],['Team Rocket','Unlimited','holo'],
    ['Gyarados','1st Edition','holo'],['Giovanni','1st Edition','secret'],['Jessie & James','1st Edition','normal'],['Team Rocket','1st Edition','holo']];
  for(const [design,edition,outcome] of cases) {
    await page.evaluate(()=>window.__holo.pack.browse());
    await page.getByRole('button',{name:/Pokémon/}).click();await page.getByRole('button',{name:/^Base$/}).click();
    await page.getByRole('button',{name:/^Team Rocket Opening available/}).waitFor();
    const names=await page.locator('.pokemon-pack-tile strong').allTextContents();
    assert.equal(names.indexOf('Team Rocket'),names.indexOf('Base Set 2')+1);
    await page.getByRole('button',{name:/^Team Rocket Opening available/}).click();
    const button=page.getByRole('button',{name:`${design} booster · ${edition}`,exact:true});await button.waitFor();
    assert.equal(await page.locator('button.pokemon-booster').count(),8);
    assert.match(await page.locator('.pokemon-browser [role=status]').textContent(),/intentionally deferred/);
    await page.screenshot({path:join(out,'selection.png')});
    await page.evaluate(seed=>{const original=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>{a[0]=seed;crypto.getRandomValues=original;return a;};},seeds[outcome]);
    await button.click();await page.waitForFunction(()=>window.__holo.pack.stats().state==='PackReady',null,{timeout:120000});
    const pulls=await page.evaluate(()=>window.__holo.pack.stats().meshIds.map(id=>{
      const d=window.__holo.scene.getObjectByProperty('uuid',id).userData.cardInstance.definition;
      return {id:d.pokemon.id,edition:d.pokemon.edition,variant:d.pokemon.variant,front:d.front,number:d.number,profile:d.profile,pending:d.pokemon.treatmentStatus,maps:d.maps,procedural:d.proceduralFoil};
    }));
    assert.equal(pulls.length,11);
    assert.ok(pulls.every(p=>p.edition===(edition==='Unlimited'?'unlimited':'first-edition')&&p.profile==='print-only'&&!p.maps&&!p.procedural));
    assert.ok(pulls.every(p=>p.variant==='holo'?p.pending==='deferred':p.pending===undefined));
    if(outcome==='secret'){assert.equal(pulls[10].id,'base5-83');assert.match(pulls[10].number,/83\/82/);}
    else assert.equal(pulls[10].variant,outcome);
    const label=`${design.replaceAll(' ','-')}-${edition.replaceAll(' ','-')}`;
    await page.screenshot({path:join(out,`${label}-sealed.png`)});
    // Exercise tear, opening and reveal using the normal prepared pack.
    await page.evaluate(()=>{window.__holo.pack.setStage('tear',1);window.__holo.pack.setStage('open',1);window.__holo.pack.setStage('reveal',10);window.__holo.pack.tick(2);});
    await page.screenshot({path:join(out,`${label}-rare.png`)});
    await page.evaluate(()=>window.__holo.pack.close());
    console.log(`${design} ${edition}: ${pulls[10].id} ${pulls[10].variant}, seed ${seeds[outcome]}`);
  }
  assert.deepEqual(errors,[]);
} catch(error) { await page.screenshot({path:join(out,'failure.png')});console.error(error,errors);process.exitCode=1; }
finally { await browser.close(); }
