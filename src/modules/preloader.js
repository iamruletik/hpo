const MINIMUM_SEQUENCE = 2000;
const COMPLETION_DURATION = 260;
const REVEAL_DELAY = 220;
const REVEAL_DURATION = 720;
// Maximum wait for hero assets before the preloader finishes regardless.
const MAXIMUM_WAITING_TIME = 5000;

const PROGRESS_STOPS = [
  [0, 0],
  // The first three stops used to creep (3%, 15%) which left the fill sitting
  // at a hairline while the mark was already moving. It now takes a real bite
  // out of the track immediately.
  [154, 10],
  [308, 20],
  [462, 28],
  [615, 41],
  [769, 50],
  [923, 59],
  [1077, 59],
  [1231, 61],
  [1385, 67],
  [1538, 82],
  [1692, 83],
  [1846, 88],
  [2000, 90],
];

// Logo reveal runs on its own 0–100 progress, independent of page load. The
// mark slides aside first, finishing at SHIFT_END; the letters then land on
// widening gaps (4, 5, 6, 7, 8, 9) so the stagger snaps out fast and eases off.
//
// The logo clock is 0–100 across MINIMUM_SEQUENCE (2000ms). Both phases used to
// sit in the back half of it, so the mark crept for a second and the last letter
// only landed at ~1.5s. Everything is pulled forward: the mark is done by 640ms
// and the wordmark is complete by ~1.3s, leaving the tail for the counter to
// finish rather than for the logo to still be assembling.
const SHIFT_END = 32;
// Letters start just before the mark finishes sliding, so the two overlap
// slightly instead of reading as two separate beats.
const LETTER_THRESHOLDS = [28, 32, 37, 43, 50, 58, 67];

// How far below its final position each letter starts, in SVG user units. The
// viewBox is only 33 tall while the horizontal offsets reach ~110, so this has
// to be a sizeable fraction of the height to register against the slide.
const LETTER_DROP = 26;

// Every letter emerges at the same spot — the right edge of the wordmark, next
// to the mark — and slides left into place while rising the LETTER_DROP units
// it started below. Because they share that origin, each new letter appears to
// shove the earlier ones leftward.
function placeLetters(letters) {
  let originX = 0;

  const boxes = letters.map((letter) => {
    try {
      const box = letter.getBBox();
      originX = Math.max(originX, box.x + box.width);
      return box;
    } catch {
      return null;
    }
  });

  letters.forEach((letter, index) => {
    const box = boxes[index];
    if (!box) return;
    const offsetX = originX - (box.x + box.width);
    letter.style.transform = `translate(${offsetX}px, ${LETTER_DROP}px)`;
  });
}

