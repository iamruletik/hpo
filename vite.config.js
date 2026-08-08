import { defineConfig } from 'vite';

// Deployed to GitHub Pages at https://iamruletik.github.io/hpo/
const BASE = '/hpo/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? BASE : '/',
  build: {
    outDir: 'dist',
    cssCodeSplit: false,
    target: 'es2020',
    rollupOptions: {
      input: {
        main: 'src/main.js',
        '3d': 'src/3d.js',
      },
      output: {
        format: 'es',
        // fixed, unhashed names so the Webflow embed URLs never change
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: 'main.css',
        manualChunks(id) {
          // Named distinctly from src/core/gsap.js, whose own chunk would
          // otherwise collide on the same default name.
          if (id.includes('node_modules/gsap')) return 'vendor-gsap';
        },
      },
    },
  },
  server: {
    port: 5173,
    cors: true,
  },
}));
