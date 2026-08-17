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
  // Default (position: fixed) pinning. 'transform' pinning was worse: it holds
  // the element by translating it against the scroll, and under Lenis that
  // translate trails the scroll by a frame, which is the gap — the section
  // literally sits 606px too high for a moment.
  //
  // Fixed pinning freezes the measured size onto the element as inline
  // width/height/max-*, so the section's height must not depend on the URL bar
  // or the frozen box stops matching the screen. That is why .section_cta is
  // 100lvh at medium (largest viewport) rather than 100vh: lvh never changes,
  // and being sized to the bar-hidden state means the section is never shorter
  // than what is on screen. ignoreMobileResize stops the bar sliding from
  // triggering a refresh mid-pin.
  if (isMedium) {
    ScrollTrigger.config({ ignoreMobileResize: true });

    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: PIN_LENGTH,
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    });

    window.addEventListener('load', () => ScrollTrigger.refresh());
    return;
  }

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
