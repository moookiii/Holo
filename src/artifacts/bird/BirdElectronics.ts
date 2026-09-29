import { Group, Vector3 } from 'three/webgpu';
import { BirdParts, ref, type P, type XY } from './BirdParts.ts';

export interface BoardMount { group: Group; point: (local: P) => P; ports: P[]; }
export interface Electronics { mounts: Map<string, BoardMount>; }

function chip(parts: BirdParts, group: Group, x: number, y: number, w: number, h: number, pins: number, z = .049) {
  const m = parts.m;
  parts.box(group, [x, y, z + .024], [w, h, .049], m.black);
  parts.ball(group, [x - w * .32, y + h * .29, z + .05], [.009, .009, .002], m.silk);
  for (const sign of [-1, 1]) for (let i = 0; i < pins; i++) {
    const px = x - w * .4 + i * w * .8 / (pins - 1);
    parts.box(group, [px, y + sign * (h / 2 + .022), z + .01], [.010, .042, .012], m.solder);
    parts.box(group, [px, y + sign * (h / 2 + .037), .036], [.017, .029, .006], m.brass);
  }
  for (let line = 0; line < 3; line++) {
    for (let k = 0; k < 6; k++) parts.box(group, [x - w * .3 + k * w * .1, y + h * .12 - line * .014, z + .05], [.005 + (k % 3) * .005, .003, .001], m.silk);
  }
}

function capacitor(parts: BirdParts, group: Group, x: number, y: number, r: number, h: number) {
  parts.cylinder(group, [x, y, .045 + h / 2], r, h, parts.m.black, 16);
  parts.cylinder(group, [x, y, .047 + h], r * .88, .006, parts.m.aluminium, 16);
  parts.box(group, [x, y, .052 + h], [r * 1.2, .006, .002], parts.m.steel);
  parts.box(group, [x, y, .053 + h], [.006, r * 1.2, .002], parts.m.steel);
  parts.box(group, [x + r * .84, y, .045 + h / 2], [.012, r * .58, h * .7], parts.m.silk);
}

