/** Navigation-relative milestones. Submitted/presented frame markers describe
 * scheduling; browser captures independently verify the actual rendered artwork. */
export const startupTiming: Record<string, number> = { navigationStart: 0 };
export const startupPipelines: { material: string; started: number; elapsed: number; async: boolean; vertex?: string; fragment?: string }[] = [];
export function startupMark(name: string) {
  if (startupTiming[name] !== undefined) return;
  startupTiming[name] = performance.now();
  performance.mark(`holo:startup:${name}`);
}

/** Capture viewer startup, then resume for the first gallery opening. */
export function captureStartupPipelines() {
  return startupTiming.galleryUIAvailable !== undefined
    ? startupTiming.galleryAllVisiblePresented === undefined
    : startupTiming.firstCardInteractive === undefined;
}

export function startupFrameReadiness(gallery: { visible: number; visibleExpected: number; visibleFailed: number } | undefined,
  viewerVisible: boolean) {
  return { firstCardDrawn: gallery ? gallery.visible > 0 : viewerVisible,
    galleryAllVisibleDrawn: !!gallery && gallery.visibleExpected > 0 && gallery.visible === gallery.visibleExpected
      && gallery.visibleFailed === 0 };
}
