/** Navigation-relative milestones; durations describe CPU/wall time, not GPU time. */
export const startupTiming: Record<string, number> = { navigationStart: 0 };
export const startupPipelines: { material: string; started: number; elapsed: number; async: boolean; vertex?: string; fragment?: string }[] = [];
export function startupMark(name: string) {
  if (startupTiming.firstCardInteractive !== undefined) return;
  startupTiming[name] = performance.now();
  performance.mark(`holo:startup:${name}`);
}
