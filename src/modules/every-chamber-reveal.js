import { gsap } from '../core/gsap.js';
import SplitType from 'split-type';

export function initEveryChamberReveal() {
  gsap.fromTo(
    '.scroll-line-path',
    { drawSVG: '0%' },
    { drawSVG: '100%', ease: 'none', scrollTrigger: { trigger: '.scroll-line-svg', start: 'top 70%', end: '+=400', scrub: true } }
  );

  new SplitType('.ec-text, .every-chamber-copy', { types: 'words' });
  const words = gsap.utils.toArray('.every-chamber-center .word, .every-chamber-copy .word');

  gsap.fromTo(
    words,
    { yPercent: 100, opacity: 0.8 },
    {
      yPercent: 0,
      opacity: 1,
      duration: 0.8,
      ease: 'power4.out',
      stagger: 0.1,
      scrollTrigger: { trigger: '.scroll-line-svg', start: 'top+=400 70%' },
    }
  );
}
