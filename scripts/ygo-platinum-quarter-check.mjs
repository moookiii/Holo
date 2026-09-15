import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const out = 'artifacts/88-ygo-platinum-quarter-check';
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
    await page.evaluate(async()=>{await window.__holo.setCard('ip-masquerena');window.__holo.hideUI();window.__holo.pose(0,0);});
    const shot=async()=>{await page.waitForTimeout(180);return page.screenshot();};
    for(const profile of ['ygo-platinum-secret','ygo-quarter-century']) {
      await page.evaluate(p=>window.__holo.setProfile(p),profile); const base=await shot();
      const stationary=await diff(page,base,await shot()); assert.equal(stationary.changed,0);
      await page.evaluate(()=>{window.__holo.material().optics.strength.value=0;window.__holo.material().optics.glintStrength.value=0;});
      const off=await shot(),spectrum=await diff(page,base,off),rules=await diff(page,base,off,[.09,.78,.9,.935]);
      assert.ok(spectrum.changed>10000);assert.equal(rules.changed,0,'main foil must stay out of rules and independent watermark');
      await page.evaluate(async p=>{await window.__holo.setProfile(p);window.__holo.pose(18,-11);},profile);await shot();
      await page.evaluate(()=>window.__holo.pose(0,0));const returned=await diff(page,base,await shot());assert.equal(returned.changed,0);
      let watermark;
      if(profile==='ygo-quarter-century') {
        await page.evaluate(()=>window.__holo.material().surfaceControls.anniversary.value=0);const noMark=await shot();
        watermark={mark:await diff(page,base,noMark,[.385,.77,.615,.92]),art:await diff(page,base,noMark,[.15,.22,.85,.69]),leftRules:await diff(page,base,noMark,[.09,.78,.35,.93])};
        assert.ok(watermark.mark.changed>100,'anniversary mark must reflect');assert.equal(watermark.art.changed,0);assert.equal(watermark.leftRules.changed,0);
      }
      await writeFile(`${out}/${backend}-${profile}.png`,base);
      report.push({backend,profile,stationary,spectrum,rules,returned,watermark});
      await page.evaluate(async p=>{await window.__holo.setProfile(p);window.__holo.pose(-15,-15);},profile);
      await writeFile(`${out}/${backend}-${profile}-reflection.png`,await shot());
      await page.evaluate(()=>window.__holo.pose(0,0));
    }
    assert.deepEqual(errors,[]);await page.close();
  }
  await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} finally {await browser.close();}
