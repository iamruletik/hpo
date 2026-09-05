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
const MOBILE_QUERY = '(max-width: 991px)';

// End values in px, not distances from a start: each element scrubs from y: 0
// to this across the whole trigger range. Negative moves up.
//
// Tuned per breakpoint rather than scaled by a single factor. The section is a
// good deal shorter on mobile, so the scrub covers the same travel over less
// scroll — the same numbers that read as drift on desktop read as the block
// sliding there.
const LAYERS = {
  desktop: [
    ['.hero_hardware-media', -50],
    ['.hero_hardware-badge.is-first', -44],
    ['.hero_hardware-badge.is-second', -60],
  ],
  mobile: [
    ['.hero_hardware-media', -16],
    ['.hero_hardware-badge.is-first', -14],
    ['.hero_hardware-badge.is-second', -20],
  ],
};

export function initHeroHardwareParallax() {
  const section = document.querySelector(SECTION);
  if (!section) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Read once at init. Crossing the breakpoint mid-session is a resize, and
  // ScrollTrigger re-measures on those anyway — but the distances would keep
  // the width they were built with until reload. Not worth rebuilding the
  // triggers for a case that only happens on a desktop window drag.
  const layers = window.matchMedia(MOBILE_QUERY).matches ? LAYERS.mobile : LAYERS.desktop;

  layers.forEach(([selector, distance]) => {
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
