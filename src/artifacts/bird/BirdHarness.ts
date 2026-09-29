import type { Group } from 'three/webgpu';
import { BirdParts, type P } from './BirdParts.ts';
import type { Electronics } from './BirdElectronics.ts';

export function buildHarness(parts: BirdParts, groups: Map<string,Group>, electronics: Electronics) {
  const m=parts.m;
  function connect(assembly:string,from:string,fromPort:number,to:string,toPort:number,route:P[],count:number,radius:number,color:'pink'|'greenWire'|'pinkLight'|'whiteWire',seed:number) {
    const group=groups.get(assembly)!,a=electronics.mounts.get(from)!,b=electronics.mounts.get(to)!;
    for(let i=0;i<count;i++) {
      const separation=(i-(count-1)/2)*(radius*2.3);
      const start=[...a.ports[fromPort]] as P,end=[...b.ports[toPort]] as P;
      start[0]+=separation;end[0]+=separation;
      const points=route.map((p,j)=>[p[0]+separation*.5+Math.sin(j*1.7+seed)*.009,p[1]+separation,p[2]+Math.sin(j+seed)*separation*.4] as P);
      parts.tube(group,[a.point(start),...points,b.point(end)],radius,m[color],48);
      // Heat shrink strain relief follows each board socket's outgoing cable.
      for(const [mount,local] of [[a,start],[b,end]] as const){const p=mount.point(local),q=mount.point([local[0],local[1],local[2]-.04]);parts.rod(group,p,q,radius*1.14,m.black);}
    }
    // A purposeful saddle clamp midway along each bundle.
    if(route.length>2){const p=route[Math.floor(route.length/2)];parts.box(group,p,[.065,count*radius*2.6,.054],m.ceramic);parts.screw(group,[p[0],p[1],p[2]+.039],.017,.06);}
  }
  // Broad visible routes avoid the central gear faces and follow the shell rim.
  connect('wires','main-processor',1,'head-camera',0,[[-.28,.89,.62],[.18,1.00,.56],[.66,1.16,.43],[1.19,1.29,.29]],3,.022,'pink',1);
  connect('wires','main-processor',0,'chest-driver',1,[[-.13,.60,.85],[.15,.67,.82],[.60,.34,.77],[.83,.03,.74]],3,.024,'pink',3);
  connect('wires','head-camera',0,'chest-driver',1,[[1.57,1.30,.27],[1.31,1.03,.32],[1.03,.69,.43]],2,.026,'greenWire',5);
  connect('wires','chest-driver',0,'shoulder-memory',0,[[.82,-.53,.70],[.40,-.65,.71],[-.27,-.65,.68],[-.73,-.40,.61],[-.91,-.06,.57]],3,.023,'pink',7);
  connect('wires','shoulder-memory',0,'central-interface',0,[[-1.15,-.06,.58],[-1.07,-.30,.53],[-.67,-.25,.56],[-.39,.05,.49]],2,.014,'greenWire',9);
  connect('wires','chest-driver',0,'belly-power',0,[[.80,-.48,.52],[.38,-.68,.40],[.13,-.64,.14]],2,.018,'greenWire',2);
  connect('wires','main-processor',1,'dorsal-bus',1,[[-.24,1.07,.62],[-.42,1.04,.30]],2,.012,'whiteWire',4);
  // Reverse side routes terminate on a different arrangement of boards.
  connect('wires-back','rear-controller',1,'head-controller',0,[[.33,1.04,-.67],[.87,1.18,-.53],[1.35,1.38,-.32]],3,.021,'pink',11);
  connect('wires-back','rear-controller',0,'rear-power',1,[[.10,.06,-.81],[.24,-.12,-.80],[.62,-.37,-.65]],3,.023,'greenWire',12);
  connect('wires-back','rear-tail-interface',1,'rear-controller',0,[[-.91,.05,-.64],[-.7,.45,-.73],[-.41,.62,-.78]],2,.023,'pink',15);
  connect('wires-back','rear-power',0,'rear-tail-interface',0,[[.37,-.67,-.52],[-.12,-.73,-.56],[-.69,-.64,-.50]],3,.021,'pinkLight',16);
  connect('wires-back','rear-controller',1,'dorsal-bus',0,[[-.11,.96,-.61],[-.25,1.03,-.24]],2,.013,'whiteWire',18);
  connect('wires-back','rear-power',0,'belly-power',1,[[.78,-.49,-.37],[.58,-.66,-.2]],2,.016,'greenWire',20);
  // Small internal neck connections and actuator pigtails.
  const head=groups.get('head-electronics')!;
  for(const sign of [-1,1])for(let i=0;i<3;i++)parts.tube(head,[[1.60,1.50,sign*.29],[1.74,1.42+i*.025,sign*.32],[2.01,1.50+i*.025,sign*.27],[2.04,1.65,sign*.27]],.012,i===2?m.greenWire:m.pink,24);
  const wires=groups.get('wires')!;
  for(let i=0;i<3;i++) {
    const z=.20+i*.025;
    parts.tube(wires,[[-1.4,-.39,z],[-1.18,-.21,z+.11],[-.94,-.13,z+.23],[-.87,.05,.53]],.014,i===2?m.greenWire:m.pinkLight,30);
    parts.cylinder(wires,[-1.4,-.39,z],.021,.035,m.brass,12);
  }
}
