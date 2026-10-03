import test from 'node:test';
import assert from 'node:assert/strict';
import { Texture, Mesh, Raycaster, Vector3 } from 'three/webgpu';
import { buildMeleeDisc, discFace, DISC } from '../src/artifacts/MeleeDisc.ts';

test('disc has a real 15 mm aperture and thin 1.2 mm profile',()=>{
  const disc=buildMeleeDisc(new Texture(),new Texture(),new Texture());
  disc.root.updateMatrixWorld(true);
  for(const direction of [-1,1]){
    const ray=new Raycaster(new Vector3(0,0,direction*5),new Vector3(0,0,-direction));
    assert.equal(ray.intersectObject(disc.root,true).length,0,'Center must be open from both sides');
  }
  let count=0;
  disc.root.traverse(o=>{if(o instanceof Mesh){count++;o.geometry.computeBoundingBox();const b=o.geometry.boundingBox!;
    assert.ok(b.max.z+o.position.z<=.037 && b.min.z+o.position.z>=-.068);
  }});
  assert.ok(count<12);assert.equal(DISC.hole/DISC.radius,.1875);disc.dispose();
});

test('scan UV coordinates preserve pixel aspect and opposite faces',()=>{
  for(const back of [false,true]){
    const g=discFace(.744,2.366,back),p=g.attributes.position,uv=g.attributes.uv;
    const w=back?1264:1254,h=back?1244:1254,r=back?603:604;
    for(let i=0;i<p.count;i++){
      assert.ok(Math.abs(uv.getX(i)*w-(back?630:618)-p.getX(i)/2.4*r)<.001);
      assert.ok(Math.abs((1-uv.getY(i))*h-(back?610:628)+p.getY(i)/2.4*r)<.001);
    }g.dispose();
  }
});

test('switch disposal releases all owned geometry, materials and textures exactly once',()=>{
  const textures=[new Texture(),new Texture(),new Texture()];
  const disc=buildMeleeDisc(...textures as [Texture,Texture,Texture]);
  const resources=new Set<any>(textures);
  disc.root.traverse(o=>{if(o instanceof Mesh){resources.add(o.geometry);resources.add(o.material);}});
  let count=0;for(const r of resources)r.addEventListener('dispose',()=>count++);
  disc.dispose();disc.dispose();assert.equal(count,resources.size);
});
