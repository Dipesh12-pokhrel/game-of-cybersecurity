import { defineConfig } from 'vite';

/**
 * Vite configuration for Cyber Defence: Himalayan Data Vault.
 *
 * A-Frame itself is loaded from a CDN <script> tag in index.html (see README
 * for the fully-offline alternative), so the bundle here stays tiny and the
 * dev server starts instantly.
 */
export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 5173,
    open: true,
    host: true // allows testing from a phone on the same Wi-Fi network
  },
  build: {
    outDir: 'dist',
    target: 'es2019',
    sourcemap: true
  }
});
