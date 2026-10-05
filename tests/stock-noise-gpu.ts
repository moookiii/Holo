import { WebGPURenderer, NodeMaterial, Scene, OrthographicCamera, Mesh, PlaneGeometry, RenderTarget } from 'three/webgpu';
import { Fn, uv, vec2, vec3, vec4, any, mx_cell_noise_float } from 'three/tsl';
import { stockCellNoise } from '../src/materials/layers/StockCellNoise';

/** Compare the optimized GPU hash against Three's independent scalar reference,
 * including negative cells and integer boundaries. No screenshot tolerance. */
export async function verifyStockNoise(forceWebGL: boolean) {
  const renderer = new WebGPURenderer({ forceWebGL }); await renderer.init();
  const target = new RenderTarget(256, 256), scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 2); camera.position.z = 1;
  const material = new NodeMaterial();
  material.fragmentNode = Fn(() => {
    const point = uv().mul(vec2(8191, 65521)).sub(vec2(4096, 32768)).floor().toVar();
    const reference = vec4(mx_cell_noise_float(point), mx_cell_noise_float(point.add(vec2(1, 0))),
      mx_cell_noise_float(point.add(vec2(0, 1))), mx_cell_noise_float(point.add(1)));
    const mismatch = any(reference.notEqual(stockCellNoise(point)));
    return vec4(mismatch.select(vec3(1), vec3(0)), 1);
  })();
  const geometry = new PlaneGeometry(2, 2); scene.add(new Mesh(geometry, material));
  try {
    renderer.setRenderTarget(target); await renderer.renderAsync(scene, camera);
    const pixels = await renderer.readRenderTargetPixelsAsync(target, 0, 0, 256, 256);
    let mismatches = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] !== 255) throw Error('Noise comparison did not render');
      if (pixels[i] || pixels[i + 1] || pixels[i + 2]) mismatches++;
    }
    if (mismatches) throw Error(`${mismatches} stock cells changed`);
    return { backend: renderer.backend.constructor.name, comparedCells: 256 * 256 * 4, mismatches };
  } finally { geometry.dispose(); material.dispose(); target.dispose(); renderer.dispose(); }
}
