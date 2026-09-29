import { Group, Vector3 } from 'three/webgpu';
import { BirdParts, ref, type P, type XY } from './BirdParts.ts';

function gear(parts: BirdParts, group: Group, at: P, radius: number, teeth: number, sign = 1) {
  const outline: XY[] = [];
  for (let tooth = 0; tooth < teeth; tooth++) for (const [phase, r] of [[0,.91],[.18,1],[.58,1],[.78,.91]]) {
    const a=(tooth+phase)/teeth*Math.PI*2;
    outline.push([at[0]+Math.cos(a)*radius*r,at[1]+Math.sin(a)*radius*r]);
  }
  const holes: [number,number,number][]=[];
  for(let i=0;i<6;i++) {const a=i*Math.PI/3;holes.push([at[0]+Math.cos(a)*radius*.53,at[1]+Math.sin(a)*radius*.53,radius*.09]);}
  parts.plate(group,outline,at[2]-.037,.074,parts.m.brass,holes,.003);
  const face=at[2]+sign*.044;
  parts.cylinder(group,[at[0],at[1],face],radius*.27,.042,parts.m.brass);
  parts.ring(group,[at[0],at[1],face+sign*.022],radius*.29,.008,parts.m.copper);
  parts.ring(group,[at[0],at[1],face+sign*.024],radius*.19,.012,parts.m.steel);
  parts.cylinder(group,[at[0],at[1],face+sign*.06],radius*.13,.10,parts.m.brass,6);
  parts.screw(group,[at[0],at[1],face+sign*.11],radius*.11,.06,sign);
  for(const fraction of [.35,.75,.79])parts.ring(group,[at[0],at[1],face-sign*.005],radius*fraction,.0028,parts.m.copper);
  parts.rod(group,[at[0],at[1],-.54],[at[0],at[1],.61],radius*.115,parts.m.steel);
}

function motor(parts: BirdParts, group: Group, at: P, rotation: P, length: number) {
  const local=parts.group(group,'Geared micro motor',at,rotation),m=parts.m;
  parts.cylinder(local,[0,0,0],.145,length,m.aluminium,28);
  for(const z of [-length/2,length/2]){
    parts.cylinder(local,[0,0,z],.147,.035,m.steel,24);
    parts.cylinder(local,[0,0,z+.025],.06,.07,m.brass,16);
  }
  for(let i=0;i<8;i++){const a=i*Math.PI/4;parts.box(local,[Math.cos(a)*.10,Math.sin(a)*.10,length/2+.019],[.037,.023,.006],m.black);}
  parts.box(local,[0,-.145,0],[.25,.065,length*.8],m.aluminium);
  for(const x of [-.105,.105])parts.screw(local,[x,-.14,length/2+.025],.024,.08);
}

export function buildMechanics(parts: BirdParts, groups: Map<string,Group>) {
  const g=groups.get('mechanics')!,m=parts.m;
  // Open aluminium chassis follows the rounded body and spans its full depth.
  for(const z of [-.48,.48]) {
    parts.plate(g,[[-1.57,-.40],[-1.45,-.51],[-.74,-.61],[.45,-.60],[.98,-.15],[1.4,.65],[1.31,.73],[.86,-.04],[.40,-.47],[-.69,-.48]],z,.032,m.aluminium,[],.007);
    parts.plate(g,[[-1.22,-.21],[-1.12,-.14],[-.58,.45],[.11,.81],[.74,1.03],[.76,.94],[.06,.70],[-.47,.34]],z,.025,m.steel,[],.003);
    for(const [x,y] of [[-1.37,-.40],[-.69,-.51],[.37,-.50],[.94,-.02],[.25,.79]]){
      parts.cylinder(g,[x,y,z],.05,.07,m.brass,6);
      parts.screw(g,[x,y,z+(z>0?.05:-.04)],.024,.1,z>0?1:-1);
    }
  }
  for(const [x,y] of [[-1.37,-.41],[-.68,-.51],[.35,-.51],[.84,.10],[.10,.79]]) {
    parts.rod(g,[x,y,-.5],[x,y,.5],.025,m.aluminium);
    for(const z of [-.44,.44])parts.ring(g,[x,y,z],.042,.008,m.brass);
  }
  // Distinct large intermeshing wheels, selected from the newer reference.
  gear(parts,g,[.23,.26,.51],.43,42);
  gear(parts,g,[-.01,-.32,.49],.235,26);
  gear(parts,g,[.80,.62,.26],.29,32);
  gear(parts,g,[1.32,1.18,.33],.245,30);
  gear(parts,g,[-.61,-.31,.25],.20,24);
  gear(parts,g,[.12,.30,-.51],.36,36,-1);
  gear(parts,g,[.61,-.18,-.45],.24,26,-1);
  gear(parts,g,[-.56,.21,-.35],.20,24,-1);
  // Side-frame bearings behind the main wheels, with open windows.
  for(const z of [-.36,.36]) {
    parts.plate(g,[[-.32,-.60],[.50,-.53],[.93,.39],[.70,.70],[.18,.78],[-.32,.33]],z,.04,m.aluminium,[[.23,.26,.27],[.0,-.28,.12],[.63,.38,.11]],.008);
  }
  motor(parts,g,[-.83,-.23,0],[0,Math.PI/2,0],.45);
  motor(parts,g,[.67,-.36,-.1],[0,.20,0],.48);
  // A worm-drive carriage and coil spring below the tail root.
  parts.rod(g,[-1.47,-.40,.18],[-.79,-.26,.18],.026,m.steel);
  const coil:P[]=[];
  for(let i=0;i<=160;i++){const t=i/160,a=t*Math.PI*24;coil.push([-1.43+t*.49,-.38+t*.10+Math.cos(a)*.051,.18+Math.sin(a)*.051]);}
  parts.tube(g,coil,.010,m.brass,160);
  for(const z of [-.36,.36]){
    parts.cylinder(g,[-1.34,-.40,z],.09,.055,m.aluminium);
    parts.screw(g,[-1.34,-.40,z+(z>0?.04:-.04)],.035,.09,z>0?1:-1);
  }
}

