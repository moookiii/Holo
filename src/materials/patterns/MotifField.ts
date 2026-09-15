import { encodeGratingAxis } from './Orientation.ts';

export const MOTIF_SYMBOLS = ['colorless', 'water', 'fire', 'grass', 'lightning', 'psychic', 'fighting', 'darkness', 'metal', 'ball', 'star'] as const;
export type MotifSymbol = typeof MOTIF_SYMBOLS[number];
export interface MotifSpec {
  symbols: MotifSymbol[];
  arrangement: 'scattered' | 'staggered';
  /** Radius relative to the cell pitch; 0.4 leaves room for stagger/jitter. */
  size: number;
  /** Smaller members retain the same manufacturing pitch. */
  smallScale: number;
  rotation: number;
  /** 0 is a flat etched symbol; 1 adds a shallow lens-shaped optical inclination. */
  curvature: number;
}
export interface MotifImage { width: number; height: number; data: Uint8Array; }
const TAU = Math.PI * 2, clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x-a)/(b-a)); return t*t*(3-2*t); };
function random(x: number, y: number, seed: number) {
  let h = Math.imul(x ^ seed, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0)/4294967296;
}
type Point = readonly [number, number];
function polygon(x: number, y: number, points: readonly Point[]) {
  let distance = 10, inside = false;
  for (let i = 0, j = points.length-1; i < points.length; j = i++) {
    const a=points[i], b=points[j], ex=b[0]-a[0], ey=b[1]-a[1], px=x-a[0], py=y-a[1];
    const t=clamp((px*ex+py*ey)/(ex*ex+ey*ey));
    distance=Math.min(distance,Math.hypot(px-t*ex,py-t*ey));
    if ((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  return distance*(inside?-1:1);
}
const lightning: Point[] = [[.10,1],[-.61,.04],[-.14,.04],[-.33,-1],[.63,.24],[.13,.24]];
const water: Point[] = [[0,1],[-.23,.56],[-.49,.14],[-.59,-.29],[-.46,-.69],[-.18,-.89],[.19,-.89],[.47,-.68],[.59,-.29],[.48,.14],[.23,.56]];
const flame: Point[] = [[.19,1],[-.14,.55],[-.44,.73],[-.42,.24],[-.71,-.10],[-.67,-.56],[-.36,-.84],[.13,-.92],[.51,-.72],[.69,-.36],[.61,.06],[.39,.33],[.41,-.02],[.15,.25]];
const fist: Point[] = [[-.72,.23],[-.58,.68],[-.30,.72],[-.22,.86],[.05,.87],[.15,.71],[.43,.75],[.60,.48],[.72,.27],[.59,-.37],[.27,-.42],[.21,-.88],[-.41,-.88],[-.41,-.34],[-.65,-.20]];
const star = (points: number, inner: number): Point[] => Array.from({length: points*2}, (_,i) => {
  const a=i*Math.PI/points+Math.PI/2, r=i%2?inner:1; return [Math.cos(a)*r, Math.sin(a)*r];
});
const six = star(6,.34), eight=star(8,.13), hex=star(3,.70);

/** Signed silhouette distances. They are manufacturing shapes, never RGB decals. */
export function motifDistance(symbol: MotifSymbol, x: number, y: number): number {
  const r=Math.hypot(x,y);
  switch(symbol) {
    case 'colorless': return polygon(x,y,six);
    case 'star': return polygon(x,y,eight);
    case 'water': return polygon(x,y,water);
    case 'lightning': return polygon(x,y,lightning);
    case 'fire': return Math.max(polygon(x,y,flame), -(Math.hypot(x+.02,(y+.44)*.85)-.23));
    case 'grass': {
      const a=(x-y)*Math.SQRT1_2,b=(x+y)*Math.SQRT1_2;
      const leaf=(Math.hypot(a/.57,b/.94)-1)*.57;
      const vein=Math.max(Math.abs(a)-.047,Math.abs(b+.16)-.64);
      return Math.max(leaf,-vein);
    }
    case 'psychic': {
      const outer=(Math.hypot(x/.96,y/.52)-1)*.52, inner=(Math.hypot(x/.69,y/.29)-1)*.29;
      return Math.min(Math.max(outer,-inner),r-.19);
    }
    case 'fighting': return polygon(x,y,fist);
    case 'darkness': return Math.max(r-.89,-(Math.hypot(x-.33,y+.14)-.73));
    case 'metal': return Math.max(polygon(x,y,hex), -(Math.hypot(x,y+.06)-.37));
    case 'ball': {
      const rim=Math.abs(r-.81)-.095;
      const bar=Math.max(Math.abs(y)-.095,r-.81);
      const button=Math.abs(r-.25)-.075;
      return Math.min(rim,Math.max(bar,.25-r),button);
    }
  }
}

const SIZE=192;
function symbolAtlas(symbol: MotifSymbol) {
  const data=new Float32Array(SIZE*SIZE);
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)data[y*SIZE+x]=motifDistance(symbol,(x+.5)/SIZE*2.3-1.15,(y+.5)/SIZE*2.3-1.15);
  return data;
}
const atlases=new Map<MotifSymbol,Float32Array>();
function bilinear(data: ArrayLike<number>, width: number, height: number, u: number, v: number) {
  const x=clamp(u)*(width-1),y=clamp(v)*(height-1),ix=Math.floor(x),iy=Math.floor(y),tx=x-ix,ty=y-iy;
  const a=data[iy*width+ix],b=data[iy*width+Math.min(ix+1,width-1)],c=data[Math.min(iy+1,height-1)*width+ix],d=data[Math.min(iy+1,height-1)*width+Math.min(ix+1,width-1)];
  return (a+(b-a)*tx)*(1-ty)+(c+(d-c)*tx)*ty;
}

/** Produces the same two packed manufacturing atlases used by every optical layer.
 * An imported grayscale symbol is sampled on the CPU; it adds no shader sampler.
 * All symbol positions and inclinations are seeded and fixed in card coordinates.
 */
export function generateMotifField(seed: number, aspect: number, scale: number, height: number, motif: MotifSpec, image?: MotifImage) {
  const width=Math.round(height*aspect),direction=new Uint8Array(width*height*4),relief=new Uint8Array(width*height*4);
  for(const symbol of motif.symbols) if(!atlases.has(symbol)) atlases.set(symbol,symbolAtlas(symbol));
  const symbols=motif.symbols.length?motif.symbols:['colorless' as const], scattered=motif.arrangement==='scattered';
  const shapeCoverage=new Float32Array(width*height);
  const write=(ix:number,iy:number,shape:number,edge:number,dx:number,dy:number,phase:number)=>{
    const x=(ix+.5)/height,y=(iy+.5)/height,i=(iy*width+ix)*4;
    const normalPhase=phase*TAU;
    const sheet=.025*Math.sin(x*6+y*3),lens=(.08+motif.curvature*.14)*shape;
    const nx=sheet+shape*Math.cos(normalPhase)*.13+dx*lens;
    const ny=.025*Math.sin(y*5)+shape*Math.sin(normalPhase)*.13+dy*lens;
    const angle=.25+shape*(.90+(phase-.5)*.32+dx*.16);
    const axis=encodeGratingAxis(angle);
    // Quiet foil between symbols is continuous, never per-cell noise.
    const pitch=.98+.025*Math.sin(x*5+y*3)+shape*(phase-.5)*.09;
    direction[i]=Math.round(axis[0]);direction[i+1]=Math.round(axis[1]);direction[i+2]=Math.round((pitch-.5)/1.5*255);
    const micro=.92+random(ix,iy,seed+941)*.08;
    direction[i+3]=Math.round((.07+shape*.55)*micro*255);
    relief[i]=Math.round(clamp(.5+nx)*255);relief[i+1]=Math.round(clamp(.5+ny)*255);
    relief[i+2]=Math.round((.5+shape*.015+edge*.005)*255);
    relief[i+3]=Math.round((.43+shape*.16+random(ix,iy,seed+937)*.05)*255);
  };
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)write(x,y,0,0,0,0,0);
  // Rasterize complete symbols across cell boundaries. Seeded cells distribute
  // centers only; the manufacturing shapes must never be clipped to a tile.
  for(let cy=-1;cy<=Math.ceil(scale);cy++)for(let cx=-1;cx<=Math.ceil(aspect*scale);cx++){
    const phase=random(cx,cy,seed+907);
    if(scattered && phase<.11)continue;
    const centerX=cx+.5+(scattered?(random(cx,cy,seed+911)-.5)*.9:(cy%2)*.5);
    const centerY=cy+.5+(scattered?(random(cx,cy,seed+919)-.5)*.9:0);
    const size=motif.size*(phase<.47?motif.smallScale:1);
    const symbol=symbols[Math.floor(random(cx,cy,seed+929)*symbols.length)];
    const angle=motif.rotation+(scattered?(phase-.5)*.16:0),ca=Math.cos(angle),sa=Math.sin(angle);
    const radius=size*1.5,aa=scale/height/size*.65;
    const left=Math.max(0,Math.floor((centerX-radius)/scale*height)),right=Math.min(width,Math.ceil((centerX+radius)/scale*height));
    const bottom=Math.max(0,Math.floor((centerY-radius)/scale*height)),top=Math.min(height,Math.ceil((centerY+radius)/scale*height));
    for(let iy=bottom;iy<top;iy++)for(let ix=left;ix<right;ix++){
      const dx=((ix+.5)/height*scale-centerX)/size,dy=((iy+.5)/height*scale-centerY)/size;
      const lx=dx*ca+dy*sa,ly=-dx*sa+dy*ca;
      if(Math.abs(lx)>=1.13||Math.abs(ly)>=1.13)continue;
      let shape:number,edge:number;
      if(image){shape=bilinear(image.data,image.width,image.height,(lx+1)/2,(1-ly)/2)/255;edge=shape*(1-shape)*4;}
      else{const d=bilinear(atlases.get(symbol)!,SIZE,SIZE,(lx+1.15)/2.3,(ly+1.15)/2.3);shape=1-smooth(-aa,aa,d);edge=Math.exp(-Math.abs(d)/.065);}
      const pixel=iy*width+ix;if(shape<=shapeCoverage[pixel])continue;
      shapeCoverage[pixel]=shape;write(ix,iy,shape,edge,dx,dy,phase);
    }
  }
  return {width,height,direction,relief};
}
