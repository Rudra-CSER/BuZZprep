// Bundles the server (and the shared workspace package) into dist/ with esbuild.
// npm dependencies stay external and are installed in the production image.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const external = Object.keys(pkg.dependencies ?? {}).filter((d) => !d.startsWith('@buzzprep/'));

await build({
  entryPoints: {
    index: 'src/index.ts',
    'import-config': 'scripts/import-config.ts',
    'generate-vapid': 'scripts/generate-vapid.ts',
    'reset-password': 'scripts/reset-password.ts',
    'reset-link': 'scripts/reset-link.ts',
  },
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  external: [...external, 'pino-pretty'],
  logLevel: 'info',
});