/** A populated board is authored in local XY; Z+ is the component face. */
function board(parts: BirdParts, parent: Group, name: string, at: P, rotation: P, w: number, h: number, seed: number, kind: 'logic' | 'driver' | 'memory' | 'sensor' = 'logic'): BoardMount {
  const group = parts.group(parent, name, at, rotation), m = parts.m;
  // Cut corners and an edge notch give actual board silhouettes.
  const c = .055, outline: XY[] = [[-w/2+c,-h/2], [w/2-c,-h/2], [w/2,-h/2+c], [w/2,h*.14], [w/2-.045,h*.14], [w/2-.045,h*.28], [w/2,h*.28], [w/2,h/2-c], [w/2-c,h/2], [-w/2+c,h/2], [-w/2,h/2-c], [-w/2,-h/2+c]];
  const holes: [number, number, number][] = [];
  for (const x of [-1,1]) for (const y of [-1,1]) holes.push([x*(w/2-.07),y*(h/2-.07),.025]);
  parts.plate(group, outline, -.018, .036, seed % 2 ? m.pcb : m.pcbDark, holes, .0015);
  for (const [x,y] of holes) {
    parts.cylinder(group, [x,y,-.085], .039, .13, m.brass, 6);
    parts.screw(group, [x,y,.024], .027, .17);
    parts.ring(group, [x,y,-.019], .035, .005, m.solder);
  }
  const occupied: [number,number,number,number][] = [];
  const reserve = (x:number,y:number,cw:number,ch:number) => { occupied.push([x,y,cw+.045,ch+.055]); };
  if (kind === 'memory') {
    for(let i=0;i<4;i++) { const x=-w*.34+i*w*.225; chip(parts,group,x,.015,w*.17,h*.40,8); reserve(x,.015,w*.18,h*.55); }
  } else {
    const cw=Math.min(.24,w*.38),ch=Math.min(.25,h*.25);
    chip(parts,group,-w*.14,h*.13,cw,ch,8);reserve(-w*.14,h*.13,cw,ch+.06);
    if(h>.65){chip(parts,group,w*.18,-h*.23,.12,.16,5);reserve(w*.18,-h*.23,.13,.23);}
    if(w>.72){chip(parts,group,-w*.28,-h*.24,.18,.13,6);reserve(-w*.28,-h*.24,.19,.2);}
  }
  const cols=Math.floor((w-.17)/.075),rows=Math.floor((h-.18)/.074);
  for(let i=0;i<cols;i++)for(let j=0;j<rows;j++) {
    const x=-w/2+.1+i*.075,y=-h/2+.1+j*.074;
    if(occupied.some(([cx,cy,cw,ch])=>Math.abs(x-cx)<cw/2+.025&&Math.abs(y-cy)<ch/2+.025))continue;
    if(holes.some(([hx,hy])=>Math.hypot(x-hx,y-hy)<.055))continue;
    const k=(i*13+j*7+seed*3)%17;
    if(k<10) {
      const vertical=k%3===0,cw=vertical?.025:.048,ch=vertical?.048:.025;
      parts.box(group,[x,y,.032],[cw,ch,.025],k<5?m.ceramic:m.black);
      for(const sign of [-1,1])parts.box(group,[x+(vertical?0:sign*.022),y+(vertical?sign*.022:0),.032],[vertical?.03:.012,vertical?.012:.03,.028],m.solder);
      const lineX=x+.031;
      parts.line(group,[lineX,y-.027],[lineX,y+.027],.022,.0025,m.silk);
    } else if(k<13) {capacitor(parts,group,x,y,.023,.07+(k-10)*.018);}
    else {
      parts.box(group,[x,y,.03],[.03,.036,.025],m.black);
      for(const sign of [-1,1])parts.box(group,[x+sign*.022,y,.026],[.017,.023,.011],m.solder);
    }
    // Copper routing on both surfaces, deliberately subordinate to the components.
    const end:XY=[Math.min(w/2-.04,x+.055),Math.min(h/2-.035,y+.051)];
    parts.line(group,[x,y+.022],[x,y+.037],.020,.003,m.trace);
    parts.line(group,[x,y+.037],end,.020,.003,m.trace);
    parts.line(group,[x,y],[x-.026,y-.025],-.020,.003,m.trace);
    parts.line(group,[x-.026,y-.025],[x-.026,y-.06],-.020,.003,m.trace);
    for(const sign of [-1,1])parts.cylinder(group,[x+sign*.022,y,-.023],.009,.005,m.solder,8);
  }
  if(kind==='driver') for(let i=0;i<3;i++) {capacitor(parts,group,w*.27,-h*.32+i*h*.3,.044,.12);}
  // One keyed socket on each edge; harness endpoints are in these cavities.
  const ports:P[]=[];
  for(const side of [-1,1]) {
    const y=side*(h/2-.04),x=side===1?w*.1:-w*.1;
    parts.box(group,[x,y,.069],[Math.min(w*.55,.3),.075,.1],m.ceramic);
    parts.box(group,[x,y,.124],[Math.min(w*.45,.245),.046,.012],m.black);
    for(let i=0;i<5;i++) {const px=x-.09+i*.045;parts.rod(group,[px,y,.123],[px,y,.143],.007,m.brass);}
    ports.push([x,y,.14]);
  }
  // Pin header and soldered through-hole row, plus a few larger reverse-face parts.
  const count=Math.floor(w/.057)-2;
  for(let i=0;i<count;i++) {
    const x=-w/2+.08+i*.057;
    parts.box(group,[x,-h*.39,.044],[.04,.04,.037],m.black);
    parts.rod(group,[x,-h*.39,-.027],[x,-h*.39,.095],.006,m.brass);
  }
  if(kind!=='memory')chip(parts,group,0,-h*.06,.13,.1,5,-.13);
  group.updateWorldMatrix(true,false);
  return {group,point:local=>group.localToWorld(new Vector3(...local)).toArray() as P,ports};
}

