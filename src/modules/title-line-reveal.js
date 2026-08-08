import { gsap } from '../core/gsap.js';
import SplitType from 'split-type';

function revealLines(selector, { trigger, start }) {
  const split = new SplitType(selector, {
    types: 'lines',
    lineClass: 'slider-line',
  });

  split.lines.forEach((line) => {
    const mask = document.createElement('div');
    mask.classList.add('slider-line-mask');
    line.parentNode.insertBefore(mask, line);
    mask.appendChild(line);
  });

  gsap.set(selector, { visibility: 'visible' });
  gsap.set(split.lines, { yPercent: 100 });

  gsap.fromTo(
    split.lines,
    { yPercent: 100 },
    {
      yPercent: 0,
      ease: 'power3.out',
      duration: 1,
      stagger: 0.08,
      scrollTrigger: { trigger, start },
    }
  );
}

export function initTitleLineReveal() {
  revealLines('.slider_title', { trigger: '.section_aim', start: 'center top' });
  revealLines('.aim_title', { trigger: '.section_aim', start: 'top center' });
}
