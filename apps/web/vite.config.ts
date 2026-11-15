import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const API_TARGET = process.env.VITE_API_PROXY ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Custom service worker: Web Push, notification clicks and deep links need our own code.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'theme-init.js', 'icons/*.png'],
      manifest: {
        id: '/',
        name: 'buZZprep',
        short_name: 'buZZprep',
        description:
          'Interview preparation planner: daily schedule, reminders, DSA and system design tracking, journal and habits.',
        start_url: '/?source=pwa',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f6f6f8',
        theme_color: '#161828',
        categories: ['productivity', 'education'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Today’s schedule',
            url: '/schedule',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Journal',
            url: '/journal',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: { enabled: true, type: 'module', navigateFallback: 'index.html' },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: { '/api': { target: API_TARGET, changeOrigin: false } },
  },
  preview: {
    port: 4173,
    proxy: { '/api': { target: API_TARGET, changeOrigin: false } },
  },
  build: { sourcemap: true, target: 'es2022' },
});
