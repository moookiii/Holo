import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';

// Copy only source/test files from a known commit. The huge authored asset tree
// and node_modules are shared read-only through junctions, never copied/edited.
const ref = process.argv[2];
if (!ref) throw new Error('Supply the exact baseline commit');
const root = resolve('artifacts/gallery-baseline-source'); mkdirSync(root, { recursive: true });
const archive = resolve('artifacts/gallery-baseline-source.tar');
writeFileSync(archive, execFileSync('git', ['archive', ref, 'src', 'tests', 'vite.config.ts', 'package.json', 'tsconfig.json', 'index.html'], { maxBuffer: 64 * 1024 * 1024 }));
execFileSync('tar', ['-xf', archive, '-C', root]);
for (const name of ['node_modules', 'public']) if (!existsSync(resolve(root, name))) symlinkSync(resolve(name), resolve(root, name), 'junction');
// Unblock the two pre-existing native Node resolution errors for an honest
// baseline assertion comparison; no runtime/card data changes.
const definition = resolve(root, 'src/card/CardDefinition.ts');
writeFileSync(definition, readFileSync(definition, 'utf8').replace("from '../materials/profiles/tcglEtchedFinish'", "from '../materials/profiles/tcglEtchedFinish.ts'")
  .replace("export { DEFAULT_FOIL_LAYOUT, type CardLayout } from './CardLayout'", "export { DEFAULT_FOIL_LAYOUT, type CardLayout } from './CardLayout.ts'"));
console.log(root);
