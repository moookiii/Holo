/** Eliminate generated copies of immutable, identically typed temporaries.
 * Bindings, expressions and their evaluation order are untouched. This pass
 * only operates on Three's nodeVar variables in main, never helper functions. */
export function eliminateShaderAliases(code: string) {
  const analyzed = code.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, comment => comment.replace(/[^\n]/g, ' '));
  const main = /void\s+main\s*\(\s*\)\s*\{/.exec(analyzed);
  if (!main || /\binout\b|\bout\s+(?:(?:lowp|mediump|highp)\s+)?\w+\s+\w+\s*(?:\[[^\]]*\])?\s*[,)]/.test(analyzed)) return code;
  const prefix = code.slice(0, main.index), body = code.slice(main.index), mainCode = analyzed.slice(main.index);
  // A lexical write in a runtime loop can execute repeatedly. Those programs
  // need a control-flow analysis, so conservatively leave them unchanged.
  if (/\b(?:for|while|do)\b/.test(mainCode)) return code;
  const types = new Map<string, string>();
  let depth = 0;
  for (const line of analyzed.slice(0, main.index).split('\n')) {
    const match = /^\s*(float|int|uint|bool|[biu]?vec[234]|mat[234])\s+(nodeVar\d+);\s*$/.exec(line);
    if (depth === 0 && match) types.set(match[2], match[1]);
    for (const c of line.replace(/\/\/.*$/, '')) { if (c === '{') depth++; else if (c === '}') depth--; }
  }
  const writes = new Map<string, { count: number; at: number }>();
  for (const match of mainCode.matchAll(/\b(nodeVar\d+)(?:\.[xyzwrgba]+|\[[^\]]+\])*\s*(?:(?:<<|>>|[+*/%&|^-])?=(?!=)|\+\+|--)/g)) {
    const previous = writes.get(match[1]);
    writes.set(match[1], { count: (previous?.count ?? 0) + 1, at: previous?.at ?? match.index! });
  }
  for (const match of mainCode.matchAll(/(?:\+\+|--)\s*(nodeVar\d+)\b/g)) {
    const previous = writes.get(match[1]);
    writes.set(match[1], { count: (previous?.count ?? 0) + 1, at: previous?.at ?? match.index! });
  }
  const aliases = new Map<string, string>(), removed = new Set<number>();
  for (const match of mainCode.matchAll(/^[ \t]*(nodeVar\d+) = (nodeVar\d+);[ \t]*$/gm)) {
    const [target, source] = [match[1], match[2]], write = writes.get(source);
    if (target === source || !types.has(target) || types.get(target) !== types.get(source)
      || writes.get(target)?.count !== 1 || write?.count !== 1 || write.at >= match.index!) continue;
    // A copy read before its assignment cannot be replaced by its source.
    if (new RegExp(`\\b${target}\\b`).test(mainCode.slice(0, match.index))) continue;
    aliases.set(target, aliases.get(source) ?? source); removed.add(match.index!);
  }
  if (!aliases.size) return code;
  const withoutCopies = body.replace(/^[ \t]*(nodeVar\d+) = (nodeVar\d+);[ \t]*$/gm,
    (line, _target, _source, offset) => removed.has(offset) ? '' : line);
  return prefix + withoutCopies.replace(/\bnodeVar\d+\b/g, name => aliases.get(name) ?? name);
}
