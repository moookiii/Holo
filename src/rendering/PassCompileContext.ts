/** Three r186 compileAsync captures call depth 0, but a beauty pass is rendered
 * inside RenderPipeline's fullscreen draw at depth 1. Context identity is part
 * of its node-builder key, so compiling at depth 0 discards the prepared graph
 * on first presentation. Scope this adapter to synchronous traversal only;
 * async node building and ordinary renders keep the original context lookup. */
export function capturePassContext<T, R>(contexts: { get: (target: T, mrt?: unknown, depth?: number) => R }, target: T, compile: () => Promise<void>) {
  const get = contexts.get;
  contexts.get = function(candidate, mrt, depth) {
    return get.call(this, candidate, mrt, candidate === target && depth === undefined ? 1 : depth);
  };
  try { return compile(); }
  finally { contexts.get = get; }
}
