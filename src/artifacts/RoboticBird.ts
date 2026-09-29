import { Group, Mesh, MeshStandardMaterial, MeshPhysicalMaterial, SphereGeometry, CylinderGeometry, BoxGeometry, TorusGeometry, TubeGeometry, CatmullRomCurve3, Vector3, Shape, ExtrudeGeometry, BufferGeometry, Float32BufferAttribute, DoubleSide, type Material } from 'three/webgpu';
import type { ArtifactInstance } from './types';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** All coordinates are authored in the reference's side plane (XY); Z is depth. */
export function buildBird(): ArtifactInstance {
  const root = new Group(); root.name = 'Robotic bird';
  const groups = new Map<string, Group>();
  for (const id of ['shell-front','shell-back','head','wing-front','wing-back','tail','boards','mechanics','wires','legs']) {
    const group = new Group(); group.name = id; groups.set(id, group); root.add(group);
  }
  const metal = new MeshStandardMaterial({ color: '#a9b1b1', metalness: .88, roughness: .25 });
  const brass = new MeshStandardMaterial({ color: '#b69a60', metalness: .8, roughness: .3 });
  const dark = new MeshStandardMaterial({ color: '#111c1c', metalness: .25, roughness: .42 });
  const pcb = new MeshStandardMaterial({ color: '#086246', metalness: .3, roughness: .4 });
  const pink = new MeshStandardMaterial({ color: '#e05d8f', roughness: .32, metalness: .12 });
  const teal = new MeshStandardMaterial({ color: '#398b83', roughness: .4 });
  const cream = new MeshStandardMaterial({ color: '#c4bca3', roughness: .4 });
  const shell = new MeshPhysicalMaterial({ color: '#e3f5f2', metalness: 0, roughness: .09, transmission: .96, thickness: .055, ior: 1.46, transparent: true, opacity: .62, side: DoubleSide, depthWrite: false, clearcoat: 1 });
  const edge = new MeshPhysicalMaterial({ color: '#c8e0d9', metalness: .35, roughness: .18, transparent: true, opacity: .46 });
  const shells: Mesh[] = [];
  const geometries = new Set<BufferGeometry>(); const materials = new Set<Material>([metal, brass, dark, pcb, pink, teal, cream, shell, edge]);
  function mesh(parent: Group, geometry: BufferGeometry, material: Material, p: number[] = [0,0,0]) {
    geometries.add(geometry); const m = new Mesh(geometry, material); m.position.set(p[0],p[1],p[2]); parent.add(m); if (material === shell || material === edge) shells.push(m); return m;
  }
  const boxGeo = new BoxGeometry(1,1,1), sphereGeo = new SphereGeometry(1,24,16), rodGeo = new CylinderGeometry(1,1,1,12);
  function box(g: Group, p: number[], s: number[], mat: Material) { const m = mesh(g,boxGeo,mat,p); m.scale.set(s[0],s[1],s[2]); return m; }
  function ball(g: Group, p: number[], s: number[], mat: Material) { const m=mesh(g,sphereGeo,mat,p); m.scale.set(s[0],s[1],s[2]); return m; }
  function rod(g: Group, a: number[], b: number[], radius: number, mat: Material) { const av=new Vector3(...a), bv=new Vector3(...b); const m=mesh(g,rodGeo,mat); m.position.copy(av).add(bv).multiplyScalar(.5); m.scale.set(radius,av.distanceTo(bv),radius); m.quaternion.setFromUnitVectors(new Vector3(0,1,0),bv.sub(av).normalize()); return m; }
  function tube(g: Group, points: number[][], radius: number, mat: Material) { return mesh(g,new TubeGeometry(new CatmullRomCurve3(points.map(p=>new Vector3(...p))),40,radius,6,false),mat); }
  function ring(g: Group, x: number,y: number,z: number,r: number,mat: Material=brass) { return mesh(g,new TorusGeometry(r,.025,8,40),mat,[x,y,z]); }
  function plate(g: Group, points: number[][], z: number, mat: Material) {
    const shape=new Shape(); shape.moveTo(points[0][0],points[0][1]); for(const p of points.slice(1)) shape.lineTo(p[0],p[1]); shape.closePath();
    const m=mesh(g,new ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelSize:.018,bevelThickness:.012,bevelSegments:2}),mat,[0,0,z]); return m;
  }
  // Rounded pear-shaped split carapace, rather than intersecting body spheres.
  const outline = new CatmullRomCurve3([[-1.95,-.43],[-1.55,.22],[-.5,.98],[.68,1.38],[1.14,1.95],[1.7,2.04],[1.85,1.5],[1.58,.46],[1.06,-.43],[.2,-.87],[-.85,-.79]].map(p=>new Vector3(p[0],p[1],0)),true,'catmullrom',.3).getPoints(100);
  for(const sign of [-1,1]) {
    const g=groups.get(sign===1?'shell-front':'shell-back')!; const vertices:number[]=[], indices:number[]=[];
    const center=new Vector3(-.1,.36,0), n=outline.length;
    for(let r=0;r<=16;r++) { const f=r/16; for(const p of outline) vertices.push(center.x+(p.x-center.x)*f,center.y+(p.y-center.y)*f,sign*.62*Math.sqrt(1-f*f)); }
    for(let r=0;r<16;r++) for(let i=0;i<n-1;i++){const a=r*n+i,b=a+n;indices.push(a,b,a+1,a+1,b,b+1);}
    const geo=new BufferGeometry();geo.setAttribute('position',new Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();mesh(g,geo,shell);
    tube(g,outline.map(p=>[p.x,p.y,sign*.018]),.014,edge);
    for(const i of [8,27,47,68,88]) {const p=outline[i];ball(g,[p.x,p.y,sign*.05],[.047,.047,.025],brass);}
  }
  const head=groups.get('head')!;
  ball(head,[1.62,1.91,0],[.64,.63,.43],shell);
  for(const s of [-1,1]) {
    ring(head,1.88,2.01,s*.39,.16); ball(head,[1.88,2.01,s*.41],[.13,.13,.045],dark); ring(head,1.88,2.01,s*.445,.113,metal);
    plate(head,[[2.04,1.77],[2.77,1.56],[2.21,1.59]],s*.055,metal);
    rod(head,[1.53,1.65,s*.34],[2.19,1.72,s*.17],.026,brass);
  }
  function board(parent: Group, p: number[], w: number,h: number, angle: number, seed: number) {
    const g=new Group();g.position.set(p[0],p[1],p[2]);g.rotation.z=angle;parent.add(g);
    box(g,[0,0,0],[w,h,.055],pcb);
    for(const x of [-1,1]) for(const y of [-1,1]) {ring(g,x*(w/2-.075),y*(h/2-.075),.033,.028);ball(g,[x*(w/2-.075),y*(h/2-.075),.037],[.014,.014,.008],metal);}
    const cols=Math.max(2,Math.floor(w/.21)),rows=Math.max(2,Math.floor(h/.21));
    for(let x=0;x<cols;x++) for(let y=0;y<rows;y++) {
      const px=-w/2+.14+x*(w-.28)/Math.max(1,cols-1), py=-h/2+.14+y*(h-.28)/Math.max(1,rows-1), k=(x*7+y*11+seed)%9;
      if(k<4){box(g,[px,py,.071],[.12,.085,.055],dark); for(let j=0;j<4;j++)for(const s of [-1,1])box(g,[px-.047+j*.031,py+s*.052,.06],[.012,.035,.018],metal);}
      else if(k<7) {box(g,[px,py,.06],[.072,.035,.032],cream);for(const s of [-1,1])box(g,[px+s*.035,py,.065],[.015,.04,.025],metal);}
      else {ball(g,[px,py,.09],[.038,.038,.065],brass);}
      const tx=px+.074; rod(g,[tx,py,.03],[tx,py+.13,.03],.0035,brass);rod(g,[tx,py+.13,.03],[tx-.085,py+.13,.03],.0035,brass);
      // Solder pads and bent traces on the reverse of each board.
      for(const s of [-1,1])ball(g,[px+s*.04,py,-.034],[.015,.014,.007],metal);
      rod(g,[px-.04,py,-.032],[px-.04,py+.075,-.032],.004,brass);
      rod(g,[px-.04,py+.075,-.032],[px+.05,py+.13,-.032],.004,brass);
      if(k===2)box(g,[px,py,-.056],[.09,.045,.035],dark);
    }
    for(let i=0;i<Math.floor(w/.06);i++)box(g,[-w/2+.055+i*.06,-h/2+.03,.035],[.032,.075,.008],brass);
  }
  const boards=groups.get('boards')!;
  board(boards,[-.35,.25,.22],1.25,1.35,-.43,1); board(boards,[.8,.37,-.15],.7,1.45,-.47,3);board(boards,[-.8,.61,-.24],1.5,.48,.53,5);board(boards,[1.55,1.91,0],.54,.53,-.05,6);
  // Rear-facing circuitry completes the unseen side without changing the silhouette.
  const rear=new Group();rear.rotation.y=Math.PI;boards.add(rear);board(rear,[.15,.15,.27],1.1,1.1,.4,8);
  const mech=groups.get('mechanics')!;
  function gear(x:number,y:number,z:number,r:number,teeth:number) {
    const disc=mesh(mech,new CylinderGeometry(r*.87,r*.87,.075,40),brass,[x,y,z]);disc.rotation.x=Math.PI/2;
    ring(mech,x,y,z+.048,r*.65,metal);ring(mech,x,y,z+.06,r*.25);
    for(let i=0;i<teeth;i++){const a=i/teeth*Math.PI*2;const m=box(mech,[x+Math.cos(a)*r*.92,y+Math.sin(a)*r*.92,z],[r*.22,r*.19,.085],brass);m.rotation.z=a;}
    ball(mech,[x,y,z+.085],[.065,.065,.035],metal);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;ball(mech,[x+Math.cos(a)*r*.45,y+Math.sin(a)*r*.45,z+.04],[r*.095,r*.095,.009],dark);}
  }
  gear(.22,-.57,.43,.32,22);gear(.66,-.43,.39,.21,16);gear(-.17,-.45,.36,.17,14);
  for(const z of [-.27,.27]) {
    rod(mech,[-1.6,-.43,z],[1.3,.6,z],.035,metal);rod(mech,[-1.4,-.35,z],[.62,-.61,z],.024,brass);
    const motor=mesh(mech,new CylinderGeometry(.15,.15,.44,24),metal,[-.65,-.27,z]);motor.rotation.z=Math.PI/2;ring(mech,-.65,-.27,z+.16,.10);
    for(let i=0;i<9;i++)rod(mech,[-1.26+i*.047,-.43,z],[-1.26+i*.047,-.24,z],.019,brass);
  }
  const wires=groups.get('wires')!;
  for(let i=0;i<6;i++) {const t=i*.04,z=.35+(i%3)*.048; tube(wires,[[-1.8+t,-.29+t,z],[-1.13,.0+t,z+.04],[-.73,.12+t,z+.06],[-.15,-.43+t,z+.09],[.65,-.15+t,z],[.98,.78+t,z-.09],[1.43,1.55+t,.19],[1.63,1.81,.12]],.015,i%4===0?teal:pink);}
  for(let i=0;i<6;i++){const t=i*.05; tube(wires,[[.65,.63-t,.29],[.07+t,.76,.49],[-.04+t,.38,.56],[.39+t,-.18,.52],[.82,-.27+t,.37],[.98,.18+t,.25]],.013,i%3===0?teal:pink);}
  for(let i=0;i<5;i++)tube(wires,[[-.7,.82-i*.05,.34],[-.2,.91-i*.04,.45],[.14,.45,.51],[.55,.25-i*.065,.48],[.83,.01,.26]],.012,i%2?pink:teal);
  for(const sign of [-1,1]) {
    const wing=groups.get(sign===1?'wing-front':'wing-back')!;
    const pts=[[-2.42,-.46],[-1.99,-.02],[-.7,.89],[.38,1.17],[.83,1.02],[.75,.6],[.13,.08],[-1.32,-.35]];
    plate(wing,pts,sign*.64,shell);tube(wing,[...pts,pts[0]].map(p=>[p[0],p[1],sign*.66]),.017,edge);
    for(let i=0;i<5;i++)tube(wing,[[.51-i*.09,.9,sign*.67],[-.5-i*.16,.08+i*.07,sign*.7],[-2.15+i*.21,-.4+i*.02,sign*.66]],.009,metal);
    for(const p of [[.52,.85],[-1.36,-.16]])ball(wing,[...p,sign*.68],[.052,.052,.035],brass);
  }
  const tail=groups.get('tail')!;
  for(let i=0;i<3;i++){const z=(i-1)*.17;plate(tail,[[-1.2,-.45],[-1.35,-.77],[-3.65-i*.12,-1.83-i*.1],[-3.42,-1.47]],z,shell);rod(tail,[-1.32,-.63,z],[-3.55,-1.73,z],.018,metal);rod(tail,[-1.42,-.59,z],[-3.27,-1.51,z],.009,brass);}
  const legs=groups.get('legs')!;
  for(const z of [-.36,.4]) {
    const dx=z<0?.18:0;
    rod(legs,[.25+dx,-.65,z],[.09+dx,-1.24,z],.09,metal);rod(legs,[.09+dx,-1.24,z],[.75+dx,-1.83,z],.065,metal);rod(legs,[.18+dx,-1.25,z+.085],[.8+dx,-1.8,z+.085],.021,brass);
    for(const [x,y,r] of [[.25+dx,-.65,.12],[.09+dx,-1.24,.10],[.75+dx,-1.83,.075]]){ring(legs,x,y,z+.09,r);ball(legs,[x,y,z+.095],[r*.6,r*.6,.035],metal);}
    for(let i=0;i<3;i++){const zz=z+(i-1)*.15; tube(legs,[[.75+dx,-1.83,z],[1.01+dx,-1.91,zz],[1.43+dx-i*.09,-1.91,zz],[1.54+dx-i*.09,-2.04,zz]],.035,metal);for(let j=0;j<4;j++)ball(legs,[1+dx+j*.1-i*.03,-1.905,zz],[.043,.043,.047],brass);}
    tube(legs,[[.78+dx,-1.84,z],[.37+dx,-1.88,z-.04],[.21+dx,-2.0,z-.04]],.032,metal);
  }
  // Batch opaque pieces by material inside each independently movable assembly.
  root.updateMatrixWorld(true);
  for(const group of groups.values()) {
    const batches=new Map<Material,Mesh[]>();
    group.traverse(object=>{if(object instanceof Mesh && object.material!==shell && object.material!==edge){const mat=object.material as Material;const batch=batches.get(mat)??[];batch.push(object);batches.set(mat,batch);}});
    for(const [mat,objects] of batches){
      const copies=objects.map(object=>{const copy=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();copy.applyMatrix4(object.matrixWorld);return copy;});
      const merged=mergeGeometries(copies);for(const copy of copies)copy.dispose();
      if(merged){for(const object of objects)object.removeFromParent();mesh(group,merged,mat);}
    }
  }
  return {root,groups,inspect(mode){for(const m of shells)m.visible=mode!=='hidden';shell.roughness=mode==='frosted'?.48:.09;shell.opacity=mode==='frosted'?.8:.62;shell.transmission=mode==='frosted'?.65:.96;},dispose(){root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}};
}
