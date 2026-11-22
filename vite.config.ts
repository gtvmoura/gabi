import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-180.png'],
      manifest: {
        name: 'Atlas da Gabi',
        short_name: 'Atlas da Gabi',
        description: 'Atlas 3D de anatomia para Fisioterapia',
        lang: 'pt-BR',
        display: 'standalone',
        orientation: 'any',
        background_color: '#10121a',
        theme_color: '#10121a',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}', 'data/manifest.json'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          // modelos 3D e textos de apoio: ficam guardados depois do primeiro uso (funciona offline)
          { urlPattern: /\/models\/.*\.glb$/, handler: 'CacheFirst', options: { cacheName: 'modelos-3d', expiration: { maxEntries: 30 }, cacheableResponse: { statuses: [0, 200] } } },
          { urlPattern: /\/data\/.*\.json$/, handler: 'StaleWhileRevalidate', options: { cacheName: 'dados' } },
        ],
      },
    }),
  ],
  build: { target: ['es2020', 'safari14'], chunkSizeWarningLimit: 4000 },
  server: { host: true, port: 5173 },
});
