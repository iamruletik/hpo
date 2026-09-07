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
        // Separate entry so it can be loaded ahead of main.js — see the file.
        preloader: 'src/preloader-entry.js',
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
  // Serving the built output instead of the dev server. No HMR client, no
  // WebSocket back to this machine, and main.css is a real file the browser can
  // fetch in parallel rather than something main.js has to arrive and inject.
  //
  // Same port as the dev server on purpose: the cloudflared tunnel points at
  // 5173, so switching between `npm run dev` and `npm run serve` needs no tunnel
  // change. Only ever run one of them.
  preview: {
    port: 5173,
    cors: true,
    allowedHosts: ['tunnel.ruletik.org', 'mactun.ruletik.org'],
  },

  server: {
    port: 5173,
    cors: true,
    // No HMR client. The page is served by Webflow and only the modules come
    // from here, so Vite's client rides in via the CSS module and opens a
    // WebSocket back to this machine — across a tunnel, to a laptop. Every time
    // that socket drops (sleep, wifi handoff, an idle connection recycled) the
    // client logs "server connection lost. Polling for restart..." and calls
    // location.reload() on reconnect. That is the site reloading itself with
    // nobody touching a file.
    //
    // Modules still serve live; changes need a manual refresh. Worth it when the
    // page under test is on a phone and a surprise reload loses your scroll
    // position mid-check.
    hmr: false,
    // Vite rejects any request whose Host header is not listed here, so every
    // tunnel hostname that fronts this server needs an entry. One per machine
    // rather than one shared name: a Cloudflare named tunnel can only own a
    // hostname from one connector at a time, so sharing it meant whichever
    // machine reconnected last silently took over and the site started serving
    // that checkout.
    allowedHosts: ['tunnel.ruletik.org', 'mactun.ruletik.org'],
  },
}));
