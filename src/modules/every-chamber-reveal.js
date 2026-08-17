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

  // Park the words BEFORE anything becomes visible. fromTo() leaves its start
  // state to the ScrollTrigger, and a refresh — which mobile fires whenever the
  // address bar shows or hides — can apply it a frame late. That is the flash:
  // the words paint at their resting position and are only then pushed down.
  // Setting it explicitly means the parked state is true from the moment the
  // text is revealed, regardless of when ScrollTrigger gets around to it.
  // 115, not 100: yPercent moves a word by its own height, but the line box is
  // taller than the glyphs, so 100% leaves the tops of letters poking out.
  gsap.set(words, { yPercent: 115, opacity: 0.8 });

  // CSS hides these until the words exist; see reveal-states.css.
  gsap.set('.every-chamber-center, .every-chamber-copy', { visibility: 'visible' });

  // The line is display:none below 991 (.scroll-line-svg-wrap and
  // .scroll-line-grid), and a display:none trigger has no box for ScrollTrigger
  // to measure — so the words never fired on mobile. Fall back to the content
  // itself, which exists at every width. getClientRects() is empty for
  // display:none, which is what makes this a reliable test.
  const line = document.querySelector('.scroll-line-svg');
  const lineIsVisible = Boolean(line && line.getClientRects().length);

  gsap.to(
    words,
    {
      yPercent: 0,
      opacity: 1,
      duration: 0.8,
      ease: 'power4.out',
      stagger: 0.1,
      scrollTrigger: lineIsVisible
        // Offset past the drawn line on desktop, so the words follow it in.
        ? { trigger: '.scroll-line-svg', start: 'top+=400 70%' }
        // .every-chamber-content goes flex-column at medium and is far taller
        // than on desktop, so its top crosses the viewport long before the text
        // arrives. Trigger on the text itself.
        : { trigger: '.every-chamber-center', start: 'top 85%', invalidateOnRefresh: true },
    }
  );
}
