// Match the project's TS test imports while resolving legacy extensionless paths.
import { register } from 'node:module';
register(`data:text/javascript,${encodeURIComponent(`
import { existsSync } from 'node:fs';
export function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && context.parentURL) {
    for (const suffix of ['.ts','/index.ts']) {
      const url = new URL(specifier + suffix, context.parentURL);
      if (existsSync(url)) return next(url.href, context);
    }
  }
  return next(specifier, context);
}`)}`, import.meta.url);
await import('../../tests/evolutions-holo.test.ts');
await import('../../tests/pokemon-base-set-2.test.ts');
await import('../../tests/base-set-holo.test.ts');
await import('../../tests/pokemon-patterns.test.ts');
await import('../../tests/xy-integration.test.ts');
