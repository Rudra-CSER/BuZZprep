import express, { type Express } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { logger } from './lib/logger';

/**
 * Serve the built PWA (production). Hashed assets are cached for a year; index.html, the
 * service worker and the manifest are revalidated on every load so updates reach devices.
 */
export function serveWebApp(app: Express, dir: string) {
  const root = path.resolve(dir);
  const indexHtml = path.join(root, 'index.html');
  if (!existsSync(indexHtml)) {
    logger.warn({ root }, 'WEB_DIST_DIR has no index.html — not serving the web app');
    return;
  }
  app.use(
    express.static(root, {
      index: false,
      setHeaders(res, filePath) {
        const name = path.basename(filePath);
        if (name === 'sw.js' || name === 'index.html' || name.endsWith('.webmanifest')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      },
    }),
  );
  // SPA fallback for client-side routes (deep links from notifications land here).
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    if (!req.accepts('html')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });
}
