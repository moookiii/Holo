import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = 'artifacts/74-new-ygo-cards-check'; await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Users/jpall/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', headless: true, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
const report = [];
async function difference(page, a, b, bounds) {
  return page.evaluate(async ([a,b,bounds]) => {
    const decode = async bytes => { const im = new Image(); im.src = `data:image/png;base64,${bytes}`; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const ctx = c.getContext('2d'); ctx.drawImage(im,0,0); return ctx.getImageData(0,0,c.width,c.height); };
    const [aa,bb] = await Promise.all([decode(a),decode(b)]); let changed=0,max=0;
    const [l,t,r,bottom] = bounds || [0,0,aa.width,aa.height];
    for(let y=Math.ceil(t);y<Math.floor(bottom);y++) for(let x=Math.ceil(l);x<Math.floor(r);x++) {
      const i=(y*aa.width+x)*4, d=Math.max(...[0,1,2].map(c=>Math.abs(aa.data[i+c]-bb.data[i+c])));
      if(d>1)changed++; max=Math.max(max,d);
    }
    return {changed,max};
  },[a.toString('base64'),b.toString('base64'),bounds]);
}
try {
  for(const backend of ['webgpu','webgl']) {
    const page = await browser.newPage({ viewport:{width:1440,height:1100} });
    const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(`http://127.0.0.1:5173/?backend=${backend}`); await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:90000});
    for(const [id,title,profile] of [['ip-masquerena','I:P Masquerena','ygo-starlight'],['blue-eyes','Blue-Eyes White Dragon','ygo-ultra']]) {
      await page.locator('#card-toggle').click(); await page.getByRole('button',{name:title,exact:true}).click();
      await page.waitForFunction(id=>window.__holo.stats().card===id,id,{timeout:90000});
      assert.equal(await page.locator('#holo-select').inputValue(),profile);
      await page.evaluate(()=>{window.__holo.hideUI();window.__holo.pose(0,0);}); await page.waitForTimeout(200);
      const baseline=await page.screenshot(); await page.waitForTimeout(200);
      const stationary=await difference(page,baseline,await page.screenshot()); assert.equal(stationary.changed,0);
      const bounds=await page.evaluate(()=>{
        const h=window.__holo,d=h.cards.find(c=>c.id===h.stats().card).dimensions;
        const p=(u,v)=>{const q=h.camera.position.clone().set((u-.5)*d.width,(.5-v)*d.height,d.thickness*.5).project(h.camera);return[(q.x+1)*innerWidth/2,(1-q.y)*innerHeight/2];};
        return [...p(.13,.79),...p(.87,.89)];
      });
      await page.evaluate(()=>{window.__holo.material().optics.strength.value=0;}); await page.waitForTimeout(150);
      const noSpectrum=await page.screenshot(); const optical=await difference(page,baseline,noSpectrum),rules=await difference(page,baseline,noSpectrum,bounds);
      assert.ok(optical.changed>500,'the selected foil has a visible computed spectral reflection'); assert.equal(rules.changed,0,'rules text must stay outside picture/frame foil');
      await page.evaluate(profile=>window.__holo.setProfile(profile),profile); await page.evaluate(()=>window.__holo.pose(-15,-15)); await page.waitForTimeout(160);
      await page.screenshot({path:`${out}/${backend}-${id}-reflection.png`});
      await writeFile(`${out}/${backend}-${id}-front.png`,baseline);
      await page.evaluate(()=>window.__holo.flip()); await page.waitForTimeout(750);
      await page.screenshot({path:`${out}/${backend}-${id}-back.png`});
      // Restore UI through its authored root after the diagnostic capture.
      await page.evaluate(()=>{document.querySelector('#ui').style.display='';});
      report.push({backend,id,profile,stationary,optical,rules});
    }
    assert.deepEqual(errors,[]); await page.close();
  }
  await writeFile(`${out}/report.json`,JSON.stringify(report,null,2)); console.log(JSON.stringify(report,null,2));
} finally {await browser.close();}
