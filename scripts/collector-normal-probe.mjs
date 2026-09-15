import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const out='artifacts/82-collector-normal-probe';await mkdir(out,{recursive:true});
const b=await chromium.launch({executablePath:'C:/Users/jpall/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',headless:true,args:['--enable-unsafe-webgpu','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1440,height:1100}});
try {
await p.goto('http://127.0.0.1:5173/');await p.waitForFunction(()=>window.__holo?.ready,null,{timeout:90000});
await p.evaluate(async()=>{const h=window.__holo;await h.setCard('ip-masquerena');await h.setProfile('ygo-collector');h.hideUI();h.pose(-15,-15);});
for(const [name,slope] of [['on',.6],['off',0],['exaggerated',8]]){
 await p.evaluate(v=>{const m=window.__holo.material(),u=m.optics;u.strength.value=0;u.glintStrength.value=0;u.patternedSilver.value=0;u.facetTilt.value=v;},slope);
 await p.waitForTimeout(200);await p.screenshot({path:`${out}/${name}.png`});
}
console.log(await p.evaluate(()=>{const m=window.__holo.material();return {normal:!!m.normalNode,normalType:m.normalNode?.constructor.name,field:m.optics.fieldBlend.value,enabled:m.optics.enabled.value,facet:m.optics.facetTilt.value};}));
const shader=await p.evaluate(async()=>{const h=window.__holo,card=h.scene.children.find(c=>Array.isArray(c.material)).clone();card.material=h.material();return h.renderer.debug.getShaderAsync(h.scene,h.camera,card);});
await writeFile(`${out}/shader.wgsl`,shader.fragmentShader);
await p.evaluate(()=>{const m=window.__holo.material();m.outputNode=m.reliefTextureNode;m.needsUpdate=true;});
await p.waitForTimeout(1000);await p.screenshot({path:`${out}/field.png`});
}finally{await b.close();}
