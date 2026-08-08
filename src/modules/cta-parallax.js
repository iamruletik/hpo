import { gsap, ScrollTrigger } from '../core/gsap.js';

// Slight Ken-Burns-style zoom layered on top of the vertical slide. Scaling
// up (never down) from a state that already fully covers the container can
// only keep covering it, so this can't reintroduce the gap bug above.
const END_SCALE = 1.08;

export function initCtaParallax() {
  const section = document.querySelector('.section_cta');
  const backgroundImage = document.querySelector('.cta-image-bg');
  if (!section || !backgroundImage) return;

  // Image is taller than the viewport so it can slide without ever exposing
  // a gap — it must stay within [-excess, 0]: at y=0 the top edge is flush
  // with the container and the excess overflows below; at y=-excess the
  // bottom edge is flush and the excess overflows above. Either way the
  // container is always fully covered. (Original animated from +excess,
  // which shifts the image *down* and exposes exactly `excess` px of gap
  // at the top until the scroll catches up — a real bug, not a porting error.)
  gsap.fromTo(
    backgroundImage,
    {
      y: () => -Math.max(0, backgroundImage.getBoundingClientRect().height - window.innerHeight),
      scale: 1,
    },
    {
      y: 0,
      scale: END_SCALE,
      ease: 'none',
      scrollTrigger: { trigger: section, start: 'top center', end: 'bottom center', scrub: true, invalidateOnRefresh: true },
    }
  );

  window.addEventListener('load', () => ScrollTrigger.refresh());
}
