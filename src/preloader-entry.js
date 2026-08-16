// Standalone entry so the preloader can start animating near first paint.
//
// Bundled into main.js it could not run until that whole bundle — plus the GSAP
// vendor chunk, from a different host — had downloaded and evaluated. In
// practice that was ~2.2s, so the preloader sat motionless for most of its own
// sequence and then animated while every other module initialised on top of it.
//
// preloader.js imports nothing, so this entry stays tiny and loads first.
// It still publishes the same contract main.js depends on:
//   window.preloaderFinished  — boolean flag
//   'preloader:complete'      — window event
import { initPreloader } from './modules/preloader.js';

initPreloader();
