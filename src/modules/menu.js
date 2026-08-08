import { gsap } from '../core/gsap.js';

const MAX_HEIGHT = '400px';

export function initMenu() {
  const navCenter = document.querySelector('.nav_center');
  const burgerWrap = document.querySelector('.nav_center-burger-wrap');
  const menuPanel = document.querySelector('.nav-menu-open');

  if (!navCenter || !burgerWrap || !menuPanel) return;

  const burgerLines = burgerWrap.querySelectorAll('.burger-wrap_line');
  const menuTitle = menuPanel.querySelector('.nav-menu-open-title');
  const menuLinks = menuPanel.querySelectorAll('.nav-menu-link');

  if (burgerLines.length < 2) return;

  let isOpen = false;
  let activeTimeline = null;

  function resetLinksOpacity() {
    gsap.to(menuLinks, { autoAlpha: 1, duration: 0.2, ease: 'power2.out', overwrite: true });
  }

  function killActiveAnimations() {
    activeTimeline?.kill();
    activeTimeline = null;
    gsap.killTweensOf([menuPanel, menuTitle, ...burgerLines]);
  }

  function openMenu() {
    if (isOpen) return;
    killActiveAnimations();

    gsap.set(menuPanel, { display: 'block', maxHeight: 0, autoAlpha: 0, overflow: 'hidden', pointerEvents: 'auto' });
    gsap.set(menuTitle, { y: 0, autoAlpha: 1 });
    gsap.set(menuLinks, { autoAlpha: 1 });

    activeTimeline = gsap.timeline({
      defaults: { ease: 'power4.out' },
      onStart() {
        isOpen = true;
      },
      onComplete() {
        activeTimeline = null;
        gsap.set(menuPanel, { maxHeight: MAX_HEIGHT });
      },
    });

    activeTimeline
      .to(menuPanel, { maxHeight: MAX_HEIGHT, autoAlpha: 1, duration: 0.65 })
      .to(burgerLines[0], { y: 4, rotate: 45, duration: 0.45 }, 0)
      .to(burgerLines[1], { y: -2.5, rotate: -45, duration: 0.45 }, 0)
      .to(menuTitle, { y: 0, autoAlpha: 1, duration: 0.45 }, 0.16);
  }

  function closeMenu() {
    if (!isOpen) return;
    killActiveAnimations();

    gsap.set(menuPanel, { display: 'block', maxHeight: MAX_HEIGHT, overflow: 'hidden', pointerEvents: 'none' });
    gsap.set(menuLinks, { autoAlpha: 1 });

    activeTimeline = gsap.timeline({
      defaults: { ease: 'power3.inOut' },
      onComplete() {
        isOpen = false;
        activeTimeline = null;
        gsap.set(menuPanel, { display: 'none', maxHeight: 0, autoAlpha: 0 });
        gsap.set(menuTitle, { y: 0 });
      },
    });

    activeTimeline
      .to(menuTitle, { y: 0, autoAlpha: 1, duration: 0.22 })
      .to(menuPanel, { maxHeight: 0, autoAlpha: 0, duration: 0.55 }, 0.08)
      .to(burgerLines[0], { y: 0, rotate: 0, duration: 0.38 }, 0)
      .to(burgerLines[1], { y: 0, rotate: 0, duration: 0.38 }, 0);
  }

  function toggleMenu() {
    if (isOpen) closeMenu();
    else openMenu();
  }

  gsap.set(burgerWrap, { cursor: 'pointer' });
  gsap.set(menuPanel, { display: 'none', maxHeight: 0, autoAlpha: 0, overflow: 'hidden', pointerEvents: 'none' });
  gsap.set(menuTitle, { y: 0, autoAlpha: 1 });
  gsap.set(menuLinks, { autoAlpha: 1 });

  burgerWrap.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleMenu();
  });

  menuLinks.forEach((link) => {
    link.addEventListener('pointerenter', () => {
      gsap.to(menuLinks, { autoAlpha: 0.4, duration: 0.14, ease: 'power2.out', overwrite: true });
      gsap.to(link, { autoAlpha: 1, duration: 0.14, ease: 'power2.out', overwrite: true });
    });

    link.addEventListener('focus', () => {
      gsap.to(menuLinks, { autoAlpha: 0.4, duration: 0.14, ease: 'power2.out', overwrite: true });
      gsap.to(link, { autoAlpha: 1, duration: 0.14, ease: 'power2.out', overwrite: true });
    });

    link.addEventListener('click', () => closeMenu());
  });

  menuPanel.addEventListener('pointerleave', resetLinksOpacity);
  menuPanel.addEventListener('focusout', (event) => {
    if (!menuPanel.contains(event.relatedTarget)) resetLinksOpacity();
  });

  document.addEventListener('click', (event) => {
    if (!navCenter.contains(event.target) && isOpen) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen) closeMenu();
  });

  window.addEventListener('resize', () => {
    if (isOpen) gsap.set(menuPanel, { maxHeight: MAX_HEIGHT });
  });
}
