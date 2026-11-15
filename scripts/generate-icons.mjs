// Renders PWA / iOS icons from apps/web/assets/*.svg. Run: npm run icons
import { mkdir, readFile } from 'node:fs/promises';
import sharp from 'sharp';

const root = new URL('../apps/web/', import.meta.url);
const out = new URL('public/icons/', root);
await mkdir(out, { recursive: true });

const icon = await readFile(new URL('assets/icon.svg', root));
const badge = await readFile(new URL('assets/badge.svg', root));

async function png(svg, size, name, { padding = 0, background } = {}) {
  const inner = Math.round(size * (1 - padding * 2));
  let img = sharp(svg, { density: 384 }).resize(inner, inner);
  if (padding > 0) {
    const offset = Math.round((size - inner) / 2);
    img = sharp({ create: { width: size, height: size, channels: 4, background } }).composite([
      { input: await img.png().toBuffer(), left: offset, top: offset },
    ]);
  }
  await img.png({ compressionLevel: 9 }).toFile(new URL(name, out).pathname);
  console.log('wrote', name);
}

await png(icon, 192, 'icon-192.png');
await png(icon, 512, 'icon-512.png');
// Maskable: keep the mark inside the 80% safe zone on a full-bleed background.
await png(icon, 512, 'maskable-512.png', { padding: 0.1, background: '#4b45e3' });
// iOS rounds the corners itself; must be opaque.
await png(icon, 180, 'apple-touch-icon.png');
// Monochrome badge for Android's status bar.
await png(badge, 96, 'badge-96.png');
