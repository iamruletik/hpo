import { gsap, ScrollTrigger } from '../core/gsap.js';

const FRAME_COUNT = 60;

// 991px matches the Designer's medium breakpoint and the @media edge in
// footer-scene.css. Read once at init, not watched — crossing the breakpoint
// swaps input model as well as size, and rebinding all of that live is more
// machinery than a decorative element earns.
const MOBILE_QUERY = '(max-width: 991px)';

// The sequence is sized off the frame's own aspect ratio, which leaves it small
// on a phone. Applied as a GSAP transform rather than CSS: gsap owns this
// element's matrix (x/y drift, yPercent reveal) and a CSS transform would be
// overwritten on the next set.
const MOBILE_SCALE = 2;

// Frames per second for the mobile autoplay. The source is 60 frames; running
// them at 24 gives a 2.5s pass, slow enough to read as ambient rather than a
// flipbook — and the yoyo makes the full cycle 5s.
const AUTOPLAY_FPS = 24;

// How far the whole element drifts with the pointer, in px. Deliberately small
// — this is texture, not a parallax effect.
const DRIFT = 14;
// Per-frame easing toward the cursor-derived target: the fraction of the
// remaining distance covered each frame. Lower means the sequence lags further
// behind the pointer and takes longer to catch up.
const SCRUB_EASE = 0.05;
const DRIFT_EASE = 0.06;

// Frames are served from the same Google Cloud bucket as the video assets
// rather than from beside the bundle — measurably faster than GitHub Pages, and
// it is where every other heavy asset on this site already lives.
//
// This replaces a base derived from import.meta.url, which existed only because
// the page is served by Webflow while the script is not, so a root-relative
// path resolved against webflow.io and 404d. An absolute URL sidesteps that
// entirely and makes dev and build identical by construction.
//
// Cross-origin is fine here: these are only ever drawn, never read back, so the
// canvas tainting that comes with it costs nothing. Adding crossOrigin would
// require CORS headers on the bucket for no benefit.
const FRAME_BASE = 'https://storage.googleapis.com/radiance/hpo/footer_sequence/';

function framePath(index) {
  const name = String(index + 1).padStart(4, '0');
  return `${FRAME_BASE}${name}.webp`;
}

function loadFrames() {
  return Array.from({ length: FRAME_COUNT }, (_, index) => {
    const image = new Image();
    image.decoding = 'async';
    // These are decorative and far below the fold. Low priority keeps them from
    // competing with hero assets for connections.
    image.fetchPriority = 'low';
    image.src = framePath(index);
    return image;
  });
}

// 60 images is ~2.6MB of fetching and decoding. Starting that at init means it
// runs *through* the preloader animation, stealing main-thread time from the
// thing the user is actually looking at. Wait until the preloader is gone.
function whenPreloaderDone(callback) {
  if (window.preloaderFinished) {
    callback();
    return;
  }
  window.addEventListener('preloader:complete', callback, { once: true });
}

