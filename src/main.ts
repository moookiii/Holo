import './styles.css';
import { startupMark, startupTiming, startupPipelines } from './rendering/LoadTiming';
import { Raycaster, Vector2, Vector3 } from 'three/webgpu';
import { createRenderer } from './rendering/StudioRenderer';
import { StudioLighting } from './lighting/StudioLighting';
import { cards as builtInCards, type CardDefinition } from './card/CardDefinition';
import { CardFactory } from './card/CardFactory';
import type { CardInstance } from './card/CardInstance';
import { CardMotion, smootherstep, type InteractionMode } from './input/Motion';
import { PointerController } from './input/PointerController';
import { createUI } from './ui/PresentationUI';
import { HolographicMaterial } from './materials/HolographicMaterial';
import { framingDistance } from './camera/Framing';
import { profiles } from './materials/profiles';
import { readUserProfiles } from './lab/ProfileCodec';
import { resolveCardProfile } from './materials/profiles/resolveCardProfile';
import type { ImportedCard } from './assets/CardImporter';
import type { createImportDialog } from './ui/ImportDialog';
import type { PackOpeningController, DebugPackStage, PackLoadMetrics } from './pack/PackOpeningController';
import { getPack, resolvePackContents, type PackDefinition } from './pack/PackDefinition';
import { CardCpuPreparation, type PreparedCardCpu } from './card/CardCpuPreparation';
import { packIdentity, prepareExactPack, type PreparedPack } from './pack/PreparedPack';
import type { PackBrowser } from './pokemon/PackBrowser';
import { prismaticPickerCards } from './pokemon/PrismaticSurfaces';

