import { gsap, ScrollTrigger } from '../core/gsap.js';

const SHIMMER_DURATION = 1.4;

export function initNavProgress() {
  const track = document.querySelector('.nav-p-bar');
  const bar = document.querySelector('.nav-progress-bar');
  if (!track || !bar) return;

  const fill = document.createElement('div');
  fill.className = 'nav-progress-fill';
  bar.appendChild(fill);

  gsap.set(fill, { xPercent: -100, backgroundPositionX: '0px' });

  const scrollTrigger = {
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    invalidateOnRefresh: true,
  };

  gsap.to(fill, { xPercent: 0, ease: 'none', scrollTrigger });

  // Continuous shimmer, independent of scroll. background-position as a
  // percentage is a no-op here — with background-size:100% the image is
  // exactly the container's size, so (container - image) is always 0 and
  // every percentage resolves to the same 0px offset. Panning in actual
  // pixels, by exactly one tile-width, is what makes it move — and since the
  // tile fades to transparent on both ends and repeats (repeat-x), jumping
  // back to 0px each cycle (repeat, no yoyo) is seamless.
  gsap.to(fill, {
    backgroundPositionX: () => `${fill.offsetWidth}px`,
    duration: SHIMMER_DURATION,
    ease: 'none',
    repeat: -1,
  });
}
