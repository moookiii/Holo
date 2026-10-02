import { encodeGratingAxis } from './Orientation.ts';
import { labelRegisteredStars, type StarImage } from './RegisteredStars.ts';
import type { FieldData, PatternSpec } from './ManufacturingField.ts';

/** Ancient Mew's scan-registered irregular flakes. Angular parameters are
 * estimates from the moving reference, not measured physical surface relief. */
export function generateAncientMew(spec: PatternSpec, height: number, image?: StarImage): FieldData {
  if (!image) throw new Error('Ancient Mew requires its registered flake PNG.');
  const width = Math.round(height * spec.aspect), labels = labelRegisteredStars(image);
  const direction = new Uint8Array(width * height * 4), relief = new Uint8Array(width * height * 4);
  const hash = (id: number, salt: number) => {
    let h = Math.imul(id ^ spec.seed ^ salt, 374761393);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  for (let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const u=(x+.5)/width, v=(y+.5)/height;
    const px=Math.min(image.width-1,Math.floor(u*image.width));
    const py=Math.min(image.height-1,Math.floor((1-v)*image.height));
    const p=py*image.width+px, shape=image.data[p]/255, id=labels[p], i=(y*width+x)*4;
    // The sheet has a quiet broad color travel; each registered flake has its
    // own grating axis and optical inclination, without animated noise.
    const axis=encodeGratingAxis(shape>0 ? hash(id,17)*Math.PI : .3+.22*Math.sin(v*8+u*3));
    direction[i]=axis[0]; direction[i+1]=axis[1];
    direction[i+2]=Math.round(shape>0 ? 55+hash(id,29)*105 : 78+20*Math.sin(v*7-u*4));
    direction[i+3]=Math.round(8+shape*247);
    relief[i]=Math.round(128+(hash(id,41)-.5)*110*shape);
    relief[i+1]=Math.round(128+(hash(id,53)-.5)*110*shape);
    relief[i+2]=128; relief[i+3]=255;
  }
  return {width,height,direction,relief};
}
