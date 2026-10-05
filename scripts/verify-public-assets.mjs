import { open, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

// Vite copies public files verbatim. LFS pointers would otherwise produce a
// successful build containing text where browsers expect card images/maps.
const root = resolve(process.argv[2] ?? 'public');
const pointers = [];
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await inspect(path);
    else if (entry.isFile()) {
      const file = await open(path, 'r');
      try {
        const prefix = Buffer.alloc(128);
        const { bytesRead } = await file.read(prefix, 0, prefix.length, 0);
        if (prefix.subarray(0, bytesRead).toString('utf8').startsWith('version https://git-lfs.github.com/spec/v1')) pointers.push(path);
      } finally { await file.close(); }
    }
  }
}
await inspect(root);
if (pointers.length) {
  console.error(`Unresolved Git LFS assets (${pointers.length}). Download them before building:\n${pointers.join('\n')}`);
  process.exitCode = 1;
} else console.log('Public assets verified: no Git LFS pointers.');
