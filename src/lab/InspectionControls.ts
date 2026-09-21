import { Color, Euler, type Scene } from 'three/webgpu';
import type { StudioLighting } from '../lighting/StudioLighting';
import type { CardMotion } from '../input/Motion';
import { button, element, numeric, section, select } from './LabControls';
const degrees = 180 / Math.PI;
export function inspectionControls(root: HTMLElement, lighting: StudioLighting, scene: Scene, motion: CardMotion) {
  const pose = section('Pose & inspection', false), light = section('Lighting studio', false); root.append(light, pose);
  let sweep = false, azimuth = Math.atan2(lighting.key.position.x,lighting.key.position.z)*degrees, elevation = Math.asin(lighting.key.position.y/lighting.key.position.length())*degrees, distance = lighting.key.position.length(), temperature = 5600;
  const aim = () => { const az = azimuth / degrees, el = elevation / degrees; lighting.key.position.set(Math.sin(az)*Math.cos(el)*distance, Math.sin(el)*distance, Math.cos(az)*Math.cos(el)*distance); lighting.key.lookAt(0,0,0); };
  const rigs: Record<string, [number, number, number, number, number, number, number, number]> = {
    'Neutral studio': [-30,30,17,1.5,2.5,130,.65,.7], 'Broad softbox': [-25,25,17,7,11,9.2,1.2,1.1], 'Narrow grazing': [-75,10,15,.4,9,150,.15,.2],
    'Dark inspection': [-40,35,17,1.5,2.5,80,.08,.1], 'Foil inspection': [-25,10,14,1,7,100,.3,.4], 'Near-front reflection': [3,4,17,3,5,65,.4,.5], 'Strong side reflection': [65,15,16,2,7,140,.2,.3], 'Moving strip sweep': [0,15,16,.5,9,150,.2,.3],
  };
  light.append(select('Lighting rig', Object.keys(rigs).map(name => [name,name]), name => {
    const v = rigs[name]; [azimuth,elevation,distance,lighting.key.width,lighting.key.height,lighting.key.intensity,lighting.fill.intensity,scene.environmentIntensity] = v;
    lighting.strip.intensity = name === 'Neutral studio' ? 1.4 : .3; sweep = name === 'Moving strip sweep'; aim(); refreshLights();
  }));
  const lightingBindings: Array<() => void> = [];
  for (const [label,min,max,step,get,set] of [
    ['Azimuth · °',-180,180,.1,() => azimuth,(n: number) => { azimuth=n; sweep=false; aim(); }], ['Elevation · °',-80,80,.1,() => elevation,(n: number) => { elevation=n; aim(); }], ['Distance · cm',8,35,.1,() => distance,(n: number) => { distance=n; aim(); }],
    ['Emitter width · cm',.2,12,.1,() => lighting.key.width,(n: number) => lighting.key.width=n], ['Emitter height · cm',.2,16,.1,() => lighting.key.height,(n: number) => lighting.key.height=n], ['Key intensity',0,180,.5,() => lighting.key.intensity,(n: number) => lighting.key.intensity=n],
    ['Temperature · K',2700,9000,50,() => temperature,(n: number) => { temperature=n; const t=(n-2700)/6300; lighting.key.color.copy(new Color(1,.72,.43).lerp(new Color(.72,.84,1),t)); }],
    ['Environment',0,1.5,.01,() => scene.environmentIntensity,(n: number) => scene.environmentIntensity=n], ['Fill',0,1.5,.01,() => lighting.fill.intensity,(n: number) => lighting.fill.intensity=n],
  ] as const) { const control = numeric(label,get(),min,max,step,set); light.append(control.row); lightingBindings.push(() => control.update(get())); }
  const refreshLights = () => lightingBindings.forEach(update => update());
  const angles = () => { const e = new Euler().setFromQuaternion(motion.orientation,'ZYX'); return [e.y*degrees,e.x*degrees,e.z*degrees]; };
  const poseControls = ['Yaw · °','Pitch · °','Roll · °'].map((label,i) => {
    const control = numeric(label,angles()[i],-180,180,.1,n => { const v=angles(); v[i]=n; motion.precise = true; motion.setPose(v[0]/degrees,v[1]/degrees,v[2]/degrees); }); pose.append(control.row); return control;
  });
  const buttons = element('div','hl-actions'); pose.append(buttons);
  for (const [label,y,p,r] of [['Face-on',0,0,0],['Etch',-15,-15,0],['Grazing',75,0,0],['Diagonal',-28,24,20]] as const) buttons.append(button(label,() => { motion.precise=true; motion.setPose(y/degrees,p/degrees,r/degrees); }));
  const precision = element('label','hl-check'), check=element('input'); check.type='checkbox'; check.onchange=() => motion.precise=check.checked; precision.append(check,document.createTextNode('Hold precise pose · suppress pointer hover')); pose.append(precision);
  const presets: Array<{ name: string; pose: number[]; zoom: number; light: number[]; color: number[]; strip: number; back: number }> = [];
  const stored = select('Temporary inspection preset', [['','Inspection presets']], value => {
    const p=presets[Number(value)]; if (!p) return; sweep=false; motion.precise=true; motion.setPose(0,0,0); motion.manual.fromArray(p.pose); motion.orientation.copy(motion.manual); motion.zoom=motion.targetZoom=p.zoom;
    [azimuth,elevation,distance,lighting.key.width,lighting.key.height,lighting.key.intensity,lighting.fill.intensity,scene.environmentIntensity,temperature]=p.light;
    lighting.key.color.fromArray(p.color); lighting.strip.intensity=p.strip; lighting.back.intensity=p.back; aim(); refreshLights();
  });
  pose.append(stored,button('Store pose + light',() => { const name=`Inspection ${presets.length+1}`; presets.push({ name,pose:motion.orientation.toArray(),zoom:motion.zoom,light:[azimuth,elevation,distance,lighting.key.width,lighting.key.height,lighting.key.intensity,lighting.fill.intensity,scene.environmentIntensity,temperature],color:lighting.key.color.toArray(),strip:lighting.strip.intensity,back:lighting.back.intensity }); stored.add(new Option(name,String(presets.length-1))); stored.value=String(presets.length-1); }));
  let frame=0; const tick=(time: number) => { if (sweep) { azimuth=Math.sin(time*.00035)*70; aim(); } frame=requestAnimationFrame(tick); }; frame=requestAnimationFrame(tick);
  const timer=window.setInterval(() => { const values=angles(); poseControls.forEach((c,i) => c.update(values[i])); check.checked=motion.precise; if(sweep) refreshLights(); },200);
  return () => { cancelAnimationFrame(frame); clearInterval(timer); motion.precise=false; };
}
