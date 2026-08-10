import { gsap, ScrollTrigger } from '../core/gsap.js';

const SHIMMER_DURATION = 1.4;

export function initNavProgress() {
  const track = document.querySelector('.nav-p-bar');
  const bar = document.querySelector('.nav-progress-bar');
  if (!track || !bar) return;

  const fill = document.createElement('div');
  fill.className = 'nav-progress-fill';
  bar.appendChild(fill);

  // .nav_center needs overflow:visible for its own reasons, so a dedicated
  // child wrapper (inset 0 to match it, own overflow:hidden) clips the
  // glow to the nav pill's rounded shape instead — see the CSS comments on
  // .nav-progress-glow-mask / .nav-progress-glow for why it can't live
  // inside .nav-p-bar/.nav-progress-bar's own clipping.
  const glowParent = track.parentElement;

  const glowMask = document.createElement('div');
  glowMask.className = 'nav-progress-glow-mask';
  glowParent.insertBefore(glowMask, track);

  const glow = document.createElement('div');
  glow.className = 'nav-progress-glow';
  glowMask.appendChild(glow);

  const BLEED = 2;
  const parentRect = glowParent.getBoundingClientRect();
  const barRect = bar.getBoundingClientRect();
  glow.style.top = `${barRect.top - parentRect.top - BLEED}px`;
  glow.style.left = `${barRect.left - parentRect.left - BLEED}px`;
  glow.style.width = `${barRect.width + BLEED * 2}px`;
  glow.style.height = `${barRect.height + BLEED * 2}px`;

  gsap.set(fill, { xPercent: -100, backgroundPositionX: '0px' });
  gsap.set(glow, { scaleX: 0, backgroundPositionX: '0px' });

  const scrollTrigger = {
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    invalidateOnRefresh: true,
  };

  gsap.to(fill, { xPercent: 0, ease: 'none', scrollTrigger });
  gsap.to(glow, { scaleX: 1, ease: 'none', scrollTrigger });

  // Continuous shimmer, independent of scroll, shared by both layers.
  // background-position as a percentage is a no-op here — with
  // background-size:100% the image is exactly the container's size, so
  // (container - image) is always 0 and every percentage resolves to the
  // same 0px offset. Panning in actual pixels, by exactly one tile-width
  // (measured per-target since the glow is physically larger than the
  // fill), is what makes it move — and since the tile fades to transparent
  // on both ends and repeats (repeat-x), jumping back to 0px each cycle
  // (repeat, no yoyo) is seamless.
  gsap.to([fill, glow], {
    backgroundPositionX: (_, target) => `${target.offsetWidth}px`,
    duration: SHIMMER_DURATION,
    ease: 'none',
    repeat: -1,
  });
}
