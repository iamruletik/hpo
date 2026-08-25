import { gsap } from '../core/gsap.js';

export function initHeroVideoParallax() {
  const sectionHero = document.querySelector('.section_hero');
  const videoWrapper = document.querySelector('.hero-video-wrapper');
  // Scoped to the wrapper on purpose. Two elements carry .hero-video-embed —
  // this one and the `.is-aim` embed in .aim_video-wrapper — and the hero copy
  // is set to visibility:false in Webflow, so it is absent from the rendered
  // page. A document-wide query therefore matched the aim embed instead and
  // parallaxed it against the wrong wrapper, leaving it at translateY(-16px).
  const videoEmbed = videoWrapper?.querySelector('.hero-video-embed');

  if (!sectionHero || !videoWrapper || !videoEmbed) return;

  // Mobile-only extra motion, additive to hero-text-split.js's
  // top/left/width/height grow animation (which still runs at every width):
  // a static scale-up (set once, not animated) plus the Y-scroll-parallax
  // below, giving the small pre-grow box some movement of its own.
  const isMobile = window.innerWidth <= 991;
  // Bumped up from 1.2 — that left a gap before section_offers once the
  // video finished translating up toward the end of the scroll range, the
  // scaled buffer wasn't tall enough to still cover the wrapper's bottom
  // edge by then. More headroom here.
  const scale = isMobile ? 1.5 : 1;

  if (isMobile) {
    // transform-origin top-anchored: scaling grows the box downward only,
    // so the top edge stays exactly where it was (no separate Y correction
    // needed to keep it flush) and the extra height hangs off the bottom as
    // buffer for the parallax below to reveal.
    gsap.set(videoEmbed, { scale, transformOrigin: '50% 0%' });
  }

  gsap.to(videoEmbed, {
    // Function form so the value recomputes on resize. Multiplied by scale
    // so the parallax range accounts for the extra buffer the scale-up adds
    // (a no-op on desktop, where scale is 1).
    y: () => -(videoEmbed.offsetHeight * scale - videoWrapper.offsetHeight),
    ease: 'none',
    scrollTrigger: {
      trigger: sectionHero,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
}
