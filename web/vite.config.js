import { defineConfig } from 'vite';
export default defineConfig({ base: './', build: { outDir: 'dist', assetsInlineLimit: 0, chunkSizeWarningLimit: 4000, rollupOptions: { input: 'index.html' } } });
