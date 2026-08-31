import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap.js';

let lenis;

export function initLenis() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

  lenis?.destroy();

  const preloaderActive = document.documentElement.classList.contains('preloader-active');

  // Lenis reads the native scroll position once, at construction, into
  // targetScroll/animatedScroll — so if anything nudged the page before this
  // ran, Lenis would adopt that as its own "home" position instead of 0 and
  // .stop() below would freeze it there rather than at the top. Force native
  // scroll to (0, 0) first so Lenis's initial read is already correct.
  if (preloaderActive) {
    window.scrollTo(0, 0);
  }

  lenis = new Lenis({
    lerp: 0.075,
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

  // preloader.js blocks native scroll by swallowing wheel/touchmove, but that
  // only calls preventDefault() — it doesn't stop Lenis's own wheel listener,
  // which is registered independently (later, since this module initialises
  // after preloader-entry.js) and drives scroll itself regardless of another
  // listener's preventDefault. Without this, the page could still smooth-
  // scroll under the curtain. preloader.js flips 'preloader-active' on
  // <html> synchronously before this runs, so the check is reliable; it
  // calls lenis.start() again once the curtain lifts.
  if (preloaderActive) {
    lenis.stop();
  }

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
