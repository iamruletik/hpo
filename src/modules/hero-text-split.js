import { gsap, ScrollTrigger } from '../core/gsap.js';
import SplitType from 'split-type';

const SELECTORS = {
  heroTitle: '.hero_big-title',
  heroTitleBadge: '.hero_title-badge',
  heroCopy: '.hero_copy-text',
  heroDivider: '.hero_content-divider',

  hardwareTitle: '.hero_hardware-title',
  hardwareSection: '.hero_hardware',
  hardwareBadge: '.hero_hardware-badge',
  hardwareWrapper: '.hero_mwrapper',
  hardwareBlur: '.hero_hardware-blur',

  heroVideo: '.hero-video-wrapper',

  lastWrapper: '.hero_last-wrapper',
  lastTitle: '.hero_last-title',
  lastCopy: '.hero_last-copy',
};

function exists(target) {
  return gsap.utils.toArray(target).length > 0;
}

// Sharp at the top, progressively more blurred toward the bottom. Each
// layer is a transparent div with backdrop-filter:blur() over the real
// image, mask and backdrop-filter on the same element (that combo does
// work together — an earlier attempt split them onto separate elements
// based on a wrong theory about why nothing was showing). Each layer's
// mask fades IN and back OUT over its own narrow band — not "fade in and
// stay opaque to 100%" — so bands don't keep compounding on top of each
// other's already-blurred output further down the stack. Only the last
// (strongest) layer stays opaque through 100%, anchoring the bottom edge.
const PROGRESSIVE_BLUR_LAYERS = [
  { blur: 6, stops: [25, 35, 45, 55] },
  { blur: 14, stops: [40, 50, 60, 70] },
  { blur: 26, stops: [55, 65, 75, 85] },
  { blur: 42, stops: [70, 80, 88, 96] },
  { blur: 64, stops: [82, 95] },
];

function buildProgressiveBlurMask(stops) {
  if (stops.length === 4) {
    const [fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd] = stops;
    return `linear-gradient(to bottom, transparent ${fadeInStart}%, black ${fadeInEnd}%, black ${fadeOutStart}%, transparent ${fadeOutEnd}%)`;
  }
  const [fadeInStart, fadeInEnd] = stops;
  return `linear-gradient(to bottom, transparent ${fadeInStart}%, black ${fadeInEnd}%, black 100%)`;
}

function buildProgressiveBlur(container) {
  container.replaceChildren();

  PROGRESSIVE_BLUR_LAYERS.forEach(({ blur, stops }) => {
    const layer = document.createElement('div');
    layer.setAttribute('aria-hidden', 'true');
    layer.className = 'hero_hardware-blur-layer';
    layer.style.backdropFilter = `blur(${blur}px)`;
    layer.style.webkitBackdropFilter = `blur(${blur}px)`;
    const mask = buildProgressiveBlurMask(stops);
    layer.style.mask = mask;
    layer.style.webkitMask = mask;
    container.appendChild(layer);
  });
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
  const heroTitleBadgeLines = splitLinesWithMask(SELECTORS.heroTitleBadge);
  const heroCopyLines = splitLinesWithMask(SELECTORS.heroCopy);
  const hardwareTitleLines = splitLinesWithMask(SELECTORS.hardwareTitle);
  const lastTitleLines = splitLinesWithMask(SELECTORS.lastTitle);
  const lastCopyLines = splitLinesWithMask(SELECTORS.lastCopy);

  const heroLines = [...heroTitleLines, ...heroTitleBadgeLines, ...heroCopyLines, ...lastTitleLines, ...lastCopyLines];

  gsap.set(heroLines, { yPercent: 110, opacity: 1, willChange: 'transform', force3D: true });
  gsap.set(hardwareTitleLines, { yPercent: 100, opacity: 0, willChange: 'transform, opacity', force3D: true });
  gsap.set(SELECTORS.heroDivider, { scaleX: 0, transformOrigin: '50% 50%' });

  // paused: true — held until the preloader finishes.
  const introTl = gsap.timeline({
    paused: true,
    defaults: { duration: 1.15, ease: 'expo.out' },
    onComplete: () => {
      gsap.set([...heroTitleLines, ...heroTitleBadgeLines, ...heroCopyLines], { clearProps: 'willChange' });
    },
  });

  introTl
    .to([...heroTitleLines, ...heroTitleBadgeLines], { yPercent: 0, stagger: 0.2 })
    .to(heroCopyLines, { yPercent: 0, stagger: 0.12 }, '-=1.05')
    .to(SELECTORS.heroDivider, { scaleX: 1, duration: 0.9, ease: 'power3.out' }, 0);

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

  const hardwareWrapper = document.querySelector(SELECTORS.hardwareWrapper);
  const hardwareBlur = document.querySelector(SELECTORS.hardwareBlur);

  if (hardwareWrapper) {
    gsap.set(hardwareWrapper, {
      yPercent: 100,
      opacity: 0.9,
      willChange: 'transform, opacity',
      force3D: true,
    });

    if (hardwareBlur) {
      buildProgressiveBlur(hardwareBlur);
      // No willChange here — it promotes this element to its own compositing
      // layer, which isolates it from the page's real backdrop and breaks
      // backdrop-filter on the children inside it (confirmed live: works
      // fine with backdrop-filter directly on this element, not through it).
      gsap.set(hardwareBlur, { opacity: 1 });
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

    mediaTl.to(
      hardwareWrapper,
      {
        yPercent: 0,
        opacity: 1,
        duration: 1.2,
        ease: 'power3.out',
        force3D: true,
      },
      0
    );

    // Own separate scrub, not part of mediaTl — the wrapper stays a
    // trigger-once play, only the blur's slide-out tracks scroll directly.
    // No willChange (breaks backdrop-filter on the children, see above).
    // yPercent:100 moves it by exactly its own height regardless of what
    // that actually resolves to.
    if (hardwareBlur) {
      gsap.to(hardwareBlur, {
        yPercent: 100,
        ease: 'none',
        scrollTrigger: {
          trigger: SELECTORS.hardwareSection,
          start: 'center center',
          end: '+=400',
          scrub: true,
          invalidateOnRefresh: true,
          // Once scrolled past, lock it there (kill stops it reversing if
          // you scroll back up) and tear it down — it's not visible
          // anymore, no reason to keep paying for backdrop-filter
          // compositing on it.
          onLeave: (self) => {
            self.kill();
            hardwareBlur.style.display = 'none';
          },
        },
      });
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
        // `once` has to go with it — it kills the trigger after the first play,
        // so the reverse would never fire.
        toggleActions: 'play none none reverse',
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
