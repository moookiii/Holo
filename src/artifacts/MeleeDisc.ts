import {
  Group, Mesh, RingGeometry, LatheGeometry, Vector2, Vector3, TextureLoader,
  MeshPhysicalMaterial, MeshPhysicalNodeMaterial, SRGBColorSpace,
  type Texture, type Material, type BufferGeometry,
} from 'three/webgpu';
import {
  texture, uniform, vec3, vec4, mix, positionLocal, positionWorld, cameraPosition,
  modelWorldMatrix, normalWorld, float,
} from 'three/tsl';
import type { ArtifactInstance } from './types.ts';

// 80 mm diameter / 15 mm aperture / 1.2 mm total thickness, at 0.06 units/mm.
export const DISC = { radius: 2.4, hole: .45, hub: .744, halfThickness: .036 };
const FRONT = { cx: 618, cy: 628, radius: 604, width: 1254, height: 1254 };
const BACK = { cx: 630, cy: 610, radius: 603, width: 1264, height: 1244 };

/** Cartesian scan UVs. Back mesh is physically turned over, not mirrored UVs. */
export function discFace(inner: number, outer: number, back = false) {
  const geometry = new RingGeometry(inner, outer, 512, 1);
  const scan = back ? BACK : FRONT;
  const p = geometry.attributes.position, uv = geometry.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    uv.setXY(i, (scan.cx + p.getX(i) / DISC.radius * scan.radius) / scan.width,
      1 - (scan.cy - p.getY(i) / DISC.radius * scan.radius) / scan.height);
  }
  return geometry;
}

