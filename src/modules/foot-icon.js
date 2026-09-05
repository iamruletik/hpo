import { gsap, ScrollTrigger } from '../core/gsap.js';

// The every-chamber foot icon, played from a sprite sheet on a canvas.
//
// Replaces a pair of <video> elements that carried the same animation twice
// over — an HEVC .mp4 for Safari and a VP9 .webm for Chrome, because those are
// the only two browser codecs carrying an alpha channel, and this artwork is a
// shape on transparency. Two encodes, two decoder sessions, 882kB, and a
// runtime branch to choose between them. A WebP sheet has alpha natively, so
// all of that collapses into one file every engine reads the same way.
//
// Drawn with canvas rather than CSS background-position: walking a 2D grid in
// CSS needs two nested steps() animations, and the reveal-then-loop handoff
// needs a frame range rather than a fixed cycle. A source rect gives both.
const ANIMATION = '[data-foot-animation]';

// The grid MUST divide the sheet exactly. The first sheet was 3615x3470 over
// 25x24, i.e. 144.6 x 144.583 per cell, and that is what made the sprite shake
// on iOS: every frame's source origin landed on a different sub-pixel phase
// (0, 144.6, 289.2, 433.8 …), so the GPU resampled each one at a different
// offset. Rounding in the player only moves the compromise around — rounding
// origins and flooring sizes are two different errors and neither makes the
// phases agree. An integer grid removes the question: every origin is a
// multiple of the cell and every frame samples an identically aligned box.
//
// scripts/resquare-spritesheet.mjs rebuilds a sheet to an exact grid if a new
// export ever comes back fractional.
const SHEET = {
  src: 'https://storage.googleapis.com/radiance/hpo/spritesheet-144-tight-28.webp',
  width: 4032,
  height: 3024,
  columns: 28,
  rows: 21,
};

const CELL_WIDTH = SHEET.width / SHEET.columns;
const CELL_HEIGHT = SHEET.height / SHEET.rows;

const COLUMNS = SHEET.columns;

// The 28x21 grid holds 588 cells; only the first 584 are artwork. The remaining
// four pad the grid out and must never be drawn.
const FRAME_COUNT = 584;

// Source numbering is 1-based: reveal is 1..164, loop is 165..584. Stored
// 0-based, so the reveal ends at index 163 and the loop starts at 164.
const REVEAL_END = 164;
const FPS = 30;

// No rounding needed — with an exact grid these are integers by construction.
function cellAt(index) {
  const column = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  return { x: column * CELL_WIDTH, y: row * CELL_HEIGHT };
}

export function initFootIcon() {
  const wrappers = gsap.utils.toArray(ANIMATION);
  if (!wrappers.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  wrappers.forEach((wrapper) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'foot-icon-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    wrapper.append(canvas);

    const context = canvas.getContext('2d');
    if (!context) return;

    const sheet = new Image();
    // Decorative and far below the fold — should not compete with hero assets.
    sheet.decoding = 'async';
    sheet.fetchPriority = 'low';

    let ready = false;
    let frame = 0;
    let last = 0;
    let running = false;
    let onScreen = false;

    function size() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      // Capped at 2: the cell is only 144px, so asking for 3x device pixels
      // upscales further from the same source and buys nothing but fill rate.
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(rect.width * ratio);
      const height = Math.round(rect.height * ratio);
      if (canvas.width === width && canvas.height === height) return;

      canvas.width = width;
      canvas.height = height;
    }

    function draw() {
      if (!ready || !canvas.width) return;

      const cell = cellAt(Math.min(frame, FRAME_COUNT - 1));
      context.clearRect(0, 0, canvas.width, canvas.height);

      // contain-fit, so a mismatch between the box and the cell letterboxes
      // rather than stretching.
      //
      // Destination stays rounded even though the source is now exact: the
      // canvas box is sized from a layout rect and a DPR, so scale lands
      // fractional regardless of how clean the sheet is.
      const scale = Math.min(canvas.width / CELL_WIDTH, canvas.height / CELL_HEIGHT);
      const w = Math.round(CELL_WIDTH * scale);
      const h = Math.round(CELL_HEIGHT * scale);

      context.drawImage(
        sheet,
        cell.x,
        cell.y,
        CELL_WIDTH,
        CELL_HEIGHT,
        Math.round((canvas.width - w) / 2),
        Math.round((canvas.height - h) / 2),
        w,
        h
      );
    }

    function tick(now) {
      if (!running) return;
      requestAnimationFrame(tick);

      if (!onScreen) {
        last = now;
        return;
      }

      const elapsed = (now - last) / 1000;
      // Clamped: a backgrounded tab returns with a huge delta and would jump
      // hundreds of frames in a single step.
      const advance = Math.floor(Math.min(elapsed, 0.25) * FPS);
      if (advance < 1) return;

      last = now;
      frame += advance;

      // Reveal plays once, then the tail loops on itself forever. Modulo of the
      // overshoot rather than a reset, so a long frame does not lose time.
      if (frame >= FRAME_COUNT) {
        frame = REVEAL_END + ((frame - REVEAL_END) % (FRAME_COUNT - REVEAL_END));
      }

      draw();
    }

    sheet.addEventListener(
      'load',
      () => {
        ready = true;
        size();
        draw();
      },
      { once: true }
    );

    sheet.src = SHEET.src;

    new ResizeObserver(() => {
      size();
      draw();
    }).observe(canvas);

    // A ~50MB decoded sheet and a rAF loop are not worth running while the
    // section is off screen.
    new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (onScreen) last = performance.now();
      },
      { rootMargin: '15%' }
    ).observe(wrapper);

    if (reduceMotion) {
      // Hold the last reveal frame; nothing animates.
      frame = REVEAL_END - 1;
      return;
    }

    ScrollTrigger.create({
      trigger: wrapper,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        if (running) return;
        running = true;
        last = performance.now();
        requestAnimationFrame(tick);
      },
    });
  });
}
