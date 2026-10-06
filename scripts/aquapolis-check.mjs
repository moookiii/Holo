import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdir,readdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
let executablePath=chromium.executablePath();
if(!existsSync(executablePath))for(const v of (await readdir(join(process.env.LOCALAPPDATA,'ms-playwright'))).filter(n=>/^chromium-\d+$/.test(n)).sort().reverse()){
 const p=join(process.env.LOCALAPPDATA,'ms-playwright',v,'chrome-win64','chrome.exe');if(existsSync(p)){executablePath=p;break;}
}
const out='artifacts/aquapolis/live';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true,args:['--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:950}});
const errors=[],report={viewers:[],packs:[],errors};
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&/aquapolis|ecard2/.test(r.url()))errors.push(`${r.status()} ${r.url()}`);});
try{
 await page.goto('http://127.0.0.1:5173/?backend=webgl');
 await page.waitForFunction(()=>window.__holo?.ready&&window.__holo.gallery.stats()?.active,null,{timeout:90000});
 const count=await page.evaluate(()=>window.__holo.cards.filter(c=>c.pokemon?.setId==='ecard2').length);assert.equal(count,337);
 // Filter the real gallery controls, then inspect residency rather than preloading the set.
 const setSelect=page.locator('.gallery select').filter({has:page.locator('option[value="Aquapolis"]')});
 if(await setSelect.count()){
  await setSelect.first().selectOption('Aquapolis');
  await page.waitForFunction(()=>window.__holo.gallery.stats().filtered===337);
  await page.waitForFunction(()=>window.__holo.gallery.stats().visible>=8,null,{timeout:90000});report.gallery=await page.evaluate(()=>window.__holo.gallery.stats());
  assert.ok(report.gallery.domCards<337);await page.screenshot({path:`${out}/gallery.png`});
 }
 await page.evaluate(()=>window.__holo.gallery.close());
 for(const [n,variant] of [['1','normal'],['1','reverse'],['50b','normal'],['120','reverse'],['146','reverse'],['H01','holo'],['H16','holo'],['H31','holo'],['149','holo']]){
  const id=`pokemon:ecard2-${n}:${variant}`;
  await page.evaluate(async id=>{await window.__holo.setCard(id,true);window.__holo.pose(0,0);window.__holo.lighting.setPreset('Studio');},id);
  const stats=await page.evaluate(()=>window.__holo.stats());assert.equal(stats.profile,variant==='reverse'?'pokemon-e-reader':'print-only');
  await page.screenshot({path:`${out}/${n}-${variant}.png`});
  if(variant==='reverse'){await page.evaluate(()=>{window.__holo.pose(20,12);window.__holo.lighting.setPreset('Strip');});await page.screenshot({path:`${out}/${n}-grazing.png`});}
  report.viewers.push({id,profile:stats.profile});console.log('Viewer',id);
 }
 for(const [index,design] of ['Arcanine','Entei','Scizor','Tyranitar'].entries()){
  await page.evaluate(i=>{window.__holo.pack.close();window.__holo.pack.setSeed(i+20);return window.__holo.pack.browse();},index);
  await page.locator('dialog.pokemon-browser button').filter({has:page.locator('strong',{hasText:/^Pokémon$/})}).click();
  await page.getByRole('button',{name:'E-Card',exact:true}).click();
  await page.getByRole('button',{name:/^Aquapolis/}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('dialog.pokemon-browser .pokemon-booster img')].length===4&&[...document.querySelectorAll('dialog.pokemon-browser .pokemon-booster img')].every(img=>img.complete&&img.naturalWidth>0));
  await page.screenshot({path:`${out}/pack-picker-${index}.png`});
  await page.getByRole('button',{name:new RegExp(`^${design} booster`)}).click();
  await page.waitForFunction(()=>!['Closed','Loading'].includes(window.__holo.pack.stats().state),null,{timeout:90000});
  await page.evaluate(()=>window.__holo.pack.setStage('sealed'));
  await page.screenshot({path:`${out}/pack-${index}.png`});
  await page.evaluate(()=>window.__holo.pack.summary());
  const {cardIds,cardCount,state}=await page.evaluate(()=>window.__holo.pack.stats());
  assert.equal(cardCount,9);assert.equal(cardIds.filter(id=>id.endsWith(':reverse')).length,1);
  assert.ok(cardIds.every(id=>id.startsWith('pokemon:ecard2-')));
  report.packs.push({design,state,cardCount,cardIds});
  await page.screenshot({path:`${out}/pack-summary-${index}.png`});console.log('Pack',design,cardCount,state);
 }
 assert.deepEqual(errors,[]);
}finally{
 await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();
}
