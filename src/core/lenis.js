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
    ScrollTrigger.refresh();
  });

  return lenis;
}

export function getLenis() {
  return lenis;
}
