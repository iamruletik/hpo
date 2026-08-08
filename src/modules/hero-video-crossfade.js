import { gsap } from '../core/gsap.js';

export function initHeroVideoCrossfade() {
  gsap.to('.hero-video-container', {
    opacity: 0,
    pointerEvents: 'none',
    scrollTrigger: {
      trigger: '.section_overview',
      start: 'top top',
      end: 'top center',
      scrub: true,
    },
  });

  gsap.to('.aim_video-wrapper', {
    opacity: 1,
    pointerEvents: 'none',
    scrollTrigger: {
      trigger: '.section_overview',
      start: 'top top',
      end: 'top center',
      scrub: true,
    },
  });
}
