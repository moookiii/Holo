/** Development-only wall-clock diagnostics. GPU readiness includes queue wait;
 * it is deliberately not labelled GPU execution time. */
export const openingStages: { stage: string; ms: number; at: number }[] = [];
export const openingEvents: { id: string; at: number; marks: Record<string, number> }[] = [];
export function openingStage(stage: string, start: number) {
  if (!import.meta.env.DEV) return;
  openingStages.push({ stage, ms: performance.now() - start, at: start });
  if (openingStages.length > 300) openingStages.shift();
}
export function beginOpening(id: string) {
  if (!import.meta.env.DEV) return undefined;
  const event = { id, at: performance.now(), marks: {} as Record<string, number> };
  openingEvents.push(event); if (openingEvents.length > 30) openingEvents.shift(); return event;
}
export function markOpening(event: ReturnType<typeof beginOpening>, mark: string) {
  if (event) event.marks[mark] ??= performance.now() - event.at;
}
