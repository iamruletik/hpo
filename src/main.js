import './style.css';
// initPreloader is NOT here — it runs from src/preloader-entry.js, loaded ahead
// of this bundle so it can animate near first paint.
import { ScrollTrigger } from './core/gsap.js';
import { initLenis } from './core/lenis.js';
import { initHeroVideoParallax } from './modules/hero-video-parallax.js';
import { initHeroTextSplit } from './modules/hero-text-split.js';
import { initTitleLineReveal } from './modules/title-line-reveal.js';
import { initNavLogoTheme } from './modules/nav-logo-theme.js';
import { initThemeColorSwap } from './modules/theme-color-swap.js';
import { initSecondaryButtonRoll } from './modules/second-button.js';
import { initSafariVideoSwap } from './modules/safari-video-swap.js';
import { initFootIcon } from './modules/foot-icon.js';
import { initMorphSvgAim } from './modules/morph-svg-aim.js';
import { initTimeline } from './modules/timeline.js';
import { initMenu } from './modules/menu.js';
import { initRequestModal } from './modules/request-modal.js';
import { initTabs } from './modules/tabs.js';
import { initSolutionCarousel } from './modules/solution-carousel.js';
import { initCtaParallax } from './modules/cta-parallax.js';
import { initEveryChamberReveal } from './modules/every-chamber-reveal.js';
import { initNavProgress } from './modules/nav-progress.js';
import { initCtaReveal } from './modules/cta-reveal.js';
import { initOverviewReveal } from './modules/overview-reveal.js';
import { initBodyThemeScroll } from './modules/body-theme-scroll.js';
import { initFooterSequence } from './modules/footer-sequence.js';

// Startup runs in two phases.
//
// Everything used to init here in one block, which meant SplitType splitting,
// ScrollTrigger building and the carousel measuring all ran while the preloader
// was mid-animation — a ~600ms long task on top of the only thing on screen.
//
// Phase one is what has to exist before the curtains open, or content flashes
// unstyled: the hero split, above-the-fold reveals, and anything in the nav the
// user can touch the instant they can scroll. Phase two is below the fold or
// interaction-only and can wait.

function runEarly() {
  initLenis();
  initHeroVideoParallax();
  initHeroTextSplit();
  initTitleLineReveal();
  initNavLogoTheme();
  // theme-color-swap publishes window.requestChameleonButtonsUpdate, which
  // second-button.js calls — keep the pair together and in this order.
  initThemeColorSwap();
  initSecondaryButtonRoll();
  initSafariVideoSwap();
  initMenu();
  initRequestModal();

  // These two cannot be deferred, because on a reload partway down the page
  // their sections are already on screen when the curtains open:
  //   solution-carousel wipes .solution-image-stage / .solutions-title-list and
  //     rebuilds them from the CMS source, so late init shows a bare section.
  //   overview-reveal owns elements CSS hides (.scroll-fill-text,
  //     .overview_lower are visibility:hidden) and nothing else reveals them.
  //initSolutionCarousel();
  initOverviewReveal();
}

const DEFERRED = [
  initFootIcon,
  initMorphSvgAim,
  initTimeline,
  initTabs,
  initCtaParallax,
  initEveryChamberReveal,
  initNavProgress,
  initCtaReveal,
  initFooterSequence,
];

// Time-sliced so phase two does not simply become a new long task the moment
// the curtains open. Each frame spends at most ~8ms initialising, then yields.
function runDeferred() {
  const queue = [...DEFERRED];

  function step() {
    const startedAt = performance.now();

    while (queue.length && performance.now() - startedAt < 8) {
      queue.shift()();
    }

    if (queue.length) requestAnimationFrame(step);

    // No ScrollTrigger.refresh() here. This runs *after* the curtains open, so
    // a global refresh recalculates every trigger while the user is looking at
    // the page — and on a pinned/sticky section that shows up as a visible
    // jump. Each ScrollTrigger measures itself on creation, so the refresh was
    // never load-bearing.
  }

  requestAnimationFrame(step);
}

function whenPreloaderDone(callback) {
  // No preloader on the page (or already gone) means run immediately.
  if (window.preloaderFinished || !document.querySelector('.preloader')) {
    callback();
    return;
  }
  window.addEventListener('preloader:complete', callback, { once: true });
}

runEarly();

// The preloader is a separate bundle and cannot see this module's state, so it
// waits on this before opening. It races a 5s cap on its side, so a throw above
// delays the reveal rather than blocking it forever.
window.siteReady = true;
window.dispatchEvent(new CustomEvent('site:ready'));

whenPreloaderDone(runDeferred);

//initBodyThemeScroll();
