import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir,readdir,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
let executablePath=chromium.executablePath();
if(!existsSync(executablePath)) for(const version of (await readdir(join(process.env.LOCALAPPDATA,'ms-playwright'))).filter(n=>/^chromium-\d+$/.test(n)).sort().reverse()) {
  const path=join(process.env.LOCALAPPDATA,'ms-playwright',version,'chrome-win64/chrome.exe');if(existsSync(path)){executablePath=path;break;}
}
const baseline=process.argv.includes('--baseline'), full=process.argv.includes('--full');
const backend=process.argv.includes('--webgl')?'webgl':'webgpu';
const out=`artifacts/mega-optics/${baseline?'baseline':full?'final':'pilot'}-${backend}`;await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true,args:['--enable-unsafe-webgpu','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[],results={cards:[],backend};
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&r.url().includes('127.0.0.1')&&r.url().includes('/cards/'))errors.push(`${r.status()} ${r.url()}`);});
try{
  await page.goto(`http://127.0.0.1:5174/?backend=${backend}`,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>window.__holo?.ready&&window.__holo.startupTiming.galleryUIAvailable!==undefined,null,{timeout:120000});
  const ids=['me02.5-269','me01-188',...(full?['me02.5-271','me02.5-267','me01-187','me02.5-295']:[])];
  for(const short of ids){
    const id=`pokemon:${short}:holo`;
    await page.evaluate(id=>window.__holo.gallery.close(id),id);
    await page.waitForFunction(id=>window.__holo.stats().card===id,id,{timeout:120000});
    for(const [name,y,p,preset] of [['front',0,0,'Studio'],['grazing',55,-15,'Studio'],['specular',-15,-15,'Studio'],['tilt',-28,24,'Studio'],['dark',0,0,'Low key'],['moving-a',0,0,'Moving light'],['moving-b',0,0,'Moving light']]){
      await page.evaluate(([y,p,preset])=>{window.__holo.pose(y,p,0);window.__holo.lighting.setPreset(preset);},[y,p,preset]);
      await page.waitForTimeout(name==='moving-b'?1100:450);
      await page.screenshot({path:`${out}/${short}-${name}.png`});
    }
    results.cards.push(await page.evaluate(()=>window.__holo.stats()));
  }
  if(!baseline){
    await page.evaluate(()=>{window.__holo.lighting.setPreset('Studio');window.__holo.gallery.open();});
    for(const [set,rarity] of [['Ascended Heroes','Mega Attack Rare'],['Mega Evolution','Mega Hyper Rare']]){
      await page.getByRole('combobox',{name:'Set',exact:true}).selectOption({label:set});
      const raritySelect=page.getByRole('combobox',{name:'Rarity',exact:true});
      await raritySelect.selectOption({label:rarity});
      await page.waitForFunction(()=>{const s=window.__holo.gallery.stats();return s.visibleExpected>0&&s.visible===s.visibleExpected&&s.pending===0&&s.queued===0;},null,{timeout:120000});
      await page.waitForTimeout(500);
      results[rarity]=await page.evaluate(()=>window.__holo.gallery.stats());
      assert.ok(results[rarity].visible>0);
      await page.screenshot({path:`${out}/gallery-${rarity.replaceAll(' ','-')}.png`});
    }
  }
  assert.deepEqual(errors,[]);results.passed=true;
}catch(e){results.failure=String(e);process.exitCode=1;await page.screenshot({path:out+'/failure.png'});}
finally{await writeFile(out+'/report.json',JSON.stringify({...results,errors},null,2));await browser.close();}
console.log(JSON.stringify({out,passed:results.passed,failure:results.failure,errors}));
