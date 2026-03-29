// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'SkillBarter – Time Credit Exchange',
        short_name: 'SkillBarter',
        description: 'Exchange skills using time credits instead of money',
        theme_color: '#6b0f1a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-72.png',   sizes: '72x72',   type: 'image/png' },
          { src: '/icons/icon-96.png',   sizes: '96x96',   type: 'image/png' },
          { src: '/icons/icon-128.png',  sizes: '128x128', type: 'image/png' },
          { src: '/icons/icon-144.png',  sizes: '144x144', type: 'image/png' },
          { src: '/icons/icon-152.png',  sizes: '152x152', type: 'image/png' },
          { src: '/icons/icon-192.png',  sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-384.png',  sizes: '384x384', type: 'image/png' },
          { src: '/icons/icon-512.png',  sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cache strategies
        runtimeCaching: [
          {
            // API responses – network first, fall back to cache
            urlPattern: /^https?:\/\/.*\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
          {
            // Static assets – cache first
            urlPattern: /\.(js|css|png|jpg|svg|woff2?)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
