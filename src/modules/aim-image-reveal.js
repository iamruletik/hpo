import { gsap } from '../core/gsap.js';

// Rises and fades in when it scrolls into view.
//
// Mobile only, because the element is display:none above 991px in Webflow and
// the desktop layout uses the morphing SVG instead. Guarded rather than left to
// run harmlessly: a tween on a display:none element still measures and writes to
// it every frame, and ScrollTrigger would build a trigger with a zero-height
// target whose start and end collapse onto the same scroll position.
const IMAGE = '.mobile-aim-image';
const MOBILE_QUERY = '(max-width: 991px)';

const REVEAL = {
  y: 48,
  duration: 0.9,
  ease: 'power3.out',
  // Far enough up the viewport that the move is over before the image is
  // centred, rather than still arriving when the user is already looking at it.
  start: 'top 85%',
};

export function initAimImageReveal() {
  if (!window.matchMedia(MOBILE_QUERY).matches) return;

  const image = document.querySelector(IMAGE);
  if (!image) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(image, { autoAlpha: 1, y: 0 });
    return;
  }

  // autoAlpha rather than opacity: it parks visibility:hidden alongside the
  // zero, so the image is not a hit target or a screen-reader stop while it is
  // invisible.
  gsap.fromTo(
    image,
    { autoAlpha: 0, y: REVEAL.y },
    {
      autoAlpha: 1,
      y: 0,
      duration: REVEAL.duration,
      ease: REVEAL.ease,
      force3D: true,
      scrollTrigger: {
        trigger: image,
        start: REVEAL.start,
        // Plays once. Nothing here should reverse — it is an entrance, and the
        // section above it is tall enough that a scroll back up would otherwise
        // replay it on every pass.
        toggleActions: 'play none none none',
        once: true,
      },
      onComplete: () => gsap.set(image, { clearProps: 'transform' }),
    }
  );

  // No ScrollTrigger.refresh() here. This module runs from the deferred queue,
  // i.e. after the curtains open, and a global refresh at that point recalculates
  // every trigger on the page while the user is looking at it — see the note in
  // main.js. The trigger measures itself on creation anyway, so a reload partway
  // down the page still resolves correctly without one.
}
