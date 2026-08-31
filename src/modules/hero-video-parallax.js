import { gsap } from '../core/gsap.js';

// The video is position:fixed and taller than the viewport, so the overflow
// hanging off the bottom is the parallax budget: scrub Y from 0 to
// (viewport - video height), a negative number, and the frame travels up by
// exactly the amount that was hidden — no more, so the bottom edge lands flush
// instead of pulling a gap in behind it.
//
// Measured rather than hardcoded because the height comes from Webflow and
// changes per breakpoint. offsetHeight, not getBoundingClientRect(), because
// we are writing a transform to this same element and rect would fold our own
// scale/translate back into the next measurement.
const HERO_VIDEO = '.hero-picture';
const HERO_SECTION = '.section_hero';

function parallaxDistance(video) {
  return window.innerHeight - video.offsetHeight;
}

export function initHeroVideoParallax() {
  const sectionHero = document.querySelector(HERO_SECTION);
  const video = document.querySelector(HERO_VIDEO);

  if (!sectionHero || !video) return;

  // Nothing hangs off the bottom, nothing to travel. Guards the common case
  // where the Designer has the video at exactly 100% height — distance would
  // be 0, or positive if it is shorter, and a positive y would drag the top
  // edge down and expose the page behind it.
  if (parallaxDistance(video) >= 0) return;

  gsap.to(video, {
    // Function form so the distance recomputes on resize/refresh rather than
    // baking in whatever the viewport happened to be at init — on mobile the
    // URL bar collapsing changes innerHeight mid-scroll.
    y: () => parallaxDistance(video),
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
