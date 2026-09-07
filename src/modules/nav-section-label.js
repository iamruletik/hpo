import { gsap, ScrollTrigger } from '../core/gsap.js';

// Turns the nav pill's logo slot into a "where am I" indicator: the logo while
// you are at the top, the section's own name once you are past it. Updated by
// scroll and by clicking a nav link, with the new label rising from behind a
// mask as the old one leaves through the top.
//
// Labels are read from the nav links rather than listed here, so adding a
// section in the Designer needs no code change. #hero is the exception — its
// link is the home icon and has no text, so it maps to the logo.
const WRAP = '.nav_center-logo-wrap';
const LOGO = '.nav_center-logo';
const LINK = '.nav-menu-link';

const ROLL = {
  duration: 0.42,
  ease: 'power3.out',
  // The two halves overlap: the incoming label starts before the outgoing one
  // has fully cleared, so the slot never reads as empty mid-swap.
  overlap: 0.12,
};

// Quiet period after the last scroll event before a click-initiated scroll
// counts as finished. Long enough to survive the gaps between Lenis frames,
// short enough that it does not outlast the journey.
const SETTLE_MS = 140;

// Hard release, in case a click never produces a scroll at all — clicking the
// link for the section you are already in, or a target already at the top of
// the document. Without it the lock below would never lift.
const MAX_LOCK_MS = 2500;

function buildSlot(wrap, logo) {
  // The wrap has a width but no overflow in the Designer. Both are needed: the
  // mask is what makes this a roll rather than two things fading past each
  // other, and the height has to be fixed or the box would grow to fit both
  // slots while they are on screen together.
  wrap.style.overflow = 'hidden';
  wrap.style.position = 'relative';
  wrap.style.display = 'flex';
  wrap.style.alignItems = 'center';

  const label = document.createElement('span');
  label.className = 'nav-section-label';
  // Starts below the mask. Nothing is announced from here — the nav links are
  // already the accessible route to each section, so this is decoration.
  label.setAttribute('aria-hidden', 'true');
  wrap.append(label);

  gsap.set(label, { yPercent: 100, autoAlpha: 0 });
  gsap.set(logo, { yPercent: 0, autoAlpha: 1 });

  return label;
}

export function initNavSectionLabel() {
  const wrap = document.querySelector(WRAP);
  const logo = wrap?.querySelector(LOGO);
  if (!wrap || !logo) return;

  // [href, label] for every link that points at an element on this page.
  const sections = [];

  document.querySelectorAll(LINK).forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (!href.startsWith('#') || href.length < 2) return;

    const target = document.getElementById(href.slice(1));
    if (!target) return;

    sections.push({ target, label: link.textContent.trim() });
  });

  if (!sections.length) return;

  const label = buildSlot(wrap, logo);

  // What is showing now. null means the logo.
  let current = null;
  let tween;

  // Clicking a nav link scrolls through every section between here and the
  // target, and each one's trigger fires on the way. Without this the pill
  // flickered through those names and only landed on the right one by accident
  // of it being last. The click takes ownership until its scroll settles.
  let locked = false;
  let pending;
  let settleTimer;
  let releaseTimer;

  function release() {
    locked = false;
    window.clearTimeout(settleTimer);
    window.clearTimeout(releaseTimer);

    // Apply whatever the scroll decided while it was ignored, so the pill ends
    // up agreeing with the page rather than with the click. Normally the same
    // value; not so if the target was reached from an unexpected direction, or
    // the user scrolled away mid-journey.
    if (pending !== undefined) {
      show(pending);
      pending = undefined;
    }
  }

  function lock() {
    locked = true;
    pending = undefined;
    window.clearTimeout(releaseTimer);
    releaseTimer = window.setTimeout(release, MAX_LOCK_MS);
  }

  window.addEventListener(
    'scroll',
    () => {
      if (!locked) return;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(release, SETTLE_MS);
    },
    { passive: true }
  );

  function show(next) {
    if (next === current) return;
    current = next;

    // Whichever slot is arriving; the other leaves. An empty label means we are
    // back at the top, so the logo comes home and the text goes.
    const incoming = next ? label : logo;
    const outgoing = next ? logo : label;

    if (next) label.textContent = next;

    tween?.kill();
    tween = gsap
      .timeline({ defaults: { duration: ROLL.duration, ease: ROLL.ease } })
      .to(outgoing, { yPercent: -100, autoAlpha: 0 }, 0)
      .fromTo(incoming, { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1 }, ROLL.overlap);
  }

  // Scroll-driven updates defer to an in-flight click; the click's own call
  // goes through show() directly.
  function showFromScroll(text) {
    if (locked) {
      pending = text;
      return;
    }
    show(text);
  }

  sections.forEach(({ target, label: text }) => {
    ScrollTrigger.create({
      trigger: target,
      // Switches when the section reaches the middle of the viewport rather
      // than its top edge, so the label matches what you are actually looking
      // at instead of flipping the moment a section peeks in.
      start: 'top center',
      end: 'bottom center',
      // The hero's link has no text, so it resolves to the logo on both edges.
      onEnter: () => showFromScroll(text),
      onEnterBack: () => showFromScroll(text),
    });
  });

  // Clicking a link should update the pill immediately rather than waiting for
  // the scroll to arrive — the triggers above still fire on the way and simply
  // agree with what is already showing.
  document.querySelectorAll(LINK).forEach((link) => {
    link.addEventListener('click', () => {
      lock();
      show(link.textContent.trim());
    });
  });
}
