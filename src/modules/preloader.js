const MINIMUM_SEQUENCE = 2000;
const COMPLETION_DURATION = 260;
const REVEAL_DELAY = 220;
const REVEAL_DURATION = 720;
// Maximum wait for hero assets before the preloader finishes regardless.
const MAXIMUM_WAITING_TIME = 5000;

const PROGRESS_STOPS = [
  [0, 0],
  [154, 3],
  [308, 15],
  [462, 24],
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

// Logo letter reveal uses its own 0–100 progress, independent of page load.
const LETTER_THRESHOLDS = [61, 67, 75, 82, 88, 93, 97];

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

function waitForHeroReady(preloader) {
  const assetsReady = waitForHeroAssets(preloader).catch(() => undefined);
  const safetyTimeout = new Promise((resolve) => window.setTimeout(resolve, MAXIMUM_WAITING_TIME));
  return Promise.race([assetsReady, safetyTimeout]);
}

export function initPreloader() {
  const preloader = document.querySelector('.preloader');

  if (!preloader) {
    window.preloaderFinished = true;
    return;
  }

  if (preloader.dataset.initialized === 'true') return;

  function finish() {
    document.documentElement.classList.remove('preloader-active');
    window.preloaderFinished = true;
    window.dispatchEvent(new CustomEvent('preloader:complete'));
    preloader.remove();
  }

  preloader.dataset.initialized = 'true';
  window.preloaderFinished = false;

  const fill = preloader.querySelector('.track-fill');
  const number = preloader.querySelector('.progress-number');
  const logo = preloader.querySelector('.brand-logo');
  const letters = [...preloader.querySelectorAll('.logo-letter')];

  if (!fill || !number || !logo) {
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
  number.textContent = '0';
  logo.style.setProperty('--logo-shift', '-41.6%');
  letters.forEach((letter) => letter.classList.remove('is-visible'));

  document.documentElement.classList.add('preloader-active');
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
      number.textContent = String(roundedProgress);
      lastNumber = roundedProgress;
    }
  }

  function renderLogoProgress(progress) {
    const safeProgress = Math.min(100, Math.max(0, progress));
    if (Math.abs(safeProgress - lastLogoProgress) < 0.001) return;
    lastLogoProgress = safeProgress;

    const logoPosition = Math.min(1, Math.max(0, (safeProgress - 58) / 42));
    const logoShift = -41.6 * (1 - logoPosition);
    logo.style.setProperty('--logo-shift', `${logoShift}%`);

    letters.forEach((letter, index) => {
      const threshold = LETTER_THRESHOLDS[index] ?? 100;
      if (safeProgress >= threshold) letter.classList.add('is-visible');
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
