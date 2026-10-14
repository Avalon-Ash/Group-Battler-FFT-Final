import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: {
    outDir: '../preview_dist',
    emptyOutDir: true,
    rollupOptions: { input: 'tools/material-preview.html' },
  },
});
