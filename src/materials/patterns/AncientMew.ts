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
  // Island optics are constant. Keep doubles until the original per-pixel
  // quantization so antialiased shape values produce identical texture bytes.
  let maxId = 0;
  for (const id of labels) maxId = Math.max(maxId, id);
  const islands = new Float64Array((maxId + 1) * 5);
  for (let id = 0; id <= maxId; id++) {
    const axis = encodeGratingAxis(hash(id, 17) * Math.PI), offset = id * 5;
    islands[offset] = axis[0]; islands[offset + 1] = axis[1];
    islands[offset + 2] = 55 + hash(id, 29) * 105;
    islands[offset + 3] = (hash(id, 41) - .5) * 110;
    islands[offset + 4] = (hash(id, 53) - .5) * 110;
  }
  const columns = new Int32Array(width), us = new Float64Array(width);
  for (let x = 0; x < width; x++) {
    us[x] = (x + .5) / width;
    columns[x] = Math.min(image.width - 1, Math.floor(us[x] * image.width));
  }
  for (let y=0;y<height;y++) {
    const v=(y+.5)/height;
    const py=Math.min(image.height-1,Math.floor((1-v)*image.height));
    for(let x=0;x<width;x++) {
      const u=us[x], px=columns[x];
      const p=py*image.width+px, shape=image.data[p]/255, id=labels[p], i=(y*width+x)*4;
      // The sheet has a quiet broad color travel; each registered flake has its
      // own grating axis and optical inclination, without animated noise.
      const offset=id*5;
      if(shape>0) {
        direction[i]=islands[offset]; direction[i+1]=islands[offset+1];
      } else {
        const angle=2*(.3+.22*Math.sin(v*8+u*3));
        direction[i]=(Math.cos(angle)*.5+.5)*255;
        direction[i+1]=(Math.sin(angle)*.5+.5)*255;
      }
      direction[i+2]=Math.round(shape>0 ? islands[offset+2] : 78+20*Math.sin(v*7-u*4));
      direction[i+3]=Math.round(8+shape*247);
      relief[i]=Math.round(128+islands[offset+3]*shape);
      relief[i+1]=Math.round(128+islands[offset+4]*shape);
      relief[i+2]=128; relief[i+3]=255;
    }
  }
  return {width,height,direction,relief};
}
