import { gsap, ScrollTrigger } from '../core/gsap.js';

// Keeps .solutions-sticky exactly as tall as the visible area while the mobile
// URL bar moves, without asking the browser for a number it will not give
// honestly.
//
// The problem with picking a unit: svh is the bar-visible height, so the section
// is short by the bar's height for most of the time you are in it. lvh is the
// bar-hidden height, so it overflows whenever the bar comes back. dvh tracks the
// bar, but the UA recomputes it in discrete steps rather than interpolating —
// fine on Safari, visibly late on Chrome Android, which is what you get today.
//
// So this does not follow the bar either. It animates the svh -> lvh gap on
// scroll direction, because that is what the bar itself responds to: scrolling
// down retracts it, scrolling up brings it back. Same trick as the hero
// aperture, and it lands close enough that the two move together.
//
// The floating .solutions-card is anchored to the bottom of this box, so every
// height change moved it. Worse, it moved EARLY: the trigger below reads scroll
// direction, which flips on the first pixel, while Safari only retracts its tab
// bar after a real gesture — so the card visibly jumped, then the bar caught up.
//
// It is now counter-animated. As the box grows by (tall - short), the card's
// bottom offset grows by the same amount, so it holds one position on screen
// while the box moves underneath it. Nothing about when the bar animates
// matters any more, because the card is no longer following it.
const SECTION = '.section_for-who';
const STICKY = '.solutions-sticky';
const CARD = '.solutions-card';
const MOBILE_QUERY = '(max-width: 991px)';

// How long the box takes to cross the gap. Roughly the URL bar's own transition.
const DURATION = 0.28;

// Scroll travel required before a direction change counts. ScrollTrigger's
// `direction` flips on a single pixel, so without this the box resized on every
// tiny jitter — a finger settling, a rubber-band bounce, a momentum overshoot.
// The bar itself needs a real gesture, so matching that stops the box reacting
// to movement the browser ignores.
const DIRECTION_THRESHOLD = 48;

function measure(unit) {
  const probe = document.createElement('div');
  probe.style.cssText = `position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;height:100${unit}`;
  document.body.append(probe);
  const value = probe.offsetHeight;
  probe.remove();
  return value;
}

export function initForWhoViewport() {
  const section = document.querySelector(SECTION);
  const sticky = section?.querySelector(STICKY);
  if (!section || !sticky) return;

  const mobile = window.matchMedia(MOBILE_QUERY);
  if (!mobile.matches) return;

  let short = measure('svh');
  let tall = measure('lvh');

  // Desktop and any browser without retractable chrome report the same number
  // for both. Nothing to animate, and the CSS height is already correct.
  if (tall - short < 2) return;

  const card = section.querySelector(CARD);
  // Whatever the stylesheet parks it at — 24px at this breakpoint. Read rather
  // than hardcoded so a Designer change does not silently shift it.
  const cardBase = card ? parseFloat(getComputedStyle(card).bottom) || 0 : 0;

  gsap.set(sticky, { height: tall });
  if (card) gsap.set(card, { bottom: cardBase + (tall - short) });

  let atTall = true;

  function to(height) {
    gsap.to(sticky, {
      height,
      duration: DURATION,
      ease: 'power2.out',
      overwrite: true,
      // The carousel measures this box to place the title list and the card;
      // ScrollTrigger needs the new geometry or its start/end stay stale.
      onComplete: () => ScrollTrigger.refresh(),
    });

    // Counter-move: the box's bottom edge travels (height - short), so the card
    // is pushed up by the same amount and holds still on screen. Same duration
    // and ease, so the two never separate mid-tween.
    if (card) {
      gsap.to(card, {
        bottom: cardBase + (height - short),
        duration: DURATION,
        ease: 'power2.out',
        overwrite: true,
      });
    }
  }

  // Position at the last direction flip, so the threshold measures travel since
  // then rather than total scroll.
  let pivot = window.scrollY;

  ScrollTrigger.create({
    trigger: section,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => {
      const wantsTall = self.direction === 1;

      if (wantsTall === atTall) {
        pivot = window.scrollY;
        return;
      }

      if (Math.abs(window.scrollY - pivot) < DIRECTION_THRESHOLD) return;

      atTall = wantsTall;
      pivot = window.scrollY;
      to(wantsTall ? tall : short);
    },
  });

  // Orientation change is the only thing that legitimately changes either unit.
  window.addEventListener('orientationchange', () => {
    short = measure('svh');
    tall = measure('lvh');
    const height = atTall ? tall : short;
    gsap.set(sticky, { height });
    if (card) gsap.set(card, { bottom: cardBase + (height - short) });
    ScrollTrigger.refresh();
  });
}
