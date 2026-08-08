import { gsap } from '../core/gsap.js';
import SplitType from 'split-type';

export async function initCtaReveal() {
  if (document.fonts?.ready) await document.fonts.ready;

  const section = document.querySelector('.section_cta');
  const contentWrapper = document.querySelector('.cta_content-wrapper');
  if (!section || section.dataset.textRevealReady === 'true') return;
  section.dataset.textRevealReady = 'true';

  const targets = section.querySelectorAll('.cta_title, .cta_s-copy, .cta_last-copy');
  const lines = [];

  targets.forEach((target) => {
    const split = new SplitType(target, { types: 'lines', lineClass: 'cta-line' });
    split.lines.forEach((line) => {
      const mask = document.createElement('div');
      mask.classList.add('cta-line-mask');
      line.parentNode.insertBefore(mask, line);
      mask.appendChild(line);
      lines.push(line);
    });
  });

  gsap.set(lines, { yPercent: 100, force3D: true });
  gsap.set(contentWrapper, { yPercent: 20, force3D: true });

  const timeline = gsap.timeline({ scrollTrigger: { trigger: section, start: 'top 30%', once: true } });
  timeline
    .to(lines, { yPercent: 0, duration: 1, stagger: 0.1, ease: 'power4.out', force3D: true }, 0)
    .to(contentWrapper, { yPercent: 0, duration: 1.4, ease: 'power4.out', force3D: true }, 0);
}