export function initFooterSequence() {
  const root = document.querySelector('.footer-sequence');
  if (!root) return;

  const inner = root.querySelector('.footer-sequence__inner');
  const canvas = root.querySelector('.footer-sequence__canvas');

  if (!inner || !canvas) {
    console.warn('[Footer Sequence] Unexpected .footer-sequence structure', root);
    return;
  }

  const context = canvas.getContext('2d');
  if (!context) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let frames = [];

  let currentFrame = 0;
  let targetFrame = 0;
  let driftX = 0;
  let driftY = 0;
  let targetDriftX = 0;
  let targetDriftY = 0;
  let aspectApplied = false;
  let running = false;

  function sizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    // Cap DPR at 2 — 60 frames at 3x on a phone is a lot of fill rate for a
    // decorative element.
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(rect.width * ratio);
    const height = Math.round(rect.height * ratio);

    if (canvas.width === width && canvas.height === height) return;

    canvas.width = width;
    canvas.height = height;
  }

  // The frames are a fixed aspect; let the first one that decodes drive the
  // element's shape rather than hardcoding it in Webflow.
  function applyAspect(image) {
    if (aspectApplied || !image.naturalWidth || !image.naturalHeight) return;
    aspectApplied = true;
    inner.style.aspectRatio = `${image.naturalWidth} / ${image.naturalHeight}`;
    sizeCanvas();
  }

  function draw(index) {
    const image = frames[Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(index)))];
    if (!image || !image.complete || !image.naturalWidth) return;

    applyAspect(image);
    if (canvas.width <= 0 || canvas.height <= 0) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    // contain-fit, so a mismatch between the element box and the frame aspect
    // letterboxes rather than stretching.
    const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;

    context.drawImage(
      image,
      (canvas.width - drawWidth) / 2,
      (canvas.height - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
  }

  function tick() {
    currentFrame += (targetFrame - currentFrame) * SCRUB_EASE;
    driftX += (targetDriftX - driftX) * DRIFT_EASE;
    driftY += (targetDriftY - driftY) * DRIFT_EASE;

    draw(currentFrame);
    gsap.set(inner, { x: driftX, y: driftY });

    const settled =
      Math.abs(targetFrame - currentFrame) < 0.01 &&
      Math.abs(targetDriftX - driftX) < 0.01 &&
      Math.abs(targetDriftY - driftY) < 0.01;

    if (settled) {
      running = false;
      return;
    }

    requestAnimationFrame(tick);
  }

  function requestTick() {
    if (running) return;
    running = true;
    requestAnimationFrame(tick);
  }

  // Horizontal position across the viewport scrubs the sequence; the same
  // point drives the drift so the two never fight each other.
  function aimAt(clientX, clientY) {
    const positionX = clientX / window.innerWidth;
    const positionY = clientY / window.innerHeight;

    targetFrame = Math.max(0, Math.min(1, positionX)) * (FRAME_COUNT - 1);
    targetDriftX = (positionX - 0.5) * 2 * DRIFT;
    targetDriftY = (positionY - 0.5) * 2 * DRIFT;

    requestTick();
  }

  function onPointerMove(event) {
    // Touch is handled separately below — pointer events for touch stop firing
    // the moment the browser claims the gesture for scrolling.
    if (event.pointerType === 'touch') return;
    aimAt(event.clientX, event.clientY);
  }

  function onTouch(event) {
    const touch = event.touches[0];
    if (!touch) return;
    aimAt(touch.clientX, touch.clientY);
  }

  // Mobile plays the sequence on a timer instead of scrubbing it, so this
  // drives currentFrame directly — the easing in tick() exists to chase a
  // pointer target and would only smear a constant-rate advance.
  let autoplayLast = performance.now();
  let autoplayPosition = 0;
  let onScreen = false;

  function autoplay(now) {
    requestAnimationFrame(autoplay);

    const elapsed = (now - autoplayLast) / 1000;
    autoplayLast = now;

    // The footer is the last thing on the page. Without this the loop repaints
    // a canvas nobody can see for as long as the user is anywhere above it.
    if (!onScreen) return;

    // Yoyo by folding a double-length cycle back on itself, rather than
    // flipping a direction flag at the ends: a flag has to be tested against a
    // bound that a long frame can overshoot, which sticks the sequence at one
    // end. This cannot overshoot — position is derived, never accumulated
    // against a limit.
    const span = FRAME_COUNT - 1;
    autoplayPosition = (autoplayPosition + Math.min(elapsed, 0.25) * AUTOPLAY_FPS) % (span * 2);
    currentFrame = span - Math.abs(autoplayPosition - span);

    draw(currentFrame);
  }

  function startAutoplay() {
    new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) autoplayLast = performance.now();
      },
      { rootMargin: '10%' }
    ).observe(root);

    requestAnimationFrame(autoplay);
  }

  whenPreloaderDone(() => {
    frames = loadFrames();

    // First frame that decodes sets the shape and paints something
    // immediately, rather than waiting for the pointer to move.
    frames[0].decode?.().then(() => draw(0)).catch(() => undefined);
    frames.forEach((image) => {
      image.addEventListener('load', () => draw(currentFrame), { once: true });
    });
  });

  sizeCanvas();

  const resizeObserver = new ResizeObserver(() => {
    sizeCanvas();
    draw(currentFrame);
  });
  resizeObserver.observe(canvas);

  if (reduceMotion) {
    draw(0);
    gsap.set(inner, { yPercent: 0 });
    return;
  }

  const isMobile = window.matchMedia(MOBILE_QUERY).matches;

  if (isMobile) {
    startAutoplay();
  } else {
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // Desktop only now. Touch scrubbing was how a phone drove this — the finger
    // as pointer, including the swipe that scrolls the page — but that meant
    // the animation only existed while someone was actively dragging, and it
    // ran backwards as often as forwards.
    window.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
  }

  // Rises out from behind the section's clipped edge once the footer is well
  // into view. Plays on its own timing rather than scrubbing, so the entrance
  // reads the same regardless of how fast the page is scrolled.
  //
  // scale rides along in the same set so it composes into the one matrix gsap
  // maintains for this element; tick()'s set only names x/y, so it survives.
  gsap.set(inner, { yPercent: 100, opacity: 0, scale: isMobile ? MOBILE_SCALE : 1 });
  gsap
    .timeline({
      scrollTrigger: {
        trigger: '.section_bf-footer',
        start: 'top 60%',
        toggleActions: 'play none none reverse',
      },
    })
    // power2.out over a longer run reads softer than a hard power3 snap, and
    // the short opacity fade takes the hard edge off the moment it clears the
    // parent's overflow clip.
    .to(inner, { yPercent: 0, duration: 1.6, ease: 'power2.out' }, 0)
    .to(inner, { opacity: 1, duration: 0.7, ease: 'power1.out' }, 0);

  ScrollTrigger.addEventListener('refresh', () => {
    sizeCanvas();
    draw(currentFrame);
  });
}
