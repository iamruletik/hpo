import { gsap, ScrollTrigger } from '../core/gsap.js';
import SplitType from 'split-type';

const SELECTORS = {
  heroTitle: '.hero_big-title',
  heroCopy: '.hero_copy-text',

  hardwareTitle: '.hero_hardware-title',
  hardwareSection: '.hero_hardware',
  hardwareBadge: '.hero_hardware-badge',
  hardwareMedia: '.hero_hardware-media',
  hardwareBlur: '.hero_hardware-blur',

  heroVideo: '.hero-video-wrapper',

  lastWrapper: '.hero_last-wrapper',
  lastTitle: '.hero_last-title',
  lastCopy: '.hero_last-copy',
};

function exists(target) {
  return gsap.utils.toArray(target).length > 0;
}

function splitLinesWithMask(selector) {
  if (!exists(selector)) return [];

  const split = new SplitType(selector, { types: 'lines', lineClass: 'line' });

  split.lines.forEach((line) => {
    const mask = document.createElement('div');
    mask.classList.add('line-mask');
    line.parentNode.insertBefore(mask, line);
    mask.appendChild(line);
  });

  gsap.set(selector, { visibility: 'visible' });

  return split.lines;
}

function createRevealAnimation(target, fromVars, toVars, scrollTriggerVars = {}) {
  if (!exists(target)) return null;

  gsap.set(target, { willChange: 'transform, opacity', force3D: true });

  return gsap.fromTo(
    target,
    { ...fromVars, force3D: true },
    {
      duration: 1,
      ease: 'power3.out',
      overwrite: 'auto',
      force3D: true,
      ...toVars,
      scrollTrigger: {
        trigger: SELECTORS.hardwareSection,
        start: 'top center',
        toggleActions: 'play none none none',
        once: true,
        invalidateOnRefresh: true,
        ...scrollTriggerVars,
      },
    }
  );
}

export async function initHeroTextSplit() {
  // Wait for fonts so SplitType measures line breaks/heights correctly.
  if (document.fonts?.ready) await document.fonts.ready;

  // Split before the preloader finishes so there's no jump/flash when it clears.
  const heroTitleLines = splitLinesWithMask(SELECTORS.heroTitle);
  const heroCopyLines = splitLinesWithMask(SELECTORS.heroCopy);
  const hardwareTitleLines = splitLinesWithMask(SELECTORS.hardwareTitle);
  const lastTitleLines = splitLinesWithMask(SELECTORS.lastTitle);
  const lastCopyLines = splitLinesWithMask(SELECTORS.lastCopy);

  const heroLines = [...heroTitleLines, ...heroCopyLines, ...lastTitleLines, ...lastCopyLines];

  gsap.set(heroLines, { yPercent: 110, opacity: 1, willChange: 'transform', force3D: true });
  gsap.set(hardwareTitleLines, { yPercent: 100, opacity: 0, willChange: 'transform, opacity', force3D: true });

  // paused: true — held until the preloader finishes.
  const introTl = gsap.timeline({
    paused: true,
    defaults: { duration: 1.15, ease: 'expo.out' },
    onComplete: () => {
      gsap.set([...heroTitleLines, ...heroCopyLines], { clearProps: 'willChange' });
    },
  });

  introTl.to(heroTitleLines, { yPercent: 0, stagger: 0.2 }).to(heroCopyLines, { yPercent: 0, stagger: 0.12 }, '-=1.05');

  let introStarted = false;
  function startHeroIntro() {
    if (introStarted) return;
    introStarted = true;
    requestAnimationFrame(() => {
      introTl.play(0);
      ScrollTrigger.refresh();
    });
  }

  // window.preloaderFinished is set by the preloader module. The extra
  // .preloader existence check covers it being disabled/already removed.
  if (window.preloaderFinished || !document.querySelector('.preloader')) {
    startHeroIntro();
  } else {
    window.addEventListener('preloader:complete', startHeroIntro, { once: true });
  }

  createRevealAnimation(
    hardwareTitleLines,
    { yPercent: 100, opacity: 0 },
    { yPercent: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.2 },
    { trigger: SELECTORS.hardwareSection, start: 'top-=300 center' }
  );

  createRevealAnimation(
    SELECTORS.hardwareBadge,
    { yPercent: 100, scale: 0, opacity: 0, transformOrigin: '50% 100%' },
    { yPercent: 0, scale: 1, opacity: 1, transformOrigin: '50% 100%', duration: 0.9, ease: 'power3.out' },
    { trigger: SELECTORS.hardwareSection, start: 'top-=150 center' }
  );

  const hardwareMedia = document.querySelector(SELECTORS.hardwareMedia);
  const hardwareBlur = document.querySelector(SELECTORS.hardwareBlur);

  if (hardwareMedia) {
    gsap.set(hardwareMedia, {
      maxHeight: 0,
      yPercent: 50,
      opacity: 0.9,
      overflow: 'hidden',
      willChange: 'max-height, transform, opacity',
      force3D: true,
    });

    if (hardwareBlur) {
      gsap.set(hardwareBlur, { height: '20rem', overflow: 'hidden', willChange: 'height' });
    }

    const mediaTl = gsap.timeline({
      scrollTrigger: {
        trigger: SELECTORS.hardwareSection,
        start: 'top-=50 center',
        toggleActions: 'play none none none',
        once: true,
        invalidateOnRefresh: true,
      },
    });

    // Height reveal and media movement start together.
    mediaTl
      .to(hardwareMedia, { maxHeight: () => hardwareMedia.scrollHeight, duration: 1.3, ease: 'power3.inOut' }, 0)
      .to(hardwareMedia, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'power3.out', force3D: true }, 0)
      .set(hardwareMedia, { maxHeight: 'none', clearProps: 'overflow,willChange' });

    // Blur starts shrinking near the end of the media reveal.
    if (hardwareBlur) {
      mediaTl
        .to(hardwareBlur, { height: '0rem', duration: 1.4, ease: 'power3.out' }, '-=0.4')
        .set(hardwareBlur, { clearProps: 'overflow,willChange' });
    }
  }

  if (exists(SELECTORS.heroVideo)) {
    gsap.to(SELECTORS.heroVideo, {
      width: '100vw',
      height: '100vh',
      left: '0px',
      top: '0px',
      borderRadius: '0rem',
      duration: 1.1,
      ease: 'power3.inOut',
      scrollTrigger: {
        trigger: 'body',
        start: 'top+=100 top',
        toggleActions: 'play none none none',
        once: true,
        invalidateOnRefresh: true,
      },
    });
  }

  if (lastTitleLines.length && exists(SELECTORS.lastWrapper)) {
    gsap.fromTo(
      lastTitleLines,
      { yPercent: 100 },
      {
        yPercent: 0,
        stagger: 0.1,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: SELECTORS.lastWrapper,
          start: 'top-=150 center',
          toggleActions: 'play none none none',
          once: true,
          invalidateOnRefresh: true,
        },
      }
    );
  }

  if (lastCopyLines.length && exists(SELECTORS.lastWrapper)) {
    gsap.fromTo(
      lastCopyLines,
      { yPercent: 100 },
      {
        yPercent: 0,
        stagger: 0.1,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: SELECTORS.lastWrapper,
          start: 'top-=150 center',
          toggleActions: 'play none none none',
          once: true,
          invalidateOnRefresh: true,
        },
      }
    );
  }

  ScrollTrigger.refresh();
}