function taperedClaw(parts: BirdParts, group: Group, points: P[], radius: number) {
  // Segment radii taper to a real point; no thick bent pipe at the toe tip.
  for(let i=0;i<points.length-1;i++) {
    const r=radius*(1-i/(points.length-1))+.001;
    parts.rod(group,points[i],points[i+1],r,parts.m.steel);
    if(i<points.length-2)parts.ball(group,points[i+1],[r*.83,r*.83,r*.83],parts.m.steel);
  }
}

export function buildLegs(parts: BirdParts, group: Group) {
  const m=parts.m;
  for(const sign of [-1,1]) {
    const dx=sign<0?.17:0,z=sign*.55;
    const hip:P=[.13+dx,-.52,z],knee:P=[.015+dx,-1.03,z+sign*.055],ankle:P=[.49+dx,-1.57,z+sign*.09];
    // Transparent cheek plates and a small parallel steel member, as in the photo.
    for(const dz of [-.044,.044]) {
      const shape:XY[]=[[hip[0]-.12,hip[1]+.11],[hip[0]+.12,hip[1]+.08],[knee[0]+.085,knee[1]-.05],[knee[0]-.09,knee[1]-.06]];
      parts.plate(group,shape,z+dz,.027,m.acrylicSatin,[[hip[0],hip[1],.05],[knee[0],knee[1],.04]],.01);
    }
    parts.rod(group,[hip[0]-.035,hip[1],z],[knee[0]-.022,knee[1],knee[2]],.018,m.steel);
    parts.rod(group,knee,ankle,.039,m.aluminium);
    for(const dz of [-.047,.047])parts.rod(group,[knee[0],knee[1],knee[2]+dz],[ankle[0],ankle[1],ankle[2]+dz],.012,m.steel);
    const direction=new Vector3(...ankle).sub(new Vector3(...knee));
    for(const t of [.16,.80]){
      const at=new Vector3(...knee).addScaledVector(direction,t).toArray() as P;
      parts.ball(group,at,[.052,.053,.058],m.aluminium);
    }
    for(const [at,r] of [[hip,.084],[knee,.061],[ankle,.054]] as [P,number][]) {
      parts.rod(group,[at[0],at[1],at[2]-.092],[at[0],at[1],at[2]+.092],r*.5,m.steel);
      for(const dz of [-.085,.085]){
        parts.ring(group,[at[0],at[1],at[2]+dz],r,.012,m.aluminium);
        parts.screw(group,[at[0],at[1],at[2]+dz],r*.63,.035,dz>0?1:-1);
      }
    }
    const palm:P=[ankle[0]+.1,-1.67,ankle[2]];
    parts.rod(group,ankle,palm,.038,m.aluminium);
    parts.box(group,palm,[.18,.065,.19],m.aluminium);
    // Three segmented forward toes with individual knuckles and splayed claws.
    for(let toe=0;toe<3;toe++) {
      const spread=(toe-1)*.17,length=.48-Math.abs(toe-1)*.045;
      const path:P[]=[palm,[palm[0]+.17,-1.69,palm[2]+spread*.65],[palm[0]+length*.72,-1.71,palm[2]+spread],[palm[0]+length,-1.73,palm[2]+spread*1.1]];
      for(let j=0;j<3;j++) {
        parts.rod(group,path[j],path[j+1],.025-j*.003,m.aluminium);
        const p=path[j+1];parts.ball(group,p,[.035,.031,.034],m.steel);
        // Small machined collars along the links rather than decorative beads.
        const a=new Vector3(...path[j]),b=new Vector3(...path[j+1]);
        for(const t of [.3,.6]){const p=a.clone().lerp(b,t).toArray() as P;parts.ball(group,p,[.027-j*.002,.029-j*.002,.03-j*.002],m.solder);}
      }
      const end=path[3];
      taperedClaw(parts,group,[end,[end[0]+.065,end[1]-.017,end[2]],[end[0]+.113,end[1]-.06,end[2]+spread*.12],[end[0]+.13,end[1]-.12,end[2]+spread*.15]],.023);
    }
    const rear:P=[palm[0]-.28,-1.70,palm[2]-sign*.055];
    parts.rod(group,palm,rear,.024,m.aluminium);parts.ball(group,rear,[.036,.03,.033],m.steel);
    taperedClaw(parts,group,[rear,[rear[0]-.07,-1.72,rear[2]],[rear[0]-.11,-1.78,rear[2]],[rear[0]-.12,-1.82,rear[2]]],.022);
  }
}
