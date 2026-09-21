import { chromium } from 'playwright';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const out = join(process.cwd(), 'artifacts', 'holo-lab-verification');
await mkdir(out, { recursive: true });
const options = { headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] };
if (!existsSync(chromium.executablePath())) {
  const base = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for (const version of (await readdir(base)).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
    const path = join(base, version, 'chrome-win64', 'chrome.exe');
    if (existsSync(path)) { options.executablePath = path; break; }
  }
}
const browser = await chromium.launch(options);
const report = [];
try {
  for (const backend of (process.env.LAB_BACKEND ? [process.env.LAB_BACKEND] : ['webgpu','webgl'])) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = []; page.on('pageerror', error => errors.push(String(error))); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const ready = async () => { await page.waitForFunction(() => window.__holo?.lab && document.querySelector('.hl-status')?.textContent === 'Live · shared optical renderer', null, { timeout: 120000 }); };
    const run = async (name, work) => { try { await work(); report.push({ backend, name, passed: true }); console.log(`${backend}: PASS ${name}`); } catch (error) { report.push({ backend, name, passed: false, error: String(error) }); console.log(`${backend}: FAIL ${name}: ${error}`); await page.screenshot({ path: join(out, `${backend}-failure-${report.length}.png`) }); } };
    await page.goto(`http://127.0.0.1:5173/?lab=1&backend=${backend}`); await ready();
    await page.evaluate(() => { window.__holo.motion.precise = true; window.__holo.pose(-15,-15,0); });
    await run('uniform edit, coalesced history, exact reset and no shader or texture churn', async () => {
      const before = await page.evaluate(() => { const h=window.__holo,m=h.material();return { value:m.optics.strength.value,version:m.version,texture:m.fieldTextureNode.value.uuid,roughness:m.optics.roughness.value,baseline:JSON.stringify(h.lab.state.current) }; });
      const input=page.getByLabel('Spectral strength value',{exact:true});await input.fill('1.23');await input.press('Tab');
      assert.equal(await page.evaluate(()=>window.__holo.material().optics.strength.value),1.23);
      const after=await page.evaluate(()=>{const m=window.__holo.material();return {version:m.version,texture:m.fieldTextureNode.value.uuid,roughness:m.optics.roughness.value};});
      assert.equal(after.version,before.version);assert.equal(after.texture,before.texture);assert.equal(after.roughness,before.roughness);
      await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await page.evaluate(()=>window.__holo.material().optics.strength.value),before.value);
      await page.getByRole('button',{name:'Redo',exact:true}).click();assert.equal(await page.evaluate(()=>window.__holo.material().optics.strength.value),1.23);
      await page.evaluate(()=>{window.__holo.lab.state.reset();window.__holo.lab.apply(true);});assert.equal(await page.evaluate(()=>JSON.stringify(window.__holo.lab.state.current)),before.baseline);
    });
    await run('A/B preserves quaternion camera light and card; working state remains independent',async()=>{
      await page.getByRole('button',{name:'Store A',exact:true}).click();await page.getByLabel('Spectral strength value',{exact:true}).fill('1.6');await page.getByLabel('Spectral strength value',{exact:true}).press('Tab');await page.getByRole('button',{name:'Store B',exact:true}).click();
      const scene=()=>page.evaluate(()=>{const h=window.__holo;return JSON.stringify([h.motion.orientation.toArray(),h.camera.position.toArray(),h.lighting.key.position.toArray(),h.lighting.key.intensity,h.stats().card]);});
      await page.waitForTimeout(250);const before=await scene();await page.getByRole('button',{name:'A',exact:true}).click();assert.equal(await scene(),before);assert.equal(await page.evaluate(()=>window.__holo.lab.state.current.diffraction.strength),1.6);
      await page.getByRole('button',{name:'B',exact:true}).click();assert.equal(await scene(),before);assert.equal(await page.evaluate(()=>window.__holo.material().optics.strength.value),1.6);
      await page.getByRole('button',{name:'Working',exact:true}).click();await page.evaluate(()=>{window.__holo.lab.state.reset();window.__holo.lab.apply(true);});
    });
    await run('precise pose and actual scene lighting',async()=>{
      await page.getByText('Pose & inspection',{exact:true}).click();await page.getByLabel('Yaw · ° value',{exact:true}).fill('23.5');await page.getByLabel('Yaw · ° value',{exact:true}).press('Tab');await page.waitForTimeout(250);
      assert.ok(Math.abs(Number(await page.getByLabel('Yaw · ° value',{exact:true}).inputValue())-23.5)<.01);
      await page.getByText('Lighting studio',{exact:true}).click();await page.getByLabel('Lighting rig',{exact:true}).selectOption('Narrow grazing');assert.equal(await page.evaluate(()=>window.__holo.lighting.key.width),.4);
      await page.getByRole('button',{name:'Store pose + light',exact:true}).click();await page.getByRole('button',{name:'Face-on',exact:true}).click();await page.getByLabel('Temporary inspection preset').selectOption('0');await page.waitForTimeout(250);assert.ok(Math.abs(Number(await page.getByLabel('Yaw · ° value',{exact:true}).inputValue())-23.5)<.01);
      await page.getByLabel('Lighting rig',{exact:true}).selectOption('Neutral studio');await page.getByText('Lighting studio',{exact:true}).click();await page.getByText('Pose & inspection',{exact:true}).click();
    });
    await run('pointer rotation remains operational in precision mode',async()=>{
      const before=await page.evaluate(()=>window.__holo.motion.orientation.toArray());const rect=await page.locator('#studio').boundingBox();await page.mouse.move(rect.x+rect.width*.45,rect.y+rect.height*.5);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.6,rect.y+rect.height*.6,{steps:10});await page.mouse.up();await page.waitForTimeout(500);assert.notDeepEqual(await page.evaluate(()=>window.__holo.motion.orientation.toArray()),before);await page.mouse.move(20,20);await page.evaluate(()=>window.__holo.pose(-15,-15,0));
    });
    const cases=[['pikachu-vmax-vivid-voltage','pokemon-rainbow-etched'],['lugia-neo-genesis','pokemon-tinsel'],['squirtle-frlg-reverse','pokemon-ex-energy'],['dark-magician-girl','ygo-starlight'],['blue-eyes','ygo-ghost'],['angel-of-serenity','mtg-halo']];
    // Match card and profile IDs against the actual library; EX motif IDs differ by printing.
    const library=await page.evaluate(()=>({cards:window.__holo.cards.map(c=>({id:c.id,title:c.title,profile:c.profile})),profiles:window.__holo.profiles.map(p=>p.id)}));
    cases[2][1]=library.cards.find(c=>c.id==='squirtle-frlg-reverse').profile;
    cases[5][0]=library.cards.find(c=>c.title==='Angel of Serenity').id;
    for(const [card,profile] of cases)await run(`${card} / ${profile}: family, diagnostics, optical isolation, reset`,async()=>{
      await page.getByLabel('Choose card',{exact:true}).selectOption(card);await page.waitForFunction(id=>window.__holo.stats().card===id,card,{timeout:120000});await ready();
      await page.getByLabel('Choose profile',{exact:true}).selectOption(profile);await ready();
      const baseline=await page.evaluate(()=>JSON.stringify(window.__holo.lab.state.current));
      await page.evaluate(()=>window.__holo.pose(-15,-15,0));await page.waitForTimeout(250);await page.screenshot({path:join(out,`${backend}-${profile}.png`)});
      const optics=await page.locator('#studio canvas').screenshot();
      await page.getByLabel('Contribution isolation',{exact:true}).selectOption('spectral');await page.waitForTimeout(200);const isolated=await page.locator('#studio canvas').screenshot();assert.notDeepEqual(isolated,optics);
      await page.getByRole('button',{name:'Final material',exact:true}).click();
      for(const mode of ['foil','height','roughness','normal','direction','pattern','hologram','normals']){await page.getByLabel('Material diagnostic',{exact:true}).selectOption(mode);await page.waitForTimeout(100);}
      await page.getByRole('button',{name:'Final material',exact:true}).click();assert.equal(await page.evaluate(()=>JSON.stringify(window.__holo.lab.state.current)),baseline);assert.equal(await page.evaluate(()=>window.__holo.material().physicalGain.value),1);
      assert.equal(await page.evaluate(()=>window.__holo.factory.stats().instances),1);
    });
    await run('authored map assignment, protection preview and undo',async()=>{
      await page.getByLabel('Choose card',{exact:true}).selectOption('pikachu-vmax-vivid-voltage');await page.waitForFunction(()=>window.__holo.stats().card==='pikachu-vmax-vivid-voltage');await ready();
      await page.getByRole('button',{name:'06 Authored map assignments',exact:true}).click();const map=page.getByLabel('foil map assignment',{exact:true});await map.fill('/cards/pikachu-vmax-vivid-voltage/protection.png');await map.press('Tab');await ready();assert.equal(await page.evaluate(()=>window.__holo.lab.state.current.maps.foil),'/cards/pikachu-vmax-vivid-voltage/protection.png');await page.getByRole('button',{name:'Undo',exact:true}).click();await ready();assert.equal(await page.evaluate(()=>window.__holo.lab.state.current.maps),undefined);
      await page.getByRole('button',{name:'protection',exact:true}).click();await page.waitForTimeout(250);await page.screenshot({path:join(out,`${backend}-protection.png`)});await page.getByRole('button',{name:'Final material',exact:true}).click();
    });
    await run('save a portable profile and use it in the normal viewer',async()=>{
      await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByLabel('Save profile as',{exact:true}).fill('Verification finish');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForFunction(()=>window.__holo.lab.state.current.id.startsWith('user-'));
      const id=await page.evaluate(()=>window.__holo.lab.state.current.id);await page.goto(`http://127.0.0.1:5173/?backend=${backend}`);await page.waitForFunction(()=>window.__holo?.ready);await page.getByLabel('Holographic treatment',{exact:true}).selectOption(id);await page.waitForFunction(id=>window.__holo.stats().profile===id,id);assert.equal(await page.locator('.hl-shell').count(),0);await page.screenshot({path:join(out,`${backend}-viewer.png`)});
    });
    if(backend==='webgpu')await run('normal pack opening remains operational',async()=>{await page.evaluate(()=>window.__holo.pack.open('archive-01'));await page.evaluate(()=>{window.__holo.pack.skipToHit();window.__holo.pack.tick(2);});await page.waitForTimeout(250);await page.screenshot({path:join(out,'webgpu-pack.png')});await page.evaluate(()=>window.__holo.pack.close());assert.equal(await page.evaluate(()=>window.__holo.pack.stats().state),'Closed');});
    report.push({backend,name:'browser errors',passed:errors.length===0,errors});
    console.log(JSON.stringify({backend,errors}));await page.close();
  }
} finally { await browser.close(); await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)); }
if(report.some(r=>!r.passed)) process.exitCode=1;
