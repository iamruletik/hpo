import { gsap, ScrollTrigger } from '../core/gsap.js';
import SplitType from 'split-type';

function splitWords(selector, wordClass = 'word') {
  const el = document.querySelector(selector);
  if (!el) return null;

  const split = new SplitType(el, { types: 'words', wordClass });
  split.words.forEach((word) => {
    const mask = document.createElement('span');
    mask.classList.add(`${wordClass}-mask`);
    word.parentNode.insertBefore(mask, word);
    mask.appendChild(word);
  });
  gsap.set(el, { visibility: 'visible' });

  return split;
}

function setupScrollFillText() {
  const el = document.querySelector('.scroll-fill-text');
  if (!el) return;

  const split = new SplitType(el, { types: 'lines, words, chars', lineClass: 'scroll-fill-line', wordClass: 'word', charClass: 'char' });
  const chars = split.chars;
  const lineInners = split.lines.map((line) => {
    const inner = document.createElement('span');
    inner.classList.add('scroll-fill-line-inner');
    while (line.firstChild) inner.appendChild(line.firstChild);
    line.appendChild(inner);
    return inner;
  });

  gsap.set(el, { visibility: 'visible' });
  gsap.set(chars, { color: '#bdbdbd' });
  gsap.set(lineInners, { yPercent: 100 });

  gsap.to(lineInners, {
    yPercent: 0,
    duration: 0.9,
    ease: 'power3.out',
    stagger: 0.1,
    force3D: true,
    scrollTrigger: { trigger: el, start: 'top 85%', once: true },
  });

  gsap.to(chars, {
    color: '#000000',
    duration: 1,
    ease: 'none',
    stagger: { each: 1 },
    scrollTrigger: {
      trigger: '.section_overview',
      start: 'top-=200 top',
      end: () => `+=${0.7 * window.innerHeight}`,
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
}

function revealOverviewWords(selector, scrollTriggerStart) {
  const split = splitWords(selector, 'overview-word');
  if (!split) return;

  gsap.set(split.words, { yPercent: 100 });
  gsap.to(split.words, {
    yPercent: 0,
    duration: 0.8,
    ease: 'power3.out',
    stagger: 0.08,
    scrollTrigger: { trigger: '.section_overview', start: scrollTriggerStart, once: true },
  });
}

async function runOverviewReveal() {
  setupScrollFillText();

  gsap.set('.overview_icon', { opacity: 0 });
  gsap.to('.overview_icon', {
    opacity: 1,
    duration: 0.8,
    ease: 'power3.out',
    stagger: 0.08,
    scrollTrigger: { trigger: '.section_overview', start: 'top top', once: true },
  });

  revealOverviewWords('.overview_lower', 'top top');
  revealOverviewWords('.overview_left-text', 'top-=250 top');

  ScrollTrigger.refresh();
}

export async function initOverviewReveal() {
  if (document.fonts?.ready) await document.fonts.ready;
  runOverviewReveal();
}
