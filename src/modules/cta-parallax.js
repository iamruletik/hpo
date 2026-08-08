import { gsap, ScrollTrigger } from '../core/gsap.js';

export function initCtaParallax() {
  const section = document.querySelector('.section_cta');
  const backgroundImage = document.querySelector('.cta-image-bg');
  if (!section || !backgroundImage) return;

  gsap.fromTo(
    backgroundImage,
    { y: () => Math.max(0, backgroundImage.getBoundingClientRect().height - window.innerHeight) },
    {
      y: 0,
      ease: 'none',
      scrollTrigger: { trigger: section, start: 'top center', end: 'bottom center', scrub: true, invalidateOnRefresh: true },
    }
  );

  window.addEventListener('load', () => ScrollTrigger.refresh());
}
