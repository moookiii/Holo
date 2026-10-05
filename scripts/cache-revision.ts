import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import type { Plugin } from 'vite';

// Hash authored assets and preparation code at build/server time, never in the
// browser. Memoize unchanged files so a dev edit does not reread the asset tree.
const files = new Map<string, { stamp: string; hash: string }>();
export function cacheRevision() {
  const hash = createHash('sha256');
  for (const root of ['src', 'public']) {
    const names = readdirSync(root, { recursive: true, withFileTypes: true })
      .filter(entry => entry.isFile()).map(entry => resolve(entry.parentPath, entry.name)).sort();
    for (const path of names) {
      const stat = statSync(path), stamp = `${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
      let cached = files.get(path);
      if (cached?.stamp !== stamp) {
        cached = { stamp, hash: createHash('sha256').update(readFileSync(path)).digest('hex') };
        files.set(path, cached);
      }
      hash.update(path.slice(resolve('.').length).replaceAll('\\', '/')).update(cached.hash);
    }
  }
  return hash.digest('hex');
}

export function cacheRevisionPlugin(): Plugin {
  let dirty = true, revision = '';
  return { name: 'holo-cache-revision', configureServer(server) {
    revision = cacheRevision(); dirty = false;
    server.watcher.on('all', (_event, path) => {
      const absolute = resolve(path);
      if (['src', 'public'].some(root => absolute.startsWith(resolve(root) + sep))) {
        dirty = true;
        // A same-URL PNG edit must invalidate derived pixels as well as shaders.
        server.ws.send({ type: 'full-reload' });
      }
    });
    server.middlewares.use('/__holo-cache-revision', (_request, response) => {
      if (dirty) { revision = cacheRevision(); dirty = false; }
      response.setHeader('Content-Type', 'text/plain');
      response.setHeader('Cache-Control', 'no-store'); response.end(revision);
    });
  } };
}
