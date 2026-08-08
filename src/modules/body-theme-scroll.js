import { ScrollTrigger } from '../core/gsap.js';

export async function initBodyThemeScroll() {
  if (document.fonts?.ready) await document.fonts.ready;

  const sections = document.querySelectorAll('.main > div[data-logo-theme]');

  sections.forEach((section) => {
    const theme = section.getAttribute('data-logo-theme');

    ScrollTrigger.create({
      trigger: section,
      start: 'top+=2.5rem top',
      onEnter: () => document.body.setAttribute('data-theme', theme),
      onEnterBack: () => document.body.setAttribute('data-theme', theme),
    });
  });
}