export function buildMeleeDisc(front: Texture, back: Texture, ink: Texture): ArtifactInstance {
  const root = new Group(); root.name = 'Melee optical disc';
  const geometries = new Set<BufferGeometry>(), materials = new Set<Material>();
  const light = uniform(new Vector3(-.4,.6,.7));
  const power = uniform(1), bandwidth = uniform(.045);
  const add = (name: string, geometry: BufferGeometry, material: Material) => {
    geometries.add(geometry); materials.add(material);
    const mesh = new Mesh(geometry,material); mesh.name=name; root.add(mesh); return mesh;
  };
  const label = new MeshPhysicalNodeMaterial({roughness:.39,metalness:0,clearcoat:.12,clearcoatRoughness:.24,
    envMapIntensity:.22,specularIntensity:.35});
  const coverage = texture(ink).r;
  label.colorNode=texture(front).rgb;
  label.metalnessNode=coverage.mul(.68);
  label.roughnessNode=mix(float(.39),float(.26),coverage);
  // A restrained thin-film response in the reflective printing only; no data grating.
  label.iridescenceNode=coverage.mul(.24);
  label.iridescenceIOR=1.38; label.iridescenceThicknessRange=[240,340];
  const face=add('Printed label',discFace(DISC.hub,2.366),label);face.position.z=.036;

  const data = new MeshPhysicalNodeMaterial({metalness:.92,roughness:.23,clearcoat:1,clearcoatRoughness:.13});
  const scan=texture(back).rgb;
  const radius=positionLocal.xy.length().div(DISC.radius);
  const dataMask=radius.smoothstep(.535,.55).mul(radius.smoothstep(.962,.978).oneMinus());
  // Preserve ring text and micro-detail; discard photographed spectral chroma only
  // on the data annulus. A scan's captured illumination is not live diffraction.
  const silver=scan.dot(vec3(.2126,.7152,.0722)).mul(.3).add(.48);
  data.colorNode=mix(scan,vec3(silver),dataMask);
  data.roughnessNode=mix(float(.29),float(.23),dataMask);
  const radial=modelWorldMatrix.mul(vec4(positionLocal.xy.normalize(),0,0)).xyz.normalize();
  const tangent=normalWorld.cross(radial).normalize();
  const view=cameraPosition.sub(positionWorld).normalize();
  const incoming=light;
  const sum=incoming.add(view);
  // Reflection grating equation m*lambda = pitch * (sin(theta_i)+sin(theta_o)).
  // DVD track pitch is ~0.74 micrometers. Tracks are concentric: dispersion is radial.
  const q=sum.dot(radial).abs();
  const across=sum.dot(tangent);
  const coherence=across.div(.24).pow2().negate().exp();
  const band=(wavelength:number)=>q.sub(wavelength/.74).div(bandwidth).pow2().negate().exp();
  // Overlapping visible wavelengths avoid three isolated RGB stripes.
  const spectrum=vec3(.15,0,1).mul(band(.42))
    .add(vec3(.03,.08,1).mul(band(.45)))
    .add(vec3(0,.55,1).mul(band(.48)))
    .add(vec3(0,1,.25).mul(band(.51)))
    .add(vec3(.3,1,0).mul(band(.54)))
    .add(vec3(1,.85,0).mul(band(.57)))
    .add(vec3(1,.35,0).mul(band(.60)))
    .add(vec3(1,.05,0).mul(band(.63)))
    .add(vec3(.6,0,0).mul(band(.66))).mul(.55);
  const illuminated=normalWorld.dot(incoming).max(0).sqrt();
  const visible=normalWorld.dot(view).max(0).sqrt();
  data.emissiveNode=spectrum.mul(coherence).mul(illuminated).mul(visible).mul(dataMask).mul(power);
  const reverse=add('Optical data layer',discFace(DISC.hub,2.366,true),data);
  reverse.rotation.y=Math.PI;reverse.position.z=-.031;

  const plastic = new MeshPhysicalMaterial({color:'#edf0ed',roughness:.16,metalness:0,
    transmission:.94,thickness:.072,ior:1.58,clearcoat:1,clearcoatRoughness:.13,
    transparent:true,opacity:1,envMapIntensity:.75});
  // Closed rotational cross-sections include real inner walls and small bevels.
  const solid=(name:string,profile:number[][],material:Material)=>{
    const geometry=new LatheGeometry(profile.map(([r,z])=>new Vector2(r,z)),512);
    geometry.rotateX(Math.PI/2);return add(name,geometry,material);
  };
  solid('Clear molded hub',[[.453,-.031],[.45,-.026],[.45,.026],[.453,.031],
    [.741,.031],[.748,.025],[.748,-.025],[.741,-.031],[.453,-.031]],plastic);
  solid('Polycarbonate outer edge',[[2.363,-.032],[2.389,-.032],[2.4,-.023],
    [2.4,.023],[2.389,.036],[2.363,.036],[2.363,-.032]],plastic);
  const edge=new MeshPhysicalMaterial({color:'#b7bdbd',metalness:.9,roughness:.24});
  solid('Aluminum edge',[[2.366,-.028],[2.394,-.028],[2.394,-.021],[2.366,-.021],[2.366,-.028]],edge);
  for(const r of [.475,.60,.704]) {
    solid('Molded hub ring',[[r-.004,-.031],[r,-.035],[r+.004,-.031],[r+.004,.031],
      [r,.035],[r-.004,.031],[r-.004,-.031]],plastic);
  }
  let disposed=false;
  return {root,groups:new Map(),inspect:()=>{},
    updateLighting(direction,intensity,broad){light.value.copy(direction).normalize();power.value=intensity*(broad?.075:.42);bandwidth.value=broad?.075:.036;},
    dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());new Set([front,back,ink]).forEach(t=>t.dispose());},
  };
}

export async function loadMeleeDisc(signal: AbortSignal) {
  const textures:Texture[]=[];
  try {
    const loader=new TextureLoader();
    for(const name of ['front','back','metallic-ink']) {
      signal.throwIfAborted();
      const map=await loader.loadAsync(`${import.meta.env.BASE_URL}artifacts/melee/${name}.png`);
      textures.push(map);map.anisotropy=8;
      if(name!=='metallic-ink')map.colorSpace=SRGBColorSpace;
    }
    signal.throwIfAborted();return buildMeleeDisc(textures[0],textures[1],textures[2]);
  } catch(error){textures.forEach(t=>t.dispose());throw error;}
}