function progressAt(time) {
  for (let index = 1; index < PROGRESS_STOPS.length; index += 1) {
    const [nextTime, nextValue] = PROGRESS_STOPS[index];
    const [previousTime, previousValue] = PROGRESS_STOPS[index - 1];

    if (time <= nextTime) {
      const position = (time - previousTime) / (nextTime - previousTime);
      return previousValue + (nextValue - previousValue) * position;
    }
  }

  return 90;
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

// Slow start, fast finish. Quadratic rather than cubic: cubic held the mark
// almost still for the first 60% of its phase, which read as nothing happening.
function easeInQuad(value) {
  return value * value;
}

function waitForDOM() {
  if (document.readyState !== 'loading') return Promise.resolve();
  return new Promise((resolve) => {
    document.addEventListener('DOMContentLoaded', resolve, { once: true });
  });
}

function waitForImage(image) {
  if (image.complete) {
    if (typeof image.decode !== 'function') return Promise.resolve();
    return image.decode().catch(() => undefined);
  }

  return new Promise((resolve) => {
    const finish = () => {
      if (typeof image.decode !== 'function') {
        resolve();
        return;
      }
      image.decode().catch(() => undefined).finally(resolve);
    };

    image.addEventListener('load', finish, { once: true });
    image.addEventListener('error', resolve, { once: true });
  });
}

function waitForVideo(video) {
  // readyState >= 2 means the current frame is already available.
  if (video.readyState >= 2) return Promise.resolve();

  return new Promise((resolve) => {
    const finish = () => {
      video.removeEventListener('loadeddata', finish);
      video.removeEventListener('canplay', finish);
      video.removeEventListener('error', finish);
      resolve();
    };

    video.addEventListener('loadeddata', finish, { once: true });
    video.addEventListener('canplay', finish, { once: true });
    video.addEventListener('error', finish, { once: true });
  });
}

async function waitForHeroAssets(preloader) {
  await waitForDOM();

  const hero = preloader.nextElementSibling?.matches('.section_hero')
    ? preloader.nextElementSibling
    : document.querySelector('.section_hero');

  if (!hero) return;

  const heroImages = [...hero.querySelectorAll('img')];
  const heroVideos = [...hero.querySelectorAll('video')];

  const imagesReady = Promise.all(heroImages.map(waitForImage));
  const videosReady = Promise.all(heroVideos.map(waitForVideo));
  const fontsReady = document.fonts?.ready ? document.fonts.ready.catch(() => undefined) : Promise.resolve();

  await Promise.all([imagesReady, videosReady, fontsReady]);
}

// main.js is a separate bundle now, so the preloader can no longer assume the
// site is initialised just because its own code ran. main.js raises this once
// its above-the-fold modules are live.
function waitForSiteReady() {
  // Flag first, in case main.js finished before this listener was attached.
  if (window.siteReady) return Promise.resolve();
  return new Promise((resolve) => {
    window.addEventListener('site:ready', resolve, { once: true });
  });
}

function waitForHeroReady(preloader) {
  const ready = Promise.all([
    waitForHeroAssets(preloader).catch(() => undefined),
    waitForSiteReady(),
  ]);
  // Still capped: if main.js 404s or throws during init, the curtains open
  // anyway rather than trapping the user behind a white screen.
  const safetyTimeout = new Promise((resolve) => window.setTimeout(resolve, MAXIMUM_WAITING_TIME));
  return Promise.race([ready, safetyTimeout]);
}

export function initPreloader() {
  const preloader = document.querySelector('.preloader');

  if (!preloader) {
    window.preloaderFinished = true;
    return;
  }

  if (preloader.dataset.initialized === 'true') return;

  // Scroll is blocked by swallowing the events, NOT by overflow: hidden.
  // overflow on <html> (or <body>) silently disables position: sticky for every
  // descendant — so while the preloader was up, .solutions-sticky could not
  // stick. Removing the preloader restored overflow, sticky engaged, and the
  // section snapped into place. That was the load jump.
  const blockScroll = (event) => {
    if (event.target.closest?.('.preloader')) return;
    event.preventDefault();
  };
  const blockKeys = (event) => {
    const keys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
    if (keys.includes(event.key)) event.preventDefault();
  };

  function lockScroll() {
    window.addEventListener('wheel', blockScroll, { passive: false });
    window.addEventListener('touchmove', blockScroll, { passive: false });
    window.addEventListener('keydown', blockKeys);
  }

  function unlockScroll() {
    window.removeEventListener('wheel', blockScroll);
    window.removeEventListener('touchmove', blockScroll);
    window.removeEventListener('keydown', blockKeys);
  }

  function finish() {
    unlockScroll();
    document.documentElement.classList.remove('preloader-active');
    window.preloaderFinished = true;
    window.dispatchEvent(new CustomEvent('preloader:complete'));
    preloader.remove();
  }

  preloader.dataset.initialized = 'true';
  window.preloaderFinished = false;

  const fill = preloader.querySelector('.track-fill');
  const number = preloader.querySelector('.progress-number');

  // .progress-number is the 28px clipping window (overflow: hidden). Animating
  // it moves the window along with the text, so the digits can never slide
  // behind anything — they need their own layer inside it.
  let numberValue = number?.querySelector('.progress-number__value');
  if (number && !numberValue) {
    numberValue = document.createElement('span');
    numberValue.className = 'progress-number__value';
    numberValue.textContent = number.textContent.trim() || '0';
    number.replaceChildren(numberValue);
  }
  const logo = preloader.querySelector('.brand-logo');
  const letters = [...preloader.querySelectorAll('.logo-letter')];

  if (!fill || !number || !numberValue || !logo) {
    finish();
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let pageReady = false;
  let completingAt = null;
  let completionStarted = false;
  let animationFrame = null;
  let logoFinished = false;

  let lastLoadingProgress = -1;
  let lastLogoProgress = -1;
  let lastNumber = -1;

  const startedAt = performance.now();

  // Reset in case old inline values (e.g. width: 90%) were left on the element.
  fill.style.width = '';
  fill.style.transform = 'translateX(-50%) scaleX(0)';
  numberValue.textContent = '0';
  logo.style.setProperty('--logo-shift', '-41.6%');
  letters.forEach((letter) => letter.classList.remove('is-visible'));
  placeLetters(letters);

  document.documentElement.classList.add('preloader-active');
  lockScroll();
  preloader.classList.remove('is-complete');
  preloader.classList.add('is-loading');

  function renderLoadingProgress(progress) {
    const safeProgress = Math.min(100, Math.max(0, progress));

    if (Math.abs(safeProgress - lastLoadingProgress) > 0.001) {
      fill.style.transform = `translateX(-50%) scaleX(${safeProgress / 100})`;
      lastLoadingProgress = safeProgress;
    }

    const roundedProgress = Math.round(safeProgress);
    if (roundedProgress !== lastNumber) {
      numberValue.textContent = String(roundedProgress);
      lastNumber = roundedProgress;
    }
  }

  function renderLogoProgress(progress) {
    const safeProgress = Math.min(100, Math.max(0, progress));
    if (Math.abs(safeProgress - lastLogoProgress) < 0.001) return;
    lastLogoProgress = safeProgress;

    const logoPosition = Math.min(1, Math.max(0, safeProgress / SHIFT_END));
    const logoShift = -41.6 * (1 - easeInQuad(logoPosition));
    logo.style.setProperty('--logo-shift', `${logoShift}%`);

    letters.forEach((letter, index) => {
      const threshold = LETTER_THRESHOLDS[index] ?? 100;
      if (safeProgress < threshold || letter.classList.contains('is-visible')) return;
      // Clearing the inline offset lets the CSS transition carry it home.
      letter.style.transform = 'translate(0px, 0px)';
      letter.classList.add('is-visible');
    });
  }

  function removePreloader() {
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    finish();
  }

  function completePreloader(animate = true) {
    if (completionStarted) return;
    completionStarted = true;

    preloader.classList.remove('is-loading');
    renderLogoProgress(100);
    renderLoadingProgress(100);

    if (!animate || reducedMotion) {
      removePreloader();
      return;
    }

    preloader.classList.add('is-complete');
    window.setTimeout(removePreloader, REVEAL_DELAY + REVEAL_DURATION + 100);
  }

  function tick(now) {
    const elapsed = now - startedAt;

    // The logo always reaches 100% within MINIMUM_SEQUENCE.
    if (!logoFinished) {
      const logoProgress = Math.min(100, (elapsed / MINIMUM_SEQUENCE) * 100);
      renderLogoProgress(logoProgress);
      if (logoProgress >= 100) {
        logoFinished = true;
        renderLogoProgress(100);
      }
    }

    // The line and number only reach 90% on their own.
    let loadingProgress = progressAt(Math.min(elapsed, MINIMUM_SEQUENCE));

    // Once the hero is ready, the line eases from 90% to 100%.
    if (elapsed >= MINIMUM_SEQUENCE && pageReady) {
      if (completingAt === null) completingAt = now;

      const completionPosition = Math.min(1, (now - completingAt) / COMPLETION_DURATION);
      loadingProgress = 90 + 10 * easeOutCubic(completionPosition);

      if (completionPosition >= 1) {
        renderLogoProgress(100);
        renderLoadingProgress(100);
        completePreloader(true);
        return;
      }
    }

    renderLoadingProgress(loadingProgress);
    animationFrame = requestAnimationFrame(tick);
  }

  renderLogoProgress(0);
  renderLoadingProgress(0);

  waitForHeroReady(preloader).then(() => {
    pageReady = true;
    if (reducedMotion) completePreloader(false);
  });

  if (!reducedMotion) {
    animationFrame = requestAnimationFrame(tick);
  }
}
