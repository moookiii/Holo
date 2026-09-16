import './styles.css';
import { Raycaster, Vector2 } from 'three/webgpu';
import { createRenderer } from './rendering/StudioRenderer';
import { StudioLighting } from './lighting/StudioLighting';
import { cards as builtInCards, type CardDefinition } from './card/CardDefinition';
import { CardFactory } from './card/CardFactory';
import type { CardInstance } from './card/CardInstance';
import { CardMotion, type InteractionMode } from './input/Motion';
import { PointerController } from './input/PointerController';
import { createUI } from './ui/PresentationUI';
import { HolographicMaterial } from './materials/HolographicMaterial';
import { framingDistance } from './camera/Framing';
import { profiles } from './materials/profiles';
import { resolveCardProfile } from './materials/profiles/resolveCardProfile';
import type { ImportedCard } from './assets/CardImporter';
import type { createImportDialog } from './ui/ImportDialog';
import type { PackOpeningController, DebugPackStage } from './pack/PackOpeningController';

async function start() {
  const container = document.querySelector<HTMLElement>('#studio')!;
  const loading = document.querySelector<HTMLElement>('#loading')!;
  const loadingLabel = loading.querySelector<HTMLElement>('.loading-label')!;
  const setLoading = (visible: boolean, label = 'Loading studio…') => {
    loadingLabel.textContent = label;
    loading.hidden = !visible;
    loading.setAttribute('aria-hidden', String(!visible));
  };
  setLoading(true);
  const { renderer, scene, camera, pipeline, scenePass } = await createRenderer(container);
  const factory = new CardFactory(renderer, camera, scene, scenePass.renderTarget);
  const { assets, maps: mapLoader } = factory;
  const cards = [...builtInCards];
  const lighting = new StudioLighting(scene);
  await lighting.createEnvironment(renderer);
  let initialMode: InteractionMode = 'tilt';
  try { if (localStorage.getItem('holo:interaction-mode') === 'rotate') initialMode = 'rotate'; } catch { /* Session preference is optional. */ }
  const motion = new CardMotion(initialMode);
  const clickRay = new Raycaster();
  const pointer = new PointerController(container, motion, (x, y) => {
    const rect = container.getBoundingClientRect();
    clickRay.setFromCamera(new Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2), camera);
    if (card && clickRay.intersectObject(card, false).length) motion.requestFlip();
  });
  const setMode = (mode: InteractionMode) => {
    pointer.setMode(mode);
    try { localStorage.setItem('holo:interaction-mode', mode); } catch { /* Restricted storage does not affect controls. */ }
  };
  let definition = cards[0];
  let activeCard: CardInstance;
  let card: CardInstance['mesh'];
  let loadGeneration = 0;
  let profileGeneration = 0;
  let requestedCardId = definition.id;
  let disposed = false;
  let activeProfile = 'master-prism';
  let ui: ReturnType<typeof createUI> | undefined;
  let importDialog: ReturnType<typeof createImportDialog> | undefined;
  let openingImport = false;
  let pack: PackOpeningController | undefined;
  let packRequest: AbortController | undefined;
  let packSeed = 1741;
  let warmupRequest: AbortController | undefined;
  let warmupIdleHandle: number | undefined;
  const viewerUI = document.querySelector<HTMLElement>('#ui')!;
  const warmupCardIds = ['tyranitar-paldea-evolved', 'squirtle-frlg-reverse', 'blue-eyes', 'lugia-neo-genesis', 'dark-magician-girl'];
  const cancelWarmup = () => {
    warmupRequest?.abort(); warmupRequest = undefined;
    if (warmupIdleHandle !== undefined) {
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(warmupIdleHandle);
      else window.clearTimeout(warmupIdleHandle);
      warmupIdleHandle = undefined;
    }
  };
  const scheduleWarmup = () => {
    if (disposed || pack || packRequest || !ui) return;
    cancelWarmup();
    const start = () => {
      warmupIdleHandle = undefined;
      const request = new AbortController(); warmupRequest = request;
      void (async () => {
        try {
          for (const id of warmupCardIds) {
            if (request.signal.aborted || id === definition.id) continue;
            const next = cards.find(card => card.id === id);
            if (!next) continue;
            const candidate = await factory.create(next, request.signal, false, -1);
            candidate.dispose();
          }
          for (const profile of profiles.filter(profile => profile.family === definition.franchise).slice(0, 2)) {
            if (request.signal.aborted) break;
            await prepareProfile(profile, definition, -1);
          }
        } catch (error) {
          if (!request.signal.aborted) console.warn('Idle warmup failed', error);
        } finally {
          if (warmupRequest === request) warmupRequest = undefined;
        }
      })();
    };
    if (typeof window.requestIdleCallback === 'function') warmupIdleHandle = window.requestIdleCallback(start, { timeout: 1800 });
    else warmupIdleHandle = window.setTimeout(start, 900);
  };
  const cancelPackLoad = document.createElement('button');
  cancelPackLoad.className = 'pack-load-cancel'; cancelPackLoad.textContent = 'Back to viewer'; cancelPackLoad.hidden = true; loading.append(cancelPackLoad);
  const closePack = () => {
    cancelWarmup();
    packRequest?.abort(); packRequest = undefined;
    pack?.dispose(); pack = undefined;
    factory.setBackgroundPaused(false);
    card.visible = true; pointer.setEnabled(true); viewerUI.inert = false;
    document.body.classList.remove('pack-mode'); cancelPackLoad.hidden = true; setLoading(false);
    scheduleWarmup();
    document.querySelector<HTMLButtonElement>('#pack-open')?.focus({ preventScroll: true });
  };
  cancelPackLoad.onclick = closePack;
  const inspectPackCard = (instance: CardInstance) => {
    pack?.dispose(instance); pack = undefined; packRequest = undefined;
    factory.setBackgroundPaused(false);
    ++loadGeneration; ++profileGeneration;
    activeCard.dispose(); activeCard = instance; definition = instance.definition; card = instance.mesh; scene.add(card);
    motion.setPose(-.10, .025); motion.zoom = motion.targetZoom = 1;
    activeProfile = definition.profile; requestedCardId = definition.id; ui?.selectCard(definition.id); ui?.selectProfile(activeProfile);
    pointer.setEnabled(true); viewerUI.inert = false; document.body.classList.remove('pack-mode');
    releaseRetiredImports(); document.querySelector<HTMLButtonElement>('#pack-open')?.focus({ preventScroll: true });
  };
  const openPack = async (id = 'archive-01') => {
    if (disposed) return;
    cancelWarmup();
    if (!['archive-01', 'test-pack'].includes(id)) throw new Error(`Unknown pack: ${id}`);
    if (pack || packRequest) closePack();
    const request = new AbortController(); packRequest = request;
    factory.setBackgroundPaused(true);
    ++loadGeneration; ++profileGeneration; ui?.close(); pointer.setEnabled(false); viewerUI.inert = true;
    document.body.classList.add('pack-mode'); cancelPackLoad.hidden = false; setLoading(true, 'Preparing five physical cards…');
    try {
      const [{ PackOpeningController }, { showcasePack }] = await Promise.all([import('./pack/PackOpeningController'), import('./pack/PackDefinition')]);
      request.signal.throwIfAborted();
      const candidate = await PackOpeningController.create(showcasePack, packSeed, { factory, definitions: cards, scene, camera, lighting, element: container,
        signal: request.signal, close: closePack, inspect: inspectPackCard,
        progress: (ready, total) => { if (!request.signal.aborted) setLoading(true, `Preparing collection · ${ready} / ${total}`); } });
      if (request.signal.aborted || disposed) { candidate.dispose(); return; }
      pack = candidate; card.visible = false; cancelPackLoad.hidden = true; setLoading(false);
    } catch (error) {
      if (request.signal.aborted) return;
      closePack(); throw error;
    }
  };
  const imports = new Map<string, ImportedCard>();
  const retiredImports = new Set<string>();
  const pendingLoads = new Map<string, number>();
  const releaseRetiredImports = () => {
    for (const id of retiredImports) {
      if (definition.id === id || pendingLoads.get(id) || factory.inUse(id)) continue;
      const imported = imports.get(id);
      if (imported) {
        mapLoader.release(id); imported.assetUrls.forEach(url => assets.release(url)); imported.dispose(); imports.delete(id);
      }
      retiredImports.delete(id);
    }
  };
  const prepareProfile = factory.prepareProfile.bind(factory);
  const setProfile = async (id: string) => {
    cancelWarmup(); factory.setBackgroundPaused(true);
    try {
      const p = resolveCardProfile(definition, id);
      const generation = ++profileGeneration;
      const field = await prepareProfile(p, definition);
      if (generation !== profileGeneration) return;
      const material = card.material[0] as HolographicMaterial;
      material.setProfile(p, field); activeProfile = id;
      ui?.selectProfile(id);
    } finally {
      factory.setBackgroundPaused(false); scheduleWarmup();
    }
  };
  const setCard = async (id: string) => {
    const next = cards.find(c => c.id === id);
    if (!next) throw new Error(`Unknown card: ${id}`);
    if (disposed) return;
    const generation = ++loadGeneration;
    cancelWarmup(); factory.setBackgroundPaused(true);
    requestedCardId = id;
    pendingLoads.set(id, (pendingLoads.get(id) ?? 0) + 1);
    setLoading(true, definition.id === id ? 'Loading card…' : 'Loading next card…');
    try {
    ++profileGeneration;
    const candidate = await factory.create(next);
    if (generation !== loadGeneration || disposed) { candidate.dispose(); return; }
    // Transfer ownership only after textures, manufacturing fields and GPU programs are ready.
    ++profileGeneration;
    activeCard?.dispose();
    activeCard = candidate; definition = next; card = candidate.mesh;
    card.quaternion.copy(motion.orientation); scene.add(card);
    activeProfile = next.profile; ui?.selectProfile(activeProfile); ui?.selectCard(id);
    } finally {
      const remaining = pendingLoads.get(id)! - 1;
      if (remaining) pendingLoads.set(id, remaining); else pendingLoads.delete(id);
      if (generation === loadGeneration) {
        requestedCardId = definition.id;
        setLoading(false);
      }
      releaseRetiredImports();
      factory.setBackgroundPaused(false); scheduleWarmup();
    }
  };
  const addImportedCard = async (imported: ImportedCard) => {
    if (disposed) throw new Error('The studio was reloaded. Open the import again.');
    const { id } = imported.definition;
    imports.set(id, imported); cards.push(imported.definition); ui?.refreshCards();
    try { await setCard(id); }
    catch (error) {
      cards.splice(cards.findIndex(c => c.id === id), 1); retiredImports.add(id); releaseRetiredImports(); ui?.refreshCards();
      throw error;
    }
  };
  const removeImportedCard = async (id: string) => {
    if (!imports.has(id) || retiredImports.has(id)) return;
    const index = cards.findIndex(c => c.id === id), removed = cards.splice(index, 1)[0];
    retiredImports.add(id); ui?.refreshCards();
    try {
      // Keep the outgoing textures alive until another complete card replaces them.
      if (definition.id === id || requestedCardId === id) await setCard(builtInCards[0].id);
      releaseRetiredImports();
    } catch (error) {
      retiredImports.delete(id); cards.splice(index, 0, removed); ui?.refreshCards(); throw error;
    }
  };
  const openImport = async () => {
    if (openingImport || disposed) return;
    openingImport = true;
    try {
      if (!importDialog) {
        const { createImportDialog } = await import('./ui/ImportDialog');
        if (disposed) return;
        importDialog = createImportDialog(profiles, addImportedCard);
      }
      importDialog.open();
    } finally { openingImport = false; }
  };
  await setCard(definition.id);
  ui = createUI(document.querySelector('#ui')!, cards, profiles, {
    flip: () => motion.requestFlip(), reset: () => motion.reset(), mode: setMode,
    card: id => { void setCard(id).catch(showError); }, profile: id => { void setProfile(id).catch(showError); }, light: preset => lighting.setPreset(preset),
    importCard: () => { void openImport().catch(showError); }, removeCard: id => { void removeImportedCard(id).catch(showError); },
    pack: () => { void openPack().catch(showError); },
  }, motion.mode, new URLSearchParams(location.search).has('lab'));
  scheduleWarmup();
  const resize = () => {
    camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(container.clientWidth, container.clientHeight);
  };
  const observer = new ResizeObserver(resize); observer.observe(container);
  let last = performance.now();
  const frameTimes: number[] = [];
  renderer.setAnimationLoop(() => {
    const now = performance.now(); const dt = (now - last) / 1000; last = now;
    if (pack) pack.update(dt);
    else {
      motion.update(dt); card.quaternion.copy(motion.orientation);
      camera.position.z = framingDistance(definition.dimensions, motion.orientation, camera.aspect, camera.fov, container.clientHeight) * motion.zoom;
      camera.position.y = -0.06;
    }
    pipeline.render();
    if (frameTimes.length >= 240) frameTimes.shift(); frameTimes.push(dt * 1000);
  });
  // Development control surface also powers repeatable visual captures. No tuning UI in presentation.
  const debug = {
    ready: true, renderer, scene, camera, lighting, motion, factory,
    pack: {
      open: openPack, close: closePack, reset: () => openPack(), setSeed: (seed: number) => { packSeed = seed >>> 0; },
      setStage: (stage: DebugPackStage, progress = 0) => pack?.setStage(stage, progress),
      skipToHit: () => pack?.setStage('hit', 0), summary: () => pack?.setStage('summary'),
      select: (index: number) => pack?.select(index), advance: () => pack?.advance(),
      setRevealProgress: (progress: number) => pack?.setRevealProgress(progress),
      pose: (yaw: number, pitch = 0, roll = 0) => pack?.pose(yaw, pitch, roll),
      stats: () => pack?.stats() ?? { state: packRequest ? 'Loading' : 'Closed' },
    },
    material: () => card.material[0] as HolographicMaterial,
    pose: (yaw: number, pitch: number, roll = 0) => motion.setPose(yaw * Math.PI / 180, pitch * Math.PI / 180, roll * Math.PI / 180),
    flip: () => motion.requestFlip(), reset: () => motion.reset(),
    zoom: (value: number) => { motion.zoom = value; motion.targetZoom = value; },
    setCard, setProfile, setMode: (mode: InteractionMode) => { setMode(mode); ui?.selectMode(mode); }, profiles, cards,
    stats: () => ({ backend: renderer.backend.constructor.name, card: definition.id, profile: activeProfile, mode: motion.mode, frameMs: frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length, frames: frameTimes.length, triangles: renderer.info.render.triangles, quaternion: motion.orientation.toArray(), zoom: motion.zoom }),
    hideUI: () => { document.querySelector<HTMLElement>('#ui')!.style.display = 'none'; },
  };
  Object.assign(window, { __holo: debug });
  // Do not queue every franchise profile at startup: pack loading and user card changes
  // must get exclusive access to the pattern worker. Profiles are prepared on demand.
  let lab: { dispose: () => void } | undefined;
  if (new URLSearchParams(location.search).has('lab')) {
    const { createMaterialLab } = await import('./debug/MaterialLab');
    lab = createMaterialLab({ material: () => card.material[0] as HolographicMaterial, renderer, lighting, motion });
  }
  if (import.meta.hot) import.meta.hot.dispose(() => {
    disposed = true;
    cancelWarmup(); packRequest?.abort(); pack?.dispose(); cancelPackLoad.remove();
    ++loadGeneration; ++profileGeneration;
    renderer.setAnimationLoop(null); pointer.dispose(); observer.disconnect(); lab?.dispose();
    factory.dispose(); lighting.dispose(); pipeline.dispose(); renderer.dispose(); ui?.dispose(); importDialog?.dispose();
    imports.forEach(imported => imported.dispose()); imports.clear();
  });
}
function showError(error: unknown) {
  console.error(error);
  const loading = document.querySelector<HTMLElement>('#loading');
  if (loading) loading.hidden = true;
  const element = document.querySelector<HTMLElement>('#error')!;
  element.textContent = `The card studio could not start. ${error instanceof Error ? error.message : 'A browser with WebGPU or WebGL 2 is required.'}`;
  element.hidden = false;
}
void start().catch(showError);
