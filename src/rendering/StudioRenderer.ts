import { WebGPURenderer, RenderPipeline, Scene, PerspectiveCamera, Color, NeutralToneMapping, SRGBColorSpace } from 'three/webgpu';
import { pass } from 'three/tsl';
import { startupPipelines, startupTiming } from './LoadTiming';

export async function createRenderer(container: HTMLElement) {
  const requestedBackend = new URLSearchParams(location.search).get('backend');
  // Firefox currently exposes WebGPU on configurations where Three's node
  // material pipeline can initialize successfully but produce a black canvas.
  // Its WebGL 2 backend is stable and supports the same TSL material graph.
  const firefox = /Firefox\//.test(navigator.userAgent);
  const renderer = new WebGPURenderer({ antialias: true, alpha: false, forceWebGL: requestedBackend === 'webgl' || (firefox && requestedBackend !== 'webgpu') });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);
  await renderer.init();
  const backend = renderer.backend as unknown as { createRenderPipeline: (object: { material: { name: string; type: string } }, promises?: Promise<unknown>[]) => void };
  const create = backend.createRenderPipeline;
  backend.createRenderPipeline = function(object, promises) {
    if (startupTiming.firstCardInteractive !== undefined) return create.call(this, object, promises);
    const entry = { material: object.material.name || object.material.type, started: performance.now(), elapsed: 0, async: Array.isArray(promises) };
    startupPipelines.push(entry);
    const count = promises?.length ?? 0;
    create.call(this, object, promises);
    entry.elapsed = performance.now() - entry.started;
    if (promises) void Promise.all(promises.slice(count)).then(() => { entry.elapsed = performance.now() - entry.started; });
  };
  const scene = new Scene(); scene.background = new Color('#050505');
  const camera = new PerspectiveCamera(30, container.clientWidth / container.clientHeight, 0.2, 100);
  const pipeline = new RenderPipeline(renderer);
  const scenePass = pass(scene, camera);
  scenePass.setMRT(null);
  // Match PassNode.setup before the first render so precompiled card pipelines
  // use the same HDR attachment format and sample count as presentation.
  scenePass.renderTarget.samples = renderer.samples;
  scenePass.renderTarget.texture.type = renderer.getOutputBufferType();
  pipeline.outputNode = scenePass;
  return { renderer, scene, camera, pipeline, scenePass };
}
