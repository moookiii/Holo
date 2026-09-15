import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const out='artifacts/95-magic-check';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Users/jpall/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',headless:true,args:['--enable-unsafe-webgpu','--ignore-gpu-blocklist']});
const report=[];
async function difference(page,a,b,protectedInk=false) {
  return page.evaluate(async([a,b,protectedInk])=>{
    const decode=async src=>{const im=new Image();im.src=src;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);return ctx.getImageData(0,0,c.width,c.height);};
    const [aa,bb]=await Promise.all([decode(`data:image/png;base64,${a}`),decode(`data:image/png;base64,${b}`)]);
    let mask,rect,bounds;
    if(protectedInk){
      const h=window.__holo,card=h.cards.find(c=>c.id===h.stats().card),d=card.dimensions;
      mask=await decode(card.maps.protection);
      const project=(u,v)=>{const p=h.camera.position.clone().set((u-.5)*d.width,(.5-v)*d.height,d.thickness*.5).project(h.camera);return[(p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2];};
      rect=[...project(0,0),...project(1,1)];
      bounds=card.id==='black-lotus'?[.14,.63,.88,.80]:[.06,.635,.94,.905];
    }
    let changed=0,max=0,samples=0;
    for(let y=0;y<aa.height;y++)for(let x=0;x<aa.width;x++){
      if(mask){
        const u=(x-rect[0])/(rect[2]-rect[0]),v=(y-rect[1])/(rect[3]-rect[1]);
        if(u<bounds[0]||u>bounds[2]||v<bounds[1]||v>bounds[3])continue;
        const mx=Math.floor(u*mask.width),my=Math.floor(v*mask.height);
        let core=true;
        for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)if(mask.data[((my+j)*mask.width+mx+i)*4]<254)core=false;
        if(!core)continue;
      }
      const i=(y*aa.width+x)*4,d=Math.max(...[0,1,2].map(c=>Math.abs(aa.data[i+c]-bb.data[i+c])));
      samples++;if(d>1)changed++;max=Math.max(max,d);
    }
    return{changed,max,samples};
  },[a.toString('base64'),b.toString('base64'),protectedInk]);
}
try{
  for(const backend of ['webgpu','webgl']){
    const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(`http://127.0.0.1:5173/?backend=${backend}`);await page.waitForFunction(()=>window.__holo?.ready,null,{timeout:90000});
    for(const card of ['angel-of-serenity','black-lotus']){
      await page.evaluate(()=>{document.querySelector('#ui').style.display='';document.querySelector('#ui').classList.remove('idle');});
      await page.locator('#card-toggle').click();
      await page.getByRole('button',{name:'Magic: The Gathering',exact:true}).click();
      await page.locator('.card-option').filter({hasText:card==='black-lotus'?'Black Lotus':'Angel of Serenity'}).click();
      await page.waitForFunction(id=>window.__holo.stats().card===id,card,{timeout:90000});
      await page.mouse.move(10,10);
      await page.evaluate(()=>{window.__holo.hideUI();window.__holo.pose(0,0);});
      const shot=async()=>{await page.waitForTimeout(200);return page.screenshot();};
      const available=await page.locator('#holo-select optgroup[label="Magic: The Gathering"] option').evaluateAll(opts=>opts.filter(o=>!o.hidden&&!o.disabled).map(o=>o.value));
      assert.equal(available.length,4,'all four Magic finishes must be in the normal picker');
      for(const profile of available){
        await page.evaluate(p=>window.__holo.setProfile(p),profile);
        const base=await shot(),stationary=await difference(page,base,await shot());assert.equal(stationary.changed,0);
        const atlas=()=>page.evaluate(()=>{
          let hash=2166136261;for(const n of window.__holo.material().reliefTextureNode.value.image.data)hash=Math.imul(hash^n,16777619);return hash;
        });
        const before=await atlas();
        await page.evaluate(()=>window.__holo.material().optics.strength.value=0);
        const off=await shot(),spectral=await difference(page,base,off),ink=await difference(page,base,off,true);
        console.log(JSON.stringify({backend,card,profile,spectral,ink}));
        assert.ok(spectral.changed>300,`${profile}: diffraction must be visible`);assert.ok(ink.samples>100,'must test actual glyph interiors');assert.equal(ink.changed,0,`${card}: printed glyphs must retain contrast`);
        await page.evaluate(p=>window.__holo.setProfile(p),profile);
        for(const [yaw,pitch] of [[-12,0],[0,10],[12,-10],[0,0]]){await page.evaluate(([y,p])=>window.__holo.pose(y,p),[yaw,pitch]);await page.waitForTimeout(65);}
        const returned=await difference(page,base,await shot());assert.equal(returned.changed,0);assert.equal(before,await atlas());
        let coupled;
        if(profile!=='mtg-traditional'){
          await page.evaluate(()=>window.__holo.material().optics.facetCoupling.value=0);
          coupled=await difference(page,base,await shot());assert.ok(coupled.changed>200,'facet orientation must affect spectral reflection');
        }
        await writeFile(`${out}/${backend}-${card}-${profile}.png`,base);
        report.push({backend,card,profile,stationary,spectral,ink,returned,coupled,fixedAtlas:true});
        await page.evaluate(async p=>{await window.__holo.setProfile(p);window.__holo.pose(-15,-15);},profile);
        await writeFile(`${out}/${backend}-${card}-${profile}-reflection.png`,await shot());
        await page.evaluate(()=>window.__holo.pose(0,0));
      }
      await page.evaluate(()=>{window.__holo.pose(0,0);window.__holo.flip();});await page.waitForTimeout(750);
      assert.ok(Math.abs((await page.evaluate(()=>window.__holo.stats().quaternion))[1])>.999,'physical flip must expose reverse');
      await writeFile(`${out}/${backend}-${card}-back.png`,await shot());
      await page.evaluate(()=>window.__holo.flip());await page.waitForTimeout(750);
      assert.ok(Math.abs((await page.evaluate(()=>window.__holo.stats().quaternion))[3])>.999,'second physical flip returns to front');
      await page.evaluate(()=>window.__holo.pose(0,0));
    }
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
    await page.screenshot({path:`${out}/${backend}-mobile.png`});
    assert.deepEqual(errors,[]);await page.close();
  }
  const hashes={};
  for(const path of ['angel-of-serenity/front.png','magic/back.png','black-lotus/front.png','black-lotus/back.png'])hashes[path]=createHash('sha256').update(await readFile(`public/cards/${path}`)).digest('hex');
  assert.equal(hashes['black-lotus/back.png'],'bb4dd96de7755896c5ec22b043dce4365270a8ea4f07c33bc00f942659903116');
  await writeFile(`${out}/report.json`,JSON.stringify({report,hashes},null,2));console.log(JSON.stringify({report,hashes},null,2));
}finally{await browser.close();}
