import './artifacts.css';
import { WebGPURenderer, Scene, PerspectiveCamera, Color, DirectionalLight, HemisphereLight, PMREMGenerator, Vector3, NeutralToneMapping } from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { artifacts } from './registry';
import type { ArtifactDefinition, ArtifactInstance, Inspection } from './types';

export async function startArtifacts() {
  document.title = 'Artifacts · Holo';
  document.querySelector('#ui')?.remove();
  const host=document.querySelector<HTMLElement>('#studio')!;
  host.className='artifact-page'; host.setAttribute('aria-label','Interactive artifact viewer');
  host.innerHTML=`<header class="artifact-header"><a class="artifact-brand" href="${import.meta.env.BASE_URL}">HOLO <span>/ ARTIFACTS</span></a><a href="${import.meta.env.BASE_URL}">Card studio ↗</a></header>
    <div class="artifact-stage" tabindex="0" aria-label="3D artifact. Drag to rotate, scroll to zoom. Arrow keys rotate; plus and minus zoom."></div>
    <div class="artifact-caption"><p class="artifact-eyebrow"></p><h1></h1><p class="artifact-description"></p></div>
    <aside class="artifact-panel" aria-label="Artifact controls"><label class="artifact-label" for="artifact-picker">COLLECTION</label><div class="artifact-selection"><img alt="Reference image"/><select id="artifact-picker" aria-label="Choose artifact"></select></div><div class="artifact-options"></div></aside>
    <footer class="artifact-footer"><span>DRAG TO ORBIT <i>·</i> SCROLL TO APPROACH</span><div><button id="artifact-reset">Reset view</button><button id="artifact-fullscreen">Fullscreen ⛶</button></div></footer><p class="artifact-status" role="status" aria-live="polite"></p>`;
  const stage=host.querySelector<HTMLElement>('.artifact-stage')!;
  const status=host.querySelector<HTMLElement>('.artifact-status')!;
  const loading=document.querySelector<HTMLElement>('#loading')!;
  loading.querySelector('.loading-label')!.textContent='Assembling artifact…';
  const renderer=new WebGPURenderer({antialias:true,forceWebGL:new URLSearchParams(location.search).get('backend')==='webgl'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75)); renderer.toneMapping=NeutralToneMapping;renderer.toneMappingExposure=1.15;stage.append(renderer.domElement);await renderer.init();
  const scene=new Scene();scene.background=new Color(0x000000);
  const camera=new PerspectiveCamera(34,1,.1,100);
  const controls=new OrbitControls(camera,stage);controls.enableDamping=true;controls.dampingFactor=.085;controls.enablePan=false;controls.minDistance=5;controls.maxDistance=24;
  const room=new RoomEnvironment();const generator=new PMREMGenerator(renderer);const env=await generator.fromSceneAsync(room,.04);scene.environment=env.texture;scene.environmentIntensity=.55;room.dispose();generator.dispose();
  const key=new DirectionalLight(0xffedce,3.5);key.position.set(-3,5,6);scene.add(key);
  const rim=new DirectionalLight(0xc4e4ee,3);rim.position.set(1,3,-4);scene.add(rim);
  const fill=new HemisphereLight(0xd8e7ed,0x28221c,1.4);scene.add(fill);
  let current:ArtifactInstance|undefined, definition:ArtifactDefinition, request:AbortController|undefined, disposed=false, explosion=0;
  let origins=new Map<string,Vector3>();let lightAzimuth=-35,lightElevation=45;
  const abort=new AbortController();const signal=abort.signal;
  const options=host.querySelector<HTMLElement>('.artifact-options')!;
  const picker=host.querySelector<HTMLSelectElement>('#artifact-picker')!;
  for(const item of artifacts)picker.add(new Option(item.name,item.id));
  function lightPosition(){const a=lightAzimuth*Math.PI/180,e=lightElevation*Math.PI/180;key.position.set(Math.sin(a)*7*Math.cos(e),Math.sin(e)*7,Math.cos(a)*7*Math.cos(e));}
  function preset(name:string){
    if(name==='Soft'){key.color.set('#e4eeff');key.intensity=2;rim.intensity=1;fill.intensity=2;scene.environmentIntensity=.8;}
    else if(name==='Rim'){key.color.set('#fff0d2');key.intensity=1.2;rim.intensity=6;fill.intensity=.5;scene.environmentIntensity=.3;}
    else {key.color.set('#ffedce');key.intensity=3.5;rim.intensity=3;fill.intensity=1.4;scene.environmentIntensity=.55;}
  }
  function resetCamera(){camera.position.fromArray(definition.camera.position);controls.target.fromArray(definition.camera.target);if(stage.clientWidth/stage.clientHeight<1)camera.position.sub(controls.target).multiplyScalar(1.4).add(controls.target);controls.update();}
  function selectControl(label:string,values:string[],selected:string,change:(value:string)=>void){const wrap=document.createElement('label');wrap.className='artifact-field';const title=document.createElement('span');title.textContent=label;const select=document.createElement('select');select.setAttribute('aria-label',label);for(const value of values)select.add(new Option(value[0].toUpperCase()+value.slice(1),value));select.value=selected;select.onchange=()=>change(select.value);wrap.append(title,select);options.append(wrap);}
  function slider(label:string,min:number,max:number,value:number,change:(v:number)=>void){const wrap=document.createElement('label');wrap.className='artifact-field';const title=document.createElement('span');title.textContent=label;const output=document.createElement('output');output.textContent=String(value);const input=document.createElement('input');input.type='range';input.min=String(min);input.max=String(max);input.value=String(value);input.setAttribute('aria-label',label);input.oninput=()=>{output.value=input.value;change(Number(input.value));};wrap.append(title,output,input);options.append(wrap);}
  async function select(id:string){
    request?.abort();const pending=new AbortController();request=pending;current?.dispose();current=undefined;origins.clear();explosion=0;options.replaceChildren();status.textContent='Assembling artifact…';
    definition=artifacts.find(a=>a.id===id)!;
    host.querySelector('h1')!.textContent=definition.name;host.querySelector('.artifact-eyebrow')!.textContent=definition.subtitle;host.querySelector('.artifact-description')!.textContent=definition.description;host.querySelector('img')!.src=definition.thumbnail;
    const cap=definition.capabilities;controls.enableRotate=cap.rotate;controls.enableZoom=cap.zoom;host.querySelector<HTMLButtonElement>('#artifact-fullscreen')!.hidden=!cap.fullscreen;
    resetCamera();preset(definition.lighting);lightAzimuth=-35;lightElevation=45;lightPosition();
    try {
      const loaded=await definition.load(pending.signal);if(disposed||pending.signal.aborted){loaded.dispose();return;}current=loaded;scene.add(loaded.root);
      for(const [id,group] of current.groups)origins.set(id,group.position.clone());
      if(cap.inspection){current.inspect(definition.inspection[0]);selectControl('Shell',definition.inspection,definition.inspection[0],v=>current?.inspect(v as Inspection));}
      if(cap.exploded){slider('Exploded view',0,100,0,v=>{explosion=v/100;});const note=document.createElement('p');note.className='artifact-control-note';note.textContent=`${definition.explodedGroups.length} assemblies · separate to inspect`;options.append(note);}
      if(cap.lighting)selectControl('Lighting',['Studio','Soft','Rim'],definition.lighting,preset);
      if(cap.movableLight){slider('Light azimuth',-180,180,-35,v=>{lightAzimuth=v;lightPosition();});slider('Light elevation',-20,85,45,v=>{lightElevation=v;lightPosition();});}
      await renderer.compileAsync(scene,camera);if(pending.signal.aborted||disposed)return;loading.hidden=true;status.textContent='';host.dataset.ready='true';
    }catch(error){if(pending.signal.aborted)return;loading.hidden=true;status.textContent=`Unable to load artifact. ${error instanceof Error?error.message:String(error)}`;}
  }
  picker.onchange=()=>{void select(picker.value);};
  host.querySelector<HTMLButtonElement>('#artifact-reset')!.onclick=()=>{void select(picker.value);};
  const fullscreen=host.querySelector<HTMLButtonElement>('#artifact-fullscreen')!;
  fullscreen.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await host.requestFullscreen();}catch{status.textContent='Fullscreen is unavailable in this browser.';}};
  document.addEventListener('fullscreenchange',()=>{fullscreen.textContent=document.fullscreenElement?'Exit fullscreen ⛶':'Fullscreen ⛶';},{signal});
  stage.addEventListener('keydown',event=>{if(!definition)return;const delta=camera.position.clone().sub(controls.target);if(definition.capabilities.rotate&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();delta.applyAxisAngle(new Vector3(event.key==='ArrowUp'||event.key==='ArrowDown'?1:0,event.key==='ArrowLeft'||event.key==='ArrowRight'?1:0,0),event.key==='ArrowLeft'||event.key==='ArrowUp'?.1:-.1);}else if(definition.capabilities.zoom&&['+','=','-'].includes(event.key)){event.preventDefault();delta.multiplyScalar(event.key==='-'?1.1:.9);delta.clampLength(controls.minDistance,controls.maxDistance);}else return;camera.position.copy(controls.target).add(delta);controls.update();},{signal});
  const resize=()=>{const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(stage);resize();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let last=performance.now();renderer.setAnimationLoop(()=>{const now=performance.now(),dt=Math.min((now-last)/1000,.1);last=now;controls.update();if(current)current.root.scale.setScalar(1/(1+explosion*.42));if(current)for(const item of definition.explodedGroups){const group=current.groups.get(item.id),origin=origins.get(item.id);if(group&&origin){const target=origin.clone().addScaledVector(new Vector3(...item.offset),explosion);group.position.lerp(target,reduced.matches?1:1-Math.exp(-dt*10));}}renderer.render(scene,camera);});
  window.addEventListener('pagehide',()=>{disposed=true;request?.abort();abort.abort();observer.disconnect();controls.dispose();renderer.setAnimationLoop(null);current?.dispose();env.dispose();scene.clear();renderer.dispose();},{once:true});
  await select(artifacts[0].id);
}
