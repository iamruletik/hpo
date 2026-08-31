import { gsap, ScrollTrigger } from '../core/gsap.js';

// The white plane the hero video is seen through. Replaces the grow tween that
// used to live in hero-text-split.js, which animated width/height/top/left/
// border-radius on .hero-video-wrapper — real layout properties, on a
// position:sticky element, wrapping a playing video. That resized and re-clipped
// the video's compositing layer every frame.
//
// Here the video never moves. This element is the HOLE; the box-shadow paints
// the plane around it. Growing the hole is a transform on a sibling, and the
// video underneath stays a static full-viewport layer.
//
// box-shadow rather than outline: outline only began following border-radius in
// Safari ~16.4 (WebKit bug 20807), and older iOS draws it square — white
// right-angle wedges over the rounded corners. box-shadow has always followed
// the radius.
const CONTAINER = '.hero-video-container';

const APERTURE = {
  // Width of the white plane around the hole at rest, in px. Matches the 8px
  // the old .hero-video-wrapper left via calc(100vw - 16px).
  inset: 8,
  radius: '2.5rem',
  duration: 1.1,
  ease: 'power3.inOut',
  // Same trigger the old grow tween used: 100px of scroll, reversible.
  start: 'top+=100 top',
};

// Horizontal scale only. The side insets come from squeezing the box; the top
// inset is a y offset, and the bottom edge is parked off screen by the CSS so
// it never needs a value at all.
//
// At an 8px inset this lands around 0.99, where the fact that scaling also
// squashes border-radius into an ellipse is invisible. If the inset ever grows
// to a real fraction of the viewport that distortion becomes visible, and this
// wants the 9-slice build instead.
const startScaleX = () => (window.innerWidth - APERTURE.inset * 2) / window.innerWidth;

export function initHeroAperture() {
  const container = document.querySelector(CONTAINER);
  if (!container) return;

  const aperture = document.createElement('div');
  aperture.className = 'hero-aperture';
  aperture.setAttribute('aria-hidden', 'true');

  // Appended to body, not into .hero-video-container — it has to sit between
  // .progressive-blur-wrapper (z-index 9, first child of body) and .header
  // (z-index 10), and z-index only compares within one stacking context.
  // Nested inside the hero it could never be ordered against either. Last child
  // of body means the 9/9 tie against the blur resolves this way on DOM order.
  //
  // .hero-video-container is still the guard above: no hero, no aperture. Being
  // a body child rather than the video's sibling costs nothing here, since
  // nothing between body and the video carries a transform — that is the same
  // condition the video's own position:fixed already depends on.
  document.body.append(aperture);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(aperture, { y: 0, scaleX: 1, borderRadius: 0 });
    return;
  }

  const tween = gsap.fromTo(
    aperture,
    {
      y: APERTURE.inset,
      scaleX: startScaleX,
      borderRadius: APERTURE.radius,
    },
    {
      y: 0,
      scaleX: 1,
      borderRadius: '0rem',
      duration: APERTURE.duration,
      ease: APERTURE.ease,
      scrollTrigger: {
        trigger: 'body',
        start: APERTURE.start,
        toggleActions: 'play none none reverse',
        // Deliberately NOT invalidateOnRefresh. ScrollTrigger refreshes on
        // every resize, a URL bar collapsing fires resize, and re-reading the
        // from-values mid-tween is what made the animation snap back to its
        // start the moment a finger left the screen.
        invalidateOnRefresh: false,
      },
    }
  );

  // The only from-value that can genuinely go stale is scaleX, and it depends
  // on width alone — which a collapsing URL bar does not change. Guarding on
  // width means orientation changes and desktop resizes still recompute, while
  // the bar's height-only resize storm is ignored.
  let width = window.innerWidth;

  window.addEventListener('resize', () => {
    if (window.innerWidth === width) return;
    width = window.innerWidth;
    tween.invalidate();
    tween.scrollTrigger?.refresh();
  });
}
