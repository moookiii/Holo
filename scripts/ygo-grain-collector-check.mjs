import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const out = 'artifacts/81-ygo-grain-collector-check';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Users/jpall/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const report = [];
async function diff(page, a, b, bounds) {
  return page.evaluate(async ([a,b,rect]) => {
    const decode = async bytes => { const im = new Image(); im.src = `data:image/png;base64,${bytes}`; await im.decode(); const c = document.createElement('canvas'); c.width=im.width; c.height=im.height; const ctx=c.getContext('2d'); ctx.drawImage(im,0,0); return ctx.getImageData(0,0,c.width,c.height); };
    const [aa,bb]=await Promise.all([decode(a),decode(b)]);
    let changed=0,max=0;
    if(rect) {
      const h=window.__holo,d=h.cards.find(c=>c.id===h.stats().card).dimensions;
      const p=(u,v)=>{const q=h.camera.position.clone().set((u-.5)*d.width,(.5-v)*d.height,d.thickness*.5).project(h.camera); return [(q.x+1)*innerWidth/2,(1-q.y)*innerHeight/2];};
      rect=[...p(rect[0],rect[1]),...p(rect[2],rect[3])];
    }
    const [l,t,r,bt]=rect || [0,0,aa.width,aa.height];
    for(let y=Math.ceil(t);y<Math.floor(bt);y++) for(let x=Math.ceil(l);x<Math.floor(r);x++) {
      const i=(y*aa.width+x)*4,d=Math.max(...[0,1,2].map(c=>Math.abs(aa.data[i+c]-bb.data[i+c])));
      if(d>1) changed++; max=Math.max(max,d);
    }
    return {changed,max};
  },[a.toString('base64'),b.toString('base64'),bounds]);
}
try {
  for(const backend of ['webgpu','webgl']) {
    const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(`http://127.0.0.1:5173/?backend=${backend}`); await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:90000});
    await page.evaluate(async()=>{await window.__holo.setCard('blue-eyes');window.__holo.hideUI();window.__holo.pose(0,0);});
    const shot=async()=>{await page.waitForTimeout(180);return page.screenshot();};
    const baseline=await shot();
    const stationary=await diff(page,baseline,await shot()); assert.equal(stationary.changed,0);
    await page.evaluate(()=>{window.__holo.material().optics.strength.value=0;});
    const none=await shot(),spectrum=await diff(page,baseline,none),rules=await diff(page,baseline,none,[.09,.76,.9,.93]);
    const body=await diff(page,baseline,none,[443/1312,1141/1911,452/1312,1160/1911]);
    assert.ok(spectrum.changed>10000); assert.equal(rules.changed,0); assert.ok(body.max<=3,'opaque white dragon ink stays protected');
    await page.evaluate(async()=>{await window.__holo.setProfile('ygo-ultra');window.__holo.pose(17,-9);}); await shot();
    await page.evaluate(()=>window.__holo.pose(0,0)); const returned=await diff(page,baseline,await shot()); assert.equal(returned.changed,0);
    await page.evaluate(()=>{window.__holo.material().optics.facetTilt.value=0;}); const grain=await diff(page,baseline,await shot()); assert.ok(grain.changed>500,'grain normals must affect the reflected light');
    await writeFile(`${out}/${backend}-blue-front.png`,baseline);
    await page.evaluate(async()=>{await window.__holo.setProfile('ygo-ultra');window.__holo.zoom(.68);window.__holo.pose(0,8);});
    await writeFile(`${out}/${backend}-blue-close.png`,await shot());
    await page.evaluate(()=>{window.__holo.zoom(1);});
    report.push({backend,card:'blue-eyes',stationary,spectrum,rules,body,returned,grain});

    await page.evaluate(async()=>{await window.__holo.setCard('ip-masquerena');window.__holo.pose(0,0);});
    for(const profile of ['ygo-collector','ygo-prismatic-collector']) {
      await page.evaluate(p=>window.__holo.setProfile(p),profile); const base=await shot();
      const still=await diff(page,base,await shot()); assert.equal(still.changed,0);
      await page.evaluate(()=>{window.__holo.pose(-15,-15);const u=window.__holo.material().optics;u.strength.value=0;u.glintStrength.value=0;u.patternedSilver.value=0;}); const etched=await shot();
      await page.evaluate(()=>{window.__holo.material().optics.facetTilt.value=0;}); const relief=await diff(page,etched,await shot()); console.log(backend,profile,'relief',relief); assert.ok(relief.changed>100,'etched slopes must change physical reflection even without diffraction or sparkle');
      await page.evaluate(async p=>{await window.__holo.setProfile(p);window.__holo.pose(12,-8);},profile); await shot();
      await page.evaluate(()=>window.__holo.pose(0,0)); const returned=await diff(page,base,await shot()); assert.equal(returned.changed,0);
      let varnish;
      if(profile==='ygo-prismatic-collector') {
        await page.evaluate(()=>{window.__holo.material().optics.frameVarnish.value=0;}); const uncoated=await shot();
        varnish={total:await diff(page,base,uncoated),art:await diff(page,base,uncoated,[.15,.22,.85,.69]),rules:await diff(page,base,uncoated,[.1,.78,.9,.92])};
        assert.ok(varnish.total.changed>1000); assert.equal(varnish.art.changed,0); assert.equal(varnish.rules.changed,0);
      }
      await writeFile(`${out}/${backend}-${profile}.png`,base);
      report.push({backend,profile,stationary:still,relief,returned,varnish});
    }
    assert.deepEqual(errors,[]); await page.close();
  }
  await writeFile(`${out}/report.json`,JSON.stringify(report,null,2)); console.log(JSON.stringify(report,null,2));
} finally {await browser.close();}