async function start() {
  startupMark('modulesReady');
  try { for (const profile of readUserProfiles(localStorage)) if (!profiles.some(p => p.id === profile.id)) profiles.push(profile); } catch (error) { console.warn('Saved profile library could not be loaded', error); }
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
  startupMark('rendererReady');
  const factory = new CardFactory(renderer, camera, scene, scenePass.renderTarget);
  const cpuPreparation = new CardCpuPreparation(profiles);
  const { assets, maps: mapLoader } = factory;
  const cards = [...builtInCards, ...prismaticPickerCards()];
  const initialCard = cards.find(card => card.id === 'pokemon:sv08.5-161:holo') ?? cards[0];
  const lighting = new StudioLighting(scene);
  await lighting.createEnvironment(renderer);
  startupMark('environmentReady');
  const initialMode: InteractionMode = 'combined';
  const motion = new CardMotion(initialMode);
  const resetPositionStart = new Vector3();
  let resetPositionElapsed = -1;
  const clickRay = new Raycaster();
  const pointer = new PointerController(container, motion, (x, y) => {
    const rect = container.getBoundingClientRect();
    clickRay.setFromCamera(new Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2), camera);
    if (card && clickRay.intersectObject(card, false).length) motion.requestFlip();
  }, (dx, dy) => {
    if (!card) return;
    resetPositionElapsed = -1;
    const unitsPerPixel = 2 * camera.position.z * Math.tan(camera.fov * Math.PI / 360) / container.clientHeight;
    card.position.x += dx * unitsPerPixel;
    card.position.y -= dy * unitsPerPixel;
  });
  const setMode = (mode: InteractionMode) => {
    pointer.setMode(mode);
    try { localStorage.setItem('holo:interaction-mode', mode); } catch { /* Restricted storage does not affect controls. */ }
  };
  let definition = initialCard;
  let activeCard: CardInstance;
  let card: CardInstance['mesh'];
  const resetCard = () => {
    motion.reset();
    resetPositionStart.copy(card.position);
    resetPositionElapsed = 0;
  };
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
  let packSeed = crypto.getRandomValues(new Uint32Array(1))[0];
  let warmupRequest: AbortController | undefined;
  let warmupIdleHandle: number | undefined;
  let preparedPack: PreparedPack | undefined;
  let selectedPack: PackDefinition = getPack('archive-01');
  let packBrowser: PackBrowser | undefined;
  let browserLoading = false;
  const packMetrics: Partial<PackLoadMetrics> & { cpuPreparationMs?: number; clickAt?: number; clickToGpuMs?: number; loadCompleteMs?: number; firstVisibleMs?: number; clickToReadyMs?: number; moduleLoadMs?: number; lastWasPrepared: boolean } = { lastWasPrepared: false };
  const viewerUI = document.querySelector<HTMLElement>('#ui')!;
  const cancelWarmup = () => {
    warmupRequest?.abort(); warmupRequest = undefined; preparedPack = undefined;
    if (warmupIdleHandle !== undefined) {
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(warmupIdleHandle); else window.clearTimeout(warmupIdleHandle);
      warmupIdleHandle = undefined;
    }
  };
  const scheduleWarmup = () => {
    if (disposed || pack || packRequest || packBrowser || browserLoading || !ui || new URLSearchParams(location.search).has('lab')) return;
    cancelWarmup();
    const start = () => {
      warmupIdleHandle = undefined; const request = new AbortController(); warmupRequest = request;
      void (async () => {
        try {
          // Pokémon is collated by the browser only after selecting a booster.
          if (selectedPack.pokemon) return;
          const started = performance.now(), seed = packSeed, packDefinition = selectedPack;
          const prepared = await prepareExactPack(packDefinition, seed, cards, request.signal, (card, signal) => cpuPreparation.prepare(card, signal));
          if (!request.signal.aborted && warmupRequest === request && selectedPack === packDefinition && packSeed === seed) {
            packMetrics.cpuPreparationMs = performance.now() - started; preparedPack = prepared;
          }
        } catch (error) { if (!request.signal.aborted) console.warn('CPU pack preparation failed', error); }
        finally { if (warmupRequest === request) warmupRequest = undefined; }
      })();
    };
    if (typeof window.requestIdleCallback === 'function') warmupIdleHandle = window.requestIdleCallback(start, { timeout: 1800 }); else warmupIdleHandle = window.setTimeout(start, 900);
  };
  const cancelPackLoad = document.createElement('button');
  cancelPackLoad.className = 'pack-load-cancel'; cancelPackLoad.textContent = 'Back to viewer'; cancelPackLoad.hidden = true; loading.append(cancelPackLoad);
  const closePack = () => {
    const hadPack = !!pack || !!packRequest;
    cancelWarmup();
    packRequest?.abort(); packRequest = undefined;
    pack?.dispose(); pack = undefined;
    factory.setBackgroundPaused(false);
    card.visible = true; pointer.setEnabled(true); viewerUI.inert = false;
    document.body.classList.remove('pack-mode'); cancelPackLoad.hidden = true; setLoading(false);
    if (hadPack) packSeed = crypto.getRandomValues(new Uint32Array(1))[0];
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
    packSeed = crypto.getRandomValues(new Uint32Array(1))[0];
    releaseRetiredImports(); scheduleWarmup(); document.querySelector<HTMLButtonElement>('#pack-open')?.focus({ preventScroll: true });
  };
  const openPack = async (id = selectedPack.id, exact?: PreparedPack) => {
    if (disposed) return;
    const target = exact?.definition ?? getPack(id);
    const seed = exact?.seed ?? packSeed;
    const cached = exact ?? (preparedPack?.identity === packIdentity(target, seed) ? preparedPack : undefined);
    if (exact && exact.identity !== packIdentity(target, seed, exact.contents)) throw new Error('Prepared pack identity changed. Select the booster again.');
    const clickStarted = performance.now(); packMetrics.lastWasPrepared = !!cached;
    packMetrics.clickAt = clickStarted;
    delete packMetrics.clickToReadyMs; delete packMetrics.firstVisibleMs; delete packMetrics.loadCompleteMs;
    cancelWarmup();
    if (pack || packRequest) closePack();
    selectedPack = target; packSeed = seed;
    const request = new AbortController(); packRequest = request;
    factory.setBackgroundPaused(true);
    ++loadGeneration; ++profileGeneration; ui?.close(); pointer.setEnabled(false); viewerUI.inert = true;
    document.body.classList.add('pack-mode'); cancelPackLoad.hidden = false; setLoading(true, 'Preparing pack…');
    try {
      const { PackOpeningController } = await import('./pack/PackOpeningController');
      packMetrics.moduleLoadMs = performance.now() - clickStarted;
      request.signal.throwIfAborted();
      const candidate = await PackOpeningController.create(target, seed, { factory, definitions: cached?.definitions ?? cards, scene, camera, lighting, element: container,
        prepared: cached?.cards, preparedContents: cached?.contents,
        prepareCardCpu: (card, signal) => cpuPreparation.prepare(card, signal),
        metrics: metrics => Object.assign(packMetrics, metrics),
        gpuReady: () => { packMetrics.clickToGpuMs = performance.now() - clickStarted; },
        signal: request.signal, close: closePack, inspect: inspectPackCard,
        openAnotherPack: () => { closePack(); void browsePacks().catch(showError); },
        progress: (ready, total) => { if (!request.signal.aborted) setLoading(true, `Preparing collection · ${ready} / ${total}`); } });
      if (request.signal.aborted || disposed) { candidate.dispose(); return; }
      if (cached) {
        for (const pulled of cached.definitions) if (!cards.some(c => c.id === pulled.id)) cards.push(pulled);
        ui?.refreshCards();
      }
      packMetrics.loadCompleteMs = performance.now() - clickStarted;
      pack = candidate; card.visible = false; cancelPackLoad.hidden = true; setLoading(false);
    } catch (error) {
      if (request.signal.aborted) return;
      closePack(); throw error;
    }
  };
  const browsePacks = async () => {
    if (disposed || packBrowser || browserLoading) return;
    browserLoading = true; cancelWarmup(); ui?.close(); pointer.setEnabled(false);
    try {
      const { PackBrowser } = await import('./pokemon/PackBrowser');
      if (disposed) return;
      packBrowser = new PackBrowser({ definitions: cards,
        prepare: (definition, seed, definitions, signal, progress) => prepareExactPack(definition, seed, definitions, signal,
          (card, signal) => cpuPreparation.prepare(card, signal), progress),
        open: prepared => openPack(prepared.definition.id, prepared),
        close: () => { packBrowser = undefined; if (!pack && !packRequest) pointer.setEnabled(true); scheduleWarmup(); },
      });
    } finally { browserLoading = false; if (!packBrowser && !pack) pointer.setEnabled(true); }
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
      if (!(card.material[0] instanceof HolographicMaterial) || (p.id === 'print-only' && !new URLSearchParams(location.search).has('lab'))) {
        const candidate = await factory.create({ ...definition, profile: id, profileOverrides: id === definition.profile ? definition.profileOverrides : undefined });
        if (generation !== profileGeneration || disposed) { candidate.dispose(); return; }
        candidate.mesh.position.copy(card.position); candidate.mesh.quaternion.copy(card.quaternion); candidate.mesh.scale.copy(card.scale);
        activeCard.dispose(); activeCard = candidate; card = candidate.mesh; scene.add(card);
        activeProfile = id; ui?.selectProfile(id); return;
      }
      const field = await prepareProfile(p, definition);
      if (generation !== profileGeneration) return;
      const material = card.material[0] as HolographicMaterial;
      const frontImage = material.printTextureNode.value.image as HTMLImageElement;
      const maps = await mapLoader.load({ ...definition, maps: { ...definition.maps, ...p.maps } }, frontImage.width / frontImage.height, p.watermark === 'quarter-century');
      if (generation !== profileGeneration) return;
      material.setMaps(maps); material.setProfile(p, field); activeProfile = id;
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
    const candidate = await factory.create(next, undefined, true, 0, new URLSearchParams(location.search).has('lab'));
    if (generation !== loadGeneration || disposed) { candidate.dispose(); return; }
    // Transfer ownership only after textures, manufacturing fields and GPU programs are ready.
    ++profileGeneration;
    const previousPosition = card?.position.clone();
    activeCard?.dispose();
    activeCard = candidate; definition = next; card = candidate.mesh;
    if (previousPosition) card.position.copy(previousPosition);
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
    imports.set(id, imported); cards.unshift(imported.definition); ui?.refreshCards();
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
    flip: () => motion.requestFlip(), reset: resetCard,
    card: id => { void setCard(id).catch(showError); }, profile: id => { void setProfile(id).catch(showError); }, light: preset => lighting.setPreset(preset),
    importCard: () => { void openImport().catch(showError); }, removeCard: id => { void removeImportedCard(id).catch(showError); },
    pack: () => { void browsePacks().catch(showError); },
  }, new URLSearchParams(location.search).has('lab'));
  ui.selectCard(definition.id); ui.selectProfile(activeProfile);
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
      if (resetPositionElapsed >= 0) {
        resetPositionElapsed = Math.min(0.65, resetPositionElapsed + Math.max(0, Math.min(dt, 0.05)));
        card.position.copy(resetPositionStart).multiplyScalar(1 - smootherstep(resetPositionElapsed / 0.65));
        if (resetPositionElapsed === 0.65) resetPositionElapsed = -1;
      }
      camera.position.z = framingDistance(definition.dimensions, motion.orientation, camera.aspect, camera.fov, container.clientHeight) * motion.zoom;
      camera.position.y = -0.06;
    }
    pipeline.render();
    if (startupTiming.firstCardVisible === undefined) {
      startupMark('firstCardVisible');
      requestAnimationFrame(() => { startupMark('firstCardInteractive'); scheduleWarmup(); });
    }
    if (pack && packMetrics.clickAt !== undefined) {
      packMetrics.firstVisibleMs ??= performance.now() - packMetrics.clickAt;
      if (pack.state.value === 'PackReady') packMetrics.clickToReadyMs ??= performance.now() - packMetrics.clickAt;
    }
    if (frameTimes.length >= 240) frameTimes.shift(); frameTimes.push(dt * 1000);
  });
  // Development control surface also powers repeatable visual captures. No tuning UI in presentation.
  const debug = {
    ready: true, renderer, scene, camera, lighting, motion, factory, cpuPreparation, startupTiming, startupPipelines,
    pack: {
      open: openPack, browse: browsePacks, close: closePack, reset: () => browsePacks(), setSeed: (seed: number) => { cancelWarmup(); packSeed = seed >>> 0; },
      setStage: (stage: DebugPackStage, progress = 0) => pack?.setStage(stage, progress),
      skipToHit: () => pack?.setStage('hit', 0), summary: () => pack?.setStage('summary'),
      select: (index: number) => pack?.select(index), advance: () => pack?.advance(),
      setRevealProgress: (progress: number) => pack?.setRevealProgress(progress),
      pose: (yaw: number, pitch = 0, roll = 0) => pack?.pose(yaw, pitch, roll),
      tick: (seconds = 2) => { for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) pack?.update(1 / 60); },
      stats: () => pack?.stats() ?? { state: packRequest ? 'Loading' : 'Closed' },
      audio: {
        unlock: () => pack?.audio.unlock(),
        playCrinkle: (intensity = .5) => pack?.audio.playCrinkle(intensity),
        playTension: (intensity = .5) => pack?.audio.playTension(intensity),
        playTearStart: () => pack?.audio.playTearStart(),
        playTearFinish: () => pack?.audio.playTearFinish(),
        playStripRelease: () => pack?.audio.playStripRelease(),
        playExtract: (intensity = .6) => pack?.audio.playExtract(intensity),
        playCardSlide: (intensity = .55) => pack?.audio.playCardSlide(intensity),
        playCardSettle: (intensity = .45) => pack?.audio.playCardSettle(intensity),
        setGain: (group: 'master' | 'wrapper' | 'tear' | 'cards', value: number) => pack?.audio.setGain(group, value),
        stats: () => pack?.audio.stats() ?? { contextState: 'closed', prepared: false, muted: false, activeSources: 0, playCounts: {} },
      },
    },
    material: () => card.material[0] as HolographicMaterial,
    pose: (yaw: number, pitch: number, roll = 0) => motion.setPose(yaw * Math.PI / 180, pitch * Math.PI / 180, roll * Math.PI / 180),
    flip: () => motion.requestFlip(), reset: resetCard,
    zoom: (value: number) => { motion.zoom = value; motion.targetZoom = value; },
    setCard, setProfile, setMode, profiles, cards,
    stats: () => ({ backend: renderer.backend.constructor.name, card: definition.id, profile: activeProfile, mode: motion.mode, frameMs: frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length, frames: frameTimes.length, triangles: renderer.info.render.triangles, quaternion: motion.orientation.toArray(), zoom: motion.zoom, factory: factory.stats(), cpuPreparation: cpuPreparation.stats(), preparedPack: preparedPack ? { seed: preparedPack.seed, cardIds: [...preparedPack.cards.keys()] } : undefined, packMetrics }),
    hideUI: () => { document.querySelector<HTMLElement>('#ui')!.style.display = 'none'; },
  };
  Object.assign(window, { __holo: debug });
  // Do not queue every franchise profile at startup: pack loading and user card changes
  // must get exclusive access to the pattern worker. Profiles are prepared on demand.
  let lab: { dispose: () => void } | undefined;
  if (new URLSearchParams(location.search).has('lab')) {
    const { createHoloLab } = await import('./lab/HoloLab');
    const designer = createHoloLab({ material: () => card.material[0] as HolographicMaterial, definition: () => definition, cards, profiles, factory, lighting, motion, scene, setCard, importCard: openImport });
    lab = designer; Object.assign(debug, { lab: designer });
  }
  if (import.meta.hot) import.meta.hot.dispose(() => {
    disposed = true;
    packBrowser?.dispose(); cancelWarmup(); packRequest?.abort(); pack?.dispose(); cancelPackLoad.remove();
    ++loadGeneration; ++profileGeneration;
    renderer.setAnimationLoop(null); pointer.dispose(); observer.disconnect(); lab?.dispose();
    cpuPreparation.dispose(); factory.dispose(); lighting.dispose(); pipeline.dispose(); renderer.dispose(); ui?.dispose(); importDialog?.dispose();
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
