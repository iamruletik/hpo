import { gsap } from '../core/gsap.js';

export function initHeroVideoParallax() {
  const sectionHero = document.querySelector('.section_hero');
  const videoWrapper = document.querySelector('.hero-video-wrapper');
  const videoEmbed = document.querySelector('.hero-video-embed');

  if (!sectionHero || !videoWrapper || !videoEmbed) return;

  gsap.to(videoEmbed, {
    // Function form so the value recomputes on resize.
    y: () => -(videoEmbed.offsetHeight - videoWrapper.offsetHeight),
    ease: 'none',
    scrollTrigger: {
      trigger: sectionHero,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });
}
