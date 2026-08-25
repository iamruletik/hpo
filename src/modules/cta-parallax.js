import { gsap, ScrollTrigger } from '../core/gsap.js';

// Slight Ken-Burns-style zoom layered on top of the vertical slide. Scaling
// up (never down) from a state that already fully covers the container can
// only keep covering it, so this can't reintroduce the gap bug above.
const END_SCALE = 1.08;

// How much pinned scrolling the mobile section holds for before releasing.
// Exported because cta-reveal has to span the identical range to time itself
// against the pin; see the note there.
export const PIN_LENGTH = '+=70%';

export function initCtaParallax() {
  const section = document.querySelector('.section_cta');
  const backgroundImage = document.querySelector('.cta-image-bg');
  if (!section || !backgroundImage) return;

  const isMedium = window.matchMedia('(max-width: 991px)').matches;

  // Mobile: the image does not move at all. The section simply holds still
  // while you scroll, which is what buys the beat before the copy arrives.
  //
  // This used to be a GSAP ScrollTrigger pin (pin: true). Both pin types
  // fought Lenis: default (fixed) pinning snapped the section forward the
  // instant it engaged (fixed-position pin math resolving against a
  // different scroll reference than Lenis's smoothed one); pinType:
  // 'transform' traded that for the opposite bug, a visible gap from the
  // translate trailing scroll by a frame. Both are symptoms of the same
  // root cause — GSAP pin mechanics assume native scroll physics, Lenis
  // decouples visual scroll from it.
  //
  // Replaced with plain CSS position: sticky on .section_cta itself,
  // wrapped in .cta-sticky-wrapper (170lvh at this breakpoint — 100lvh for
  // the section plus 70lvh of hold room, the same distance PIN_LENGTH
  // described). No ScrollTrigger involved in creating the hold at all, so
  // there's nothing left to conflict with Lenis. cta-reveal.js still uses
  // PIN_LENGTH as a plain scroll-distance value for its own (non-pinning)
  // progress tracker, which was never the source of either bug.
  if (isMedium) return;

  // Image is taller than its container so it can slide without ever exposing
  // a gap — it must stay within [-excess, 0]: at y=0 the top edge is flush
  // with the container and the excess overflows below; at y=-excess the
  // bottom edge is flush and the excess overflows above. Either way the
  // container is always fully covered. (Original animated from +excess,
  // which shifts the image *down* and exposes exactly `excess` px of gap
  // at the top until the scroll catches up — a real bug, not a porting error.)
  //
  // offsetHeight, not getBoundingClientRect(): the rect includes the element's
  // own transform, so once the zoom has run a refresh reads the *scaled* height
  // and overstates the excess.
  const clip = backgroundImage.parentElement;
  const excess = () => Math.max(0, backgroundImage.offsetHeight - clip.clientHeight);

  gsap.fromTo(
    backgroundImage,
    {
      y: () => -excess(),
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
