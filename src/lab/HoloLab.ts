import './lab.css';
import type { Scene } from 'three/webgpu';
import type { CardDefinition, CardMapPaths } from '../card/CardDefinition';
import type { CardFactory } from '../card/CardFactory';
import type { CardMotion } from '../input/Motion';
import type { StudioLighting } from '../lighting/StudioLighting';
import type { HolographicMaterial } from '../materials/HolographicMaterial';
import type { HolographicProfile } from '../materials/HolographicProfile';
import { resolveCardProfile } from '../materials/profiles/resolveCardProfile';
import { masterPrism } from '../materials/HolographicProfile';
import { ProfileState, cloneProfile } from './ProfileState';
import { deserializeProfile, serializeProfile, writeUserProfiles } from './ProfileCodec';
import { mechanisms, regionLayer, copyLayer, setValue, valueOf, type Region, type Mechanism } from './LayerCatalog';
import { LabRuntime, type Isolation } from './LabRuntime';
import { LabDiagnostics, diagnosticOptions } from './LabDiagnostics';
import { button, element, numeric, section, select, askName } from './LabControls';
import { inspectionControls } from './InspectionControls';

interface Context { material: () => HolographicMaterial; definition: () => CardDefinition; cards: CardDefinition[]; profiles: HolographicProfile[]; factory: CardFactory; lighting: StudioLighting; motion: CardMotion; scene: Scene; setCard: (id: string) => Promise<void>; importCard: () => Promise<void>; }
export function createHoloLab(context: Context) {
  document.body.classList.add('holo-lab');
  const root=element('div','hl-shell'), header=element('header','hl-header'), left=element('aside','hl-stack'), right=element('aside','hl-inspector'), footer=element('footer','hl-footer');
  left.setAttribute('aria-label','Material layers'); right.setAttribute('aria-label','Layer controls');
  root.append(header,left,right,footer); document.body.append(root);
  const brand=element('div','hl-brand'); brand.append(element('strong','','HOLO / LAB'),element('span','','FOIL DESIGNER')); header.append(brand);
  const status=element('span','hl-status','Preparing material…'); status.setAttribute('role','status');
  const report=(message: string) => status.textContent=message;
  let state=new ProfileState(resolveCardProfile(context.definition())), defaults=cloneProfile(state.current), region: Region='primary', mechanism: Mechanism='diffraction';
  let comparison: 'A'|'B'|undefined, selectedSpecial: 'maps'|'ink'|undefined, switching=false;
  const drafts=new Map<string,ProfileState>();
  const diagnostics=new LabDiagnostics(context.material,context.factory.assets,report);
  const runtime=new LabRuntime(context.factory,context.material,context.definition,report,() => void diagnostics.refresh());
  const working=() => comparison ? state.snapshot(comparison) ?? state.current : state.current;
  const apply=(immediate=false) => { runtime.region=region; runtime.mechanism=mechanism; runtime.apply(working(),immediate); void diagnostics.refresh(); refreshToolbar(); };
  const edit=(change: (p: HolographicProfile) => void, redraw=false) => { comparison=undefined; state.edit(change); apply(); if(redraw) draw(); };
  const cardSelect=select('Choose card',context.cards.map(c=>[c.id,`${c.title} · ${c.set}`]),id=>void changeCard(id)); cardSelect.value=context.definition().id;
  const profileSelect=select('Choose profile',[],id=>loadProfile(id));
  const topSelection=element('div','hl-selections'); topSelection.append(cardSelect,profileSelect); header.append(topSelection);
  const actions=element('div','hl-actions hl-top-actions'); header.append(actions);
  const undo=button('↶',()=>{ comparison=undefined; state.undo(); apply(true); draw(); },'Undo · Ctrl/Cmd Z'); undo.setAttribute('aria-label','Undo');
  const redo=button('↷',()=>{ comparison=undefined; state.redo(); apply(true); draw(); },'Redo · Ctrl/Cmd Shift Z'); redo.setAttribute('aria-label','Redo');
  const save=button('Save',()=>void saveProfile(false)); save.className='hl-primary';
  const menu=element('details','hl-menu'); menu.append(element('summary','','Profile ⋯')); const menuBody=element('div','hl-menu-body'); menu.append(menuBody);
  actions.append(undo,redo,save,menu);
  const exit=element('a','hl-exit','Viewer ↗'); const viewerURL=new URL(location.href); viewerURL.searchParams.delete('lab'); exit.href=viewerURL.href; header.append(exit);
  const dirty=element('span','hl-dirty');
  const draftKey=() => `${context.definition().id}:${state.baseline.id}`;
  function refreshProfiles() {
    profileSelect.replaceChildren();
    for(const family of [...new Set(context.profiles.map(p=>p.family))]) { const group=element('optgroup'); group.label=family; for(const p of context.profiles.filter(p=>p.family===family)) group.append(new Option(`${p.id.startsWith('user-')?'◇ ':''}${p.name}`,p.id)); profileSelect.append(group); }
    if(!context.profiles.some(p=>p.id===state.current.id)) profileSelect.add(new Option(state.current.name,state.current.id)); profileSelect.value=state.current.id;
  }
  function refreshToolbar() { undo.disabled=!state.canUndo; redo.disabled=!state.canRedo; dirty.textContent=comparison ? `Viewing ${comparison} · read-only snapshot` : state.dirty ? 'Unsaved working copy' : state.current.id.startsWith('user-')?'Saved in this browser':'Built-in · working copy'; root.dataset.comparison=comparison??''; for(const [slot,b] of compareButtons) b.setAttribute('aria-pressed',String(comparison===slot)); }
  function remember() { state.commit(); drafts.set(draftKey(),state); }
  function loadProfile(id: string) { remember(); defaults=cloneProfile(resolveCardProfile(context.definition(),id)); state=drafts.get(`${context.definition().id}:${id}`)??new ProfileState(defaults); comparison=undefined; runtime.isolation='none'; isolation.value='none'; diagnostics.mode='final'; diagnostic.value='final'; region='primary'; selectedSpecial=undefined; refreshProfiles(); draw(); apply(true); }
  async function changeCard(id: string) { if(switching) return; switching=true; cardSelect.disabled=true; remember(); try { await context.setCard(id); loadProfile(context.definition().profile); } catch(error) { report(String(error)); } finally { switching=false; cardSelect.disabled=false; cardSelect.value=context.definition().id; } }
  function persist(profiles: HolographicProfile[]) { writeUserProfiles(localStorage,profiles); context.profiles.splice(0,context.profiles.length,...profiles); }
  async function saveProfile(asNew: boolean) {
    try {
      const needsName=asNew||!state.current.id.startsWith('user-');
      const name=needsName?await askName('Save profile as',`${state.current.name} · study`):state.current.name; if(!name) return;
      const p=deserializeProfile(serializeProfile(state.current)); p.id=needsName?`user-${crypto.randomUUID()}`:p.id; p.name=name; p.labOnly=false;
      persist([...context.profiles.filter(item=>item.id!==p.id),p]); const oldKey=draftKey();state.markSaved(p);drafts.delete(oldKey);drafts.set(draftKey(),state); refreshProfiles(); apply(true); report('Saved in this browser · export JSON for a portable copy');
    } catch(error) { report(`Save failed: ${error instanceof Error?error.message:error}. Export JSON to keep your work.`); }
  }
  menuBody.append(button('New profile',async()=>{ const name=await askName('New profile','Untitled finish'); if(!name)return; remember(); const p=cloneProfile(masterPrism); p.id=`draft-${crypto.randomUUID()}`;p.name=name;p.family=context.definition().franchise; state=new ProfileState(p); defaults=cloneProfile(p);comparison=undefined;refreshProfiles();draw();apply(true); }),button('Duplicate profile',()=>void saveProfile(true)),button('Save as…',()=>void saveProfile(true)),button('Reset changes',()=>{comparison=undefined;state.reset();draw();apply(true);}),button('Restore loaded defaults',()=>{comparison=undefined;state.replace(defaults);draw();apply(true);}),button('Rename user profile',async()=>{ if(!state.current.id.startsWith('user-')){report('Save a user copy before renaming a built-in profile.');return;} const name=await askName('Rename profile',state.current.name);if(name){edit(p=>p.name=name);refreshProfiles();} }),button('Delete user profile',async()=>{
    if(!state.current.id.startsWith('user-')){report('Built-in profiles are protected.');return;}
    const name=await askName('Type the profile name to delete', ''); if(name!==state.current.name)return;
    try { const id=state.current.id; persist(context.profiles.filter(p=>p.id!==id)); for(const key of drafts.keys())if(key.endsWith(`:${id}`))drafts.delete(key);loadProfile(context.definition().profile); }catch(error){report(`Delete failed: ${error}`);}
  }),button('Export profile JSON',()=>{try{const blob=new Blob([serializeProfile(state.current)],{type:'application/json'});const url=URL.createObjectURL(blob),a=element('a');a.href=url;a.download=`${state.current.name.replace(/[^a-z0-9-]/gi,'-')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);report('Exported working material as HolographicProfile JSON');}catch(error){report(String(error));}}));
  const importInput=element('input');importInput.type='file';importInput.accept='.json,application/json';importInput.hidden=true;
  importInput.onchange=async()=>{try{const file=importInput.files?.[0];if(!file)return;if(file.size>256000)throw new Error('Profile exceeds 256 KB.');const p=deserializeProfile(await file.text());p.id=`draft-${crypto.randomUUID()}`;remember();state=new ProfileState(p);defaults=cloneProfile(p);comparison=undefined;refreshProfiles();draw();apply(true);report('Imported working copy · Save to add it to the viewer');}catch(error){report(`Import failed: ${error instanceof Error?error.message:error}`);}finally{importInput.value='';}};
  menuBody.append(button('Import profile JSON',()=>importInput.click()),button('Import card + maps',()=>void context.importCard().then(()=>{cardSelect.replaceChildren(...context.cards.map(c=>new Option(`${c.title} · ${c.set}`,c.id)));cardSelect.value=context.definition().id;loadProfile(context.definition().profile);}).catch(error=>report(String(error)))),importInput);
  menuBody.addEventListener('click',event=>{if((event.target as HTMLElement).closest('button'))menu.open=false;});
  const stackHead=element('div','hl-panel-head');stackHead.append(element('span','hl-eyebrow','MATERIAL ASSEMBLY'),element('h1','','Layer stack'),element('p','','Fixed physical order · independent optical regions'));left.append(stackHead);
  const stack=element('div','hl-layers');left.append(stack);
  const inspectionHost=element('div','hl-inspection');left.append(inspectionHost);const disposeInspection=inspectionControls(inspectionHost,context.lighting,context.scene,context.motion);
  const compare=element('div','hl-compare'); const compareButtons=new Map<'A'|'B',HTMLButtonElement>();
  for(const slot of ['A','B'] as const){const view=button(slot,()=>{if(!state.snapshot(slot)){report(`Store ${slot} first.`);return;}comparison=slot;apply(true);draw();},`View material ${slot}`);compareButtons.set(slot,view);compare.append(button(`Store ${slot}`,()=>{state.store(slot);report(`Stored ${slot} · material only`);}),view);}
  compare.append(button('Working',()=>{comparison=undefined;draw();apply(true);}));
  const diagnostic=select('Material diagnostic',diagnosticOptions,value=>{diagnostics.mode=value;void diagnostics.refresh();});
  const isolation=select('Contribution isolation', [['none','All contributions'],['optical','Optical contribution only'],['physical','Physical lighting only'],['neutral','Neutral reflection'],['spectral','Diffraction / image only'],['sparkle','Sparkle / microcuts only'],['relief','Relief on substrate'],['varnish','Varnish on substrate'],['laminate','Laminate on substrate'],['selected','Selected layer + print'],['bypass','Selected layer bypassed']],value=>{runtime.isolation=value as Isolation;apply(true);});
  const final=button('Final material',()=>{diagnostic.value=diagnostics.mode='final';isolation.value=runtime.isolation='none';comparison=undefined;draw();apply(true);});final.className='hl-final';
  footer.append(compare,diagnostic,isolation,final,dirty,status);
  function drawStack(){
    stack.replaceChildren();
    stack.append(button('01  Printed card substrate',()=>{selectedSpecial='maps';draw();},'Artwork is preserved; inspect authored maps'));
    for(const [index,r] of (['primary','secondary','stamp'] as Region[]).entries()){
      const layer=regionLayer(working(),r),group=section(`${String(index+2).padStart(2,'0')}  ${r==='primary'?'Primary foil':r==='secondary'?'Secondary foil':'Security stamp'}`,r===region);group.className+=' hl-region';
      if(!layer){group.open=false;group.append(element('p','hl-note','No independent foil assigned.'),button(`Add ${r}`,()=>edit(p=>{if(r!=='primary')p[r]=copyLayer(p);},true)));stack.append(group);continue;}
      const toggle=element('label','hl-check'),enabled=element('input');enabled.type='checkbox';enabled.checked=layer.enabled!==false;enabled.onchange=()=>edit(p=>{regionLayer(p,r)!.enabled=enabled.checked;});toggle.append(enabled,document.createTextNode('Enable region'));group.append(toggle);
      for(const m of mechanisms){const b=button(m.name,()=>{region=r;mechanism=m.id;selectedSpecial=undefined;runtime.region=r;runtime.mechanism=m.id;draw();if(runtime.isolation==='selected'||runtime.isolation==='bypass')apply(true);});b.className='hl-layer';b.setAttribute('aria-pressed',String(region===r&&mechanism===m.id&&!selectedSpecial));b.dataset.disabled=String(layer.disabledMechanisms?.includes(m.id)??false);const hint=element('small','',m.kind);b.append(hint);group.append(b);}
      stack.append(group);
    }
    stack.append(button('05  Metallic / protected regions',()=>{selectedSpecial='ink';draw();}),button('06  Authored map assignments',()=>{selectedSpecial='maps';draw();}));
  }
  function draw(){drawStack();right.replaceChildren();right.inert=!!comparison;right.dataset.snapshot=comparison??'';refreshToolbar();
    if(selectedSpecial==='maps'){drawMaps();return;}if(selectedSpecial==='ink'){drawInk();return;}
    const layer=regionLayer(working(),region);if(!layer){region='primary';draw();return;}const spec=mechanisms.find(m=>m.id===mechanism)!;
    const head=element('div','hl-panel-head');head.append(element('span','hl-eyebrow',`${region.toUpperCase()} / ${spec.kind.toUpperCase()}`),element('h2','',spec.name),element('p','',spec.description));right.append(head);
    const controls=element('div','hl-layer-tools'), toggle=element('label','hl-check'),check=element('input');check.type='checkbox';check.checked=!layer.disabledMechanisms?.includes(mechanism);check.onchange=()=>edit(p=>{const l=regionLayer(p,region)!;l.disabledMechanisms=(l.disabledMechanisms??[]).filter(m=>m!==mechanism);if(!check.checked)l.disabledMechanisms.push(mechanism);},true);toggle.append(check,document.createTextNode('Enabled'));controls.append(toggle,button('Isolate',()=>{runtime.isolation='selected';isolation.value='selected';apply(true);}),button('Bypass',()=>{runtime.isolation='bypass';isolation.value='bypass';apply(true);}),button('Reset layer',()=>edit(p=>{const original=regionLayer(defaults,region);const target=regionLayer(p,region)!;if(original)for(const param of spec.parameters){const originalGroup=original[param.group] as unknown as Record<string,unknown>,targetGroup=target[param.group] as unknown as Record<string,unknown>;if(param.key in originalGroup)targetGroup[param.key]=structuredClone(originalGroup[param.key]);else delete targetGroup[param.key];}target.disabledMechanisms=target.disabledMechanisms?.filter(m=>m!==mechanism);if(!target.disabledMechanisms?.length)delete target.disabledMechanisms;},true)));right.append(controls);
    const start=()=>{comparison=undefined;state.begin();};const commit=()=>{state.commit();apply(true);};
    if(mechanism==='diffraction'){
      const pattern=section('Manufacturing pattern',false);const choices=[...new Set(context.profiles.map(p=>p.structure.field))].filter(field=>field!=='symbol-foil'||!!layer.structure.motif);const field=select('Manufacturing pattern',choices.map(f=>[f,f.replaceAll('-',' ')]),v=>edit(p=>{regionLayer(p,region)!.structure.field=v as typeof layer.structure.field;},true));field.value=layer.structure.field;pattern.append(field,element('p','hl-note','Pattern changes prepare a manufacturing field. Authored direction maps take precedence.'));
      const presets=select('Diffraction starting point',[['','Starting points…'],['broad','Broad spectrum'],['narrow','Narrow spectrum'],['fine','Fine directional lines'],['coarse','Coarse facets']],v=>{if(!v)return;edit(p=>{const l=regionLayer(p,region)!;if(v==='broad'){l.diffraction.bandwidth=.075;l.diffraction.crossWidth=.4;}if(v==='narrow'){l.diffraction.bandwidth=.018;l.diffraction.crossWidth=.12;}if(v==='fine'){l.structure.field='vertical-line';l.structure.scale=320;}if(v==='coarse'){l.structure.field='crystal';l.structure.scale=50;}},true);});pattern.append(presets);right.append(pattern);
    }
    const groups=new Map<string,HTMLDetailsElement>();for(const param of spec.parameters){if(layer.structure.field==='starlight' && ['direction','crossWidth','crossing','facetCoupling','engraving','gridStrength','gridScale','gridTravel','gridWidth','density'].includes(param.key))continue;if(layer.structure.field==='plain'&&['engraving','scale','gridStrength','gridScale','gridTravel','gridWidth','facetCoupling'].includes(param.key)&&param.group==='structure')continue;if(['gridScale','gridTravel','gridWidth'].includes(param.key)&&!layer.structure.gridStrength)continue;const groupName=param.group==='diffraction'?'Optical response':param.group==='structure'?'Pattern & relief':param.group==='glints'?'Angular response':'Surface';if(!groups.has(groupName)){const g=section(groupName,groupName!=='Pattern & relief');groups.set(groupName,g);right.append(g);}const c=numeric(param.label,valueOf(layer,param),param.min,param.max,param.step,n=>edit(p=>setValue(regionLayer(p,region)!,param,n)),start,commit);groups.get(groupName)!.append(c.row);}
    if(mechanism==='reflection'&&region==='primary'&&context.definition().maps?.roughness){const coverage=section('Authored roughness');const mode=select('Roughness interpretation',[['absolute','Authored absolute'],['offset','Authored variation'],['profile','Profile roughness']],value=>edit(p=>{p.mapSettings??={};p.mapSettings.roughnessMode=value as 'absolute'|'offset'|'profile';}));mode.value=working().mapSettings?.roughnessMode??context.definition().mapSettings?.roughnessMode??'absolute';coverage.append(mode,element('p','hl-note','Absolute map values take precedence over foil roughness. Choose profile roughness to tune the uniform surface.'));right.append(coverage);}
    if(mechanism==='relief'&&region==='primary'){const maps=section('Authored surface response');for(const [key,label,fallback] of [['normalScale','Normal strength',context.definition().mapSettings?.normalScale??1],['embossStrength','Authored emboss depth',context.definition().mapSettings?.embossStrength??.25]] as const){const c=numeric(label,working().mapSettings?.[key]??fallback,0,4,.01,n=>edit(p=>{p.mapSettings??={};p.mapSettings[key]=n;}),start,commit);maps.append(c.row);}right.append(maps);}
    const tools=section('Region operations',false);for(const target of ['secondary','stamp'] as const)if(target!==region&&!state.current[target])tools.append(button(`Duplicate region into ${target}`,()=>edit(p=>p[target]=copyLayer(regionLayer(p,region)!),true)));if(region!=='primary')tools.append(button('Remove region',()=>{edit(p=>{delete p[region as 'secondary'|'stamp'];},true);}));tools.append(element('p','hl-note','Stamp coverage takes priority over secondary foil, then primary foil. Regions cannot be reordered. Each destination uses its own authored mask.'));right.append(tools);
  }
  function drawInk(){right.append(element('span','hl-eyebrow','PROTECTIVE / PRINTED REGIONS'),element('h2','','Metallic ink & print'),element('p','hl-note','Protected print is baked into the packed coverage from the authored protection map. Original artwork and maps remain untouched.'));
    const ink=working().metallicInk;for(const [key,label,fallback] of [['metalness','Metallic ink response',.85],['roughness','Metallic ink roughness',.28]] as const){const c=numeric(label,ink?.[key]??fallback,0,1,.01,n=>edit(p=>{p.metallicInk??={metalness:.85,roughness:.28};p.metallicInk[key]=n;}),()=>state.begin(),()=>state.commit());right.append(c.row);}
    right.append(button('Preview metallic coverage',()=>{diagnostics.mode=diagnostic.value='metal';void diagnostics.refresh();}),button('Inspect protection map',()=>{selectedSpecial='maps';draw();}));const extended=element('label','hl-check'),check=element('input');check.type='checkbox';check.checked=!!state.current.extendedCoverage;check.onchange=()=>edit(p=>p.extendedCoverage=check.checked);extended.append(check,document.createTextNode('Use authored extended foil coverage'));right.append(extended);
  }
  function drawMaps(){right.append(element('span','hl-eyebrow','AUTHORED DATA'),element('h2','','Card maps'),element('p','hl-note','Select a map to preview it on the 3D card. Assign project paths to override channels for this profile. Source artwork is never edited.'));
    const paths={...context.definition().maps,...working().maps};const keys: Array<keyof CardMapPaths>=['coverage','foil','reverseFoil','extendedFoil','protection','surface','height','roughness','normal','direction','pattern','metallic','stamp','laminate','secondaryFoil','secondaryDirection','secondaryPattern','stampDirection','stampPattern','sparkle','hologram','motif'];
    for(const key of keys){const row=element('div','hl-map');const path=paths[key];const preview=button(key.replace(/([A-Z])/g,' $1'),()=>{if(path){diagnostics.mode=`map:${path}`;void diagnostics.refresh();report(`Previewing authored ${key} · use Final material to leave`);}});preview.disabled=!path;row.append(preview,element('small','',path?path.split('/').at(-1)!:'Packed / generated default'));const input=element('input');input.type='text';input.value=path??'';input.placeholder='/cards/…/map.png';input.setAttribute('aria-label',`${key} map assignment`);input.onchange=()=>{const value=input.value.trim();try{const p=cloneProfile(state.current);p.maps??={};if(value)p.maps[key]=value;else delete p.maps[key];deserializeProfile(serializeProfile(p));edit(current=>{current.maps=p.maps;},false);apply(true);}catch(error){report(String(error));input.value=path??'';}};row.append(input,button('↶',()=>edit(p=>{if(p.maps)delete p.maps[key];},true),'Use card map'));right.append(row);}
  }
  const keydown=(event: KeyboardEvent)=>{if((event.target as HTMLElement).matches('input,textarea,select')||document.querySelector('dialog[open]'))return;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();(event.shiftKey?redo:undo).click();}if(event.key==='Escape')final.click();};document.addEventListener('keydown',keydown);
  const beforeUnload=(event: BeforeUnloadEvent)=>{if(state.dirty||state.current.id.startsWith('draft-')||[...drafts.values()].some(d=>d.dirty||d.current.id.startsWith('draft-'))){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',beforeUnload);
  refreshProfiles();draw();apply(true);
  return { get state(){return state;}, runtime, diagnostics, loadProfile, apply, dispose:()=>{runtime.dispose();diagnostics.dispose();disposeInspection();root.remove();document.body.classList.remove('holo-lab');document.removeEventListener('keydown',keydown);window.removeEventListener('beforeunload',beforeUnload);} };
}
