import { gsap } from '../core/gsap.js';
import SplitType from 'split-type';

const TRIGGER = '.section_footer';
const START = 'top 75%';

// Wraps an element in an overflow:hidden span so it can be slid out from behind
// its own edge. Used for the single-line items (links, back-to-top) where
// splitting into lines would be overkill.
function maskElement(element) {
  if (element.parentElement?.classList.contains('footer-reveal-mask')) {
    return element;
  }

  const mask = document.createElement('span');
  mask.className = 'footer-reveal-mask';
  element.parentNode.insertBefore(mask, element);
  mask.appendChild(element);
  return element;
}

export function initFooterReveal() {
  const footer = document.querySelector(TRIGGER);
  if (!footer) return;

  const title = footer.querySelector('.footer-title');
  const backToTop = footer.querySelector('.scroll-down-wrap.is-f');
  const links = Array.from(footer.querySelectorAll('.footer-link'));

  // Same mask-per-line treatment as title-line-reveal, so the footer heading
  // reads like the other section titles.
  if (title) {
    const split = new SplitType(title, {
      types: 'lines',
      lineClass: 'footer-line',
    });

    split.lines.forEach((line) => {
      const mask = document.createElement('div');
      mask.className = 'footer-line-mask';
      line.parentNode.insertBefore(mask, line);
      mask.appendChild(line);
    });

    gsap.set(title, { visibility: 'visible' });

    gsap.fromTo(
      split.lines,
      { yPercent: 100 },
      {
        yPercent: 0,
        ease: 'power3.out',
        duration: 1,
        stagger: 0.08,
        scrollTrigger: { trigger: TRIGGER, start: START },
      },
    );
  }

  // Back-to-top and the legal links share one stagger so the bottom of the
  // footer resolves as a single gesture rather than two competing ones.
  const singleLine = [backToTop, ...links].filter(Boolean).map(maskElement);

  if (!singleLine.length) return;

  // CSS hides these until their masks exist; see reveal-states.css.
  gsap.set(singleLine, { visibility: 'visible' });

  gsap.fromTo(
    singleLine,
    { yPercent: 110 },
    {
      yPercent: 0,
      ease: 'power3.out',
      duration: 0.8,
      stagger: 0.05,
      scrollTrigger: { trigger: TRIGGER, start: START },
    },
  );
}