export function buildElectronics(parts: BirdParts, groups: Map<string,Group>): Electronics {
  const mounts=new Map<string,BoardMount>();
  const add=(id:string,assembly:string,at:P,rotation:P,w:number,h:number,seed:number,kind?:'logic'|'driver'|'memory'|'sensor')=>{
    const mount=board(parts,groups.get(assembly)!,id,at,rotation,w,h,seed,kind);mounts.set(id,mount);return mount;
  };
  // Reference side: oblique shoulder memory, center processor, tall chest driver.
  add('shoulder-memory','boards',ref(593,429,.43),[.13,-.12,.52],.72,.31,2,'memory');
  add('main-processor','boards',ref(684,383,.68),[-.11,.10,-.12],.65,.83,3);
  add('chest-driver','boards',ref(1076,489,.48),[.12,-.30,-.53],.69,.98,4,'driver');
  // Different component layout and angle on the unseen side, not a mirror.
  add('rear-controller','boards-back',ref(890,386,-.52),[.10,Math.PI-.12,.30],.92,.96,7);
  add('rear-power','boards-back',ref(1032,469,-.42),[-.12,Math.PI+.20,-.30],.53,.85,9,'driver');
  add('rear-tail-interface','boards-back',ref(674,534,-.39),[0,Math.PI,.38],.64,.49,11);
  // Depth-wise shelves put populated faces in the dorsal and frontal views too.
  add('dorsal-bus','boards-core',ref(831,326,0),[-Math.PI/2+.18,.1,.39],1.18,.82,5);
  add('central-interface','boards-core',ref(833,469,-.035),[.10,.17,-.12],.76,.61,6);
  add('belly-power','boards-core',ref(933,598,-.04),[Math.PI/2-.30,.08,.28],.83,.74,8,'driver');
  add('sternum-interface','boards-core',[1.07,.15,0],[0,Math.PI/2,-.16],.66,.61,13);
  add('neck-interface','head-electronics',[1.43,1.01,0],[.08,Math.PI/2,.05],.46,.41,14,'sensor');
  add('head-camera','head-electronics',ref(1193,152,.20),[-.03,.05,-.05],.62,.44,10,'sensor');
  add('head-controller','head-electronics',ref(1175,155,-.23),[.04,Math.PI,.10],.49,.38,12,'sensor');

  const head=groups.get('head-electronics')!, m=parts.m;
  m.lens.envMapIntensity=2.4;
  for(const sign of [-1,1]) {
    const at=ref(1245,130,sign*.33);
    parts.cylinder(head,at,.145,.115,m.black,32);
    parts.ring(head,[at[0],at[1],at[2]+sign*.062],.146,.015,m.steel);
    parts.ring(head,[at[0],at[1],at[2]+sign*.078],.123,.008,m.solder);
    parts.ball(head,[at[0],at[1],at[2]+sign*.081],[.115,.115,.028],m.lens);
    parts.ring(head,[at[0],at[1],at[2]+sign*.10],.047,.005,m.black);
    parts.ring(head,[at[0],at[1],at[2]-sign*.06],.10,.012,m.steel);
    parts.plate(head,[[at[0]-.15,at[1]-.13],[at[0]+.13,at[1]-.13],[at[0]+.13,at[1]+.12],[at[0]-.15,at[1]+.12]],sign*.24,.025,m.brass,[[at[0],at[1],.093]],.002);
    for(const dx of [-.128,.115])parts.screw(head,[at[0]+dx,at[1]-.101,sign*.27],.018,.08,sign);
  }
  parts.rod(head,ref(1168,176,-.27),ref(1168,176,.27),.026,m.aluminium);
  return {mounts};
}
