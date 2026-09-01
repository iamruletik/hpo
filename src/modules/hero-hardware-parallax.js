import { gsap } from '../core/gsap.js';

// Scroll drift for the hardware block, layered so the badges separate slightly
// from the image behind them. Deliberately small — this is depth, not travel.
//
// Two things keep it from fighting the reveals in hero-text-split.js:
//
//   yPercent vs y. The badge reveal animates yPercent and the media reveal
//   animates yPercent on .hero_mwrapper. gsap keeps y and yPercent as separate
//   channels of one transform, so writing y here composes with those rather
//   than overwriting them.
//
//   The media layer targets .hero_hardware-media, the CHILD of the .hero_mwrapper
//   that the reveal moves. Same reason, belt and braces: the two never touch the
//   same element.
const SECTION = '.hero_hardware';

const LAYERS = [
  ['.hero_hardware-media', -40],
  ['.hero_hardware-badge.is-first', -84],
  ['.hero_hardware-badge.is-second', -112],
];

export function initHeroHardwareParallax() {
  const section = document.querySelector(SECTION);
  if (!section) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  LAYERS.forEach(([selector, distance]) => {
    const element = document.querySelector(selector);
    if (!element) return;

    gsap.to(element, {
      y: distance,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        // Starts where the reveals have effectively landed rather than at the
        // section's first pixel: the badges fire at 'top-=150 center' and the
        // media at 'top-=50 center', both one-second tweens, so beginning the
        // scrub at 'top center' means the drift picks up after they arrive
        // instead of dragging them in.
        start: 'top center',
        end: 'bottom top',
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
  });
}
