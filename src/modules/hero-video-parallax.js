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

  gsap.to(videoEmbed, {
    // Function form so the value recomputes on resize.
    y: () => -(videoEmbed.offsetHeight - videoWrapper.offsetHeight),
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
