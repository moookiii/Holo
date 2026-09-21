import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root=process.cwd(), out=join(root,'artifacts','gold-verification');
await mkdir(out,{recursive:true});
let executablePath=process.env.BROWSER_EXECUTABLE || chromium.executablePath();
if(!existsSync(executablePath)) {
  const base=join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  for(const folder of (await readdir(base)).filter(n=>/^chromium-\d+$/.test(n)).sort().reverse()) {
    const path=join(base,folder,'chrome-win64','chrome.exe'); if(existsSync(path)){executablePath=path;break;}
  }
}
const browser=await chromium.launch({executablePath,headless:true,args:['--enable-unsafe-webgpu','--ignore-gpu-blocklist']});
const reports=[];
const id='charizard-burger-king-1999';
try {
  for(const backend of ['webgpu','webgl']) {
    const page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:1});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(`http://127.0.0.1:5173/?backend=${backend}`);
    await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:120000});
    await page.evaluate(()=>window.__holo.setMode('rotate'));
    // Select through the actual normal viewer, not only the development API.
    await page.locator('#card-toggle').click();
    await page.getByRole('button',{name:'Metal',exact:true}).click();
    await page.locator('#card-search').fill('Burger King');
    assert.equal(await page.locator('.card-option').count(),1);
    await page.locator('.card-option').click();
    await page.waitForFunction(id=>window.__holo.stats().card===id,id,{timeout:60000});
    const material=await page.evaluate(id=>{
      const h=window.__holo,mesh=h.scene.getObjectByName(`card:${id}`),c=mesh.userData.cardInstance.definition;
      return {definition:c,front:mesh.material[0].constructor.name,back:mesh.material[1].constructor.name,
        frontNormals:mesh.material[0].surfaceControls.hasNormal.value,backNormals:mesh.material[1].surfaceControls.hasNormal.value,
        frontBump:mesh.material[0].surfaceControls.embossStrength.value,backBump:mesh.material[1].surfaceControls.embossStrength.value,
        diffraction:mesh.material[0].optics.strength.value,sparkle:mesh.material[0].optics.glintStrength.value,
        edgeMetalness:mesh.material[2].metalness,positions:mesh.geometry.getAttribute('position').count,
        bounds:[mesh.geometry.boundingBox.min.toArray(),mesh.geometry.boundingBox.max.toArray()]};
    },id);
    assert.equal(material.front,'HolographicMaterial'); assert.equal(material.back,'HolographicMaterial');
    assert.equal(material.frontNormals,1);assert.equal(material.backNormals,1);
    assert.equal(material.frontBump,0);assert.equal(material.backBump,0);
    assert.equal(material.diffraction,0);assert.equal(material.sparkle,0);assert.equal(material.edgeMetalness,1);
    assert.ok(material.positions>100000);
    assert.ok(material.bounds[1][2]>.21 && material.bounds[0][2]<-.17,'both faces contain real geometric relief');
    assert.equal(await page.locator('#holo-select option').count(),1);
    await page.screenshot({path:join(out,`${backend}-viewer.png`)});
    await page.evaluate(()=>window.__holo.hideUI());
    for(const light of ['Studio','Strip','Low key','Soft']) {
      await page.evaluate(light=>window.__holo.lighting.setPreset(light),light);
      for(const [pose,yaw,pitch,roll] of [['front',0,0,0],['sweep',27,-8,0],['side',72,-12,8],['grazing',88,0,0],['back',180,0,0]]) {
        await page.evaluate(([y,p,r])=>window.__holo.pose(y,p,r),[yaw,pitch,roll]);
        await page.waitForTimeout(220);
        await page.screenshot({path:join(out,`${backend}-${light.toLowerCase().replaceAll(' ','-')}-${pose}.png`)});
      }
    }
    // A treatment re-selection must keep authored normals and true dimensions.
    await page.evaluate(()=>window.__holo.setProfile('minted-gold'));
    assert.equal(await page.evaluate(()=>window.__holo.material().surfaceControls.embossStrength.value),0);
    // Import the same two-sided physical construction through the existing bundle UI.
    await page.evaluate(()=>{document.querySelector('#ui').style.display='';window.__holo.reset();});
    await page.locator('#card-toggle').click(); await page.locator('#import-card').click();await page.locator('#bundle-tab').click();
    const c=material.definition;
    const relative=paths=>Object.fromEntries(Object.entries(paths).map(([k,v])=>[k,v.split('/').at(-1)]));
    const manifest={version:1,title:'Imported gold plaque',franchise:c.franchise,profile:c.profile,front:'front.png',back:'back.png',
      dimensions:c.dimensions,construction:c.construction,maps:relative(c.maps),backMaps:relative(c.backMaps),mapSettings:c.mapSettings};
    const manifestPath=join(out,`${backend}-card.json`);await writeFile(manifestPath,JSON.stringify(manifest));
    const dir=join(root,'public/cards',id);
    await page.locator('#import-bundle-files').setInputFiles([manifestPath,...[...new Set(['front.png','back.png',...Object.values(manifest.maps),...Object.values(manifest.backMaps)])].map(p=>join(dir,p))]);
    await page.locator('.import-submit').click();
    await page.waitForFunction(()=>window.__holo.stats().card.startsWith('import-') || !document.querySelector('.import-error').hidden,null,{timeout:60000});
    assert.equal(await page.locator('.import-error').isVisible(),false);
    assert.equal(await page.evaluate(()=>window.__holo.cards.find(c=>c.id===window.__holo.stats().card).construction.kind),'metal');
    await page.evaluate(()=>window.__holo.pose(180,0));await page.waitForTimeout(200);
    await page.screenshot({path:join(out,`${backend}-imported-back.png`)});
    // Existing front/back/edge paths and controls still work after leaving the plaque.
    const regressions=[];
    for(const old of ['charizard-base-set','pikachu-vmax-vivid-voltage','blue-eyes','nocturne']) {
      await page.evaluate(id=>window.__holo.setCard(id),old);
      await page.evaluate(()=>{window.__holo.lighting.setPreset('Studio');window.__holo.pose(12,-10);});
      await page.waitForTimeout(200);
      const state=await page.evaluate(id=>{
        const h=window.__holo,m=h.scene.getObjectByName(`card:${id}`);
        return {id,profile:h.stats().profile,thickness:m.userData.cardInstance.definition.dimensions.thickness,
          edgeMetalness:m.material[2].metalness,backType:m.material[1].constructor.name};
      },old);
      assert.equal(state.edgeMetalness,0);assert.ok(state.thickness<.04);assert.equal(state.backType,'MeshPhysicalNodeMaterial');
      regressions.push(state);await page.screenshot({path:join(out,`${backend}-existing-${old}.png`)});
    }
    await page.locator('#pack-open').click();
    await page.waitForFunction(()=>!['Closed','Loading'].includes(window.__holo.pack.stats().state),null,{timeout:90000});
    await page.evaluate(()=>{window.__holo.pack.summary();window.__holo.pack.tick(2);});
    const pack=await page.evaluate(()=>window.__holo.pack.stats());
    await page.screenshot({path:join(out,`${backend}-pack.png`)});
    await page.evaluate(()=>window.__holo.pack.close());
    assert.deepEqual(errors,[]);
    reports.push({backend,material,regressions,pack,errors,stats:await page.evaluate(()=>window.__holo.stats())});
    await writeFile(join(out,'report.json'),JSON.stringify(reports,null,2));
    console.log(`${backend}: two-sided gold, UI, bundle import, four existing cards and pack passed`);
    await page.close();
  }
} finally {await browser.close();}
