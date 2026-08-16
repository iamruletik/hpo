import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap.js';

let lenis;

export function initLenis() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

  lenis?.destroy();

  lenis = new Lenis({
    lerp: 0.085,
    smoothWheel: true,
    wheelMultiplier: 0.9,
    syncTouch: false,
    touchMultiplier: 1,
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    infinite: false,
    overscroll: true,
    autoResize: true,
    anchors: { offset: -80 },
    stopInertiaOnNavigate: true,
  });

  window.lenis = lenis;

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  requestAnimationFrame(() => {
    lenis.resize();
    ScrollTrigger.refresh();
  });

  window.addEventListener('load', () => {
    lenis.resize();

    // `load` waits for every image and video on the page, and the footer
    // sequence deliberately starts its 60 frames only after the preloader is
    // gone — so this now fires long after the curtains open. A global refresh
    // at that point recalculates every trigger while the user is looking at a
    // sticky section, which is exactly the jump. If the preloader has already
    // finished, the resize above is enough.
    if (!window.preloaderFinished) ScrollTrigger.refresh();
  });

  return lenis;
}

export function getLenis() {
  return lenis;
}
