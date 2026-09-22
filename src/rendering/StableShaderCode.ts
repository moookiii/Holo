interface Code { code: string; }
/** r186's cached TSL helpers (LTC and MaterialX noise) arrive in different
 * declaration orders on first/subsequent builds. Three keys programs by source,
 * so this caused duplicate Firefox links for identical front/back wrappers.
 * Canonicalize consecutive function declarations only, in dependency order.
 * Function bodies stay byte-for-byte unchanged. Non-function code is a barrier;
 * overloads, macros and cycles conservatively retain their original order. */
export function stabilizeShaderCodeOrder(codes: Code[] | undefined) {
  if (!codes) return;
  const declaration = (entry: Code) => {
    const code = entry.code.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    if (code.includes('#')) return;
    const match = /^\s*(?:void|bool|int|uint|float|[biu]?vec[234]|mat[234](?:x[234])?)\s+(\w+)\s*\([^)]*\)\s*\{/.exec(code);
    if (!match) return;
    let depth = 1, end = match[0].length;
    for (; end < code.length && depth; end++) { if (code[end] === '{') depth++; if (code[end] === '}') depth--; }
    if (depth || code.slice(end).trim()) return;
    return { entry, name: match[1], body: code.slice(match[0].length, end - 1) };
  };
  let start = 0;
  while (start < codes.length) {
    const run: NonNullable<ReturnType<typeof declaration>>[] = [];
    let end = start;
    for (; end < codes.length; end++) { const item = declaration(codes[end]); if (!item) break; run.push(item); }
    if (run.length > 1 && new Set(run.map(item => item.name)).size === run.length) {
      const remaining = [...run].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
      const sorted: Code[] = [];
      while (remaining.length) {
        const index = remaining.findIndex(item => !remaining.some(dependency => dependency !== item && new RegExp(`\\b${dependency.name}\\s*\\(`).test(item.body)));
        if (index < 0) break;
        sorted.push(remaining.splice(index, 1)[0].entry);
      }
      if (!remaining.length) codes.splice(start, run.length, ...sorted);
    }
    start = end + 1;
  }
}
