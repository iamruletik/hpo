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
// The floating .solutions-card is anchored to the bottom of this box, so it
// inherits the fix — its jumping was only ever this height changing underneath.
const SECTION = '.section_for-who';
const STICKY = '.solutions-sticky';
const MOBILE_QUERY = '(max-width: 991px)';

// How long the box takes to cross the gap. Roughly the URL bar's own transition
// — too fast reads as a snap, too slow and the card visibly lags the bar.
const DURATION = 0.28;

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

  gsap.set(sticky, { height: tall });

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
  }

  ScrollTrigger.create({
    trigger: section,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => {
      // direction is 1 scrolling down, -1 scrolling up — the same input the
      // browser uses to decide whether to retract the bar.
      const wantsTall = self.direction === 1;
      if (wantsTall === atTall) return;
      atTall = wantsTall;
      to(wantsTall ? tall : short);
    },
  });

  // Orientation change is the only thing that legitimately changes either unit.
  window.addEventListener('orientationchange', () => {
    short = measure('svh');
    tall = measure('lvh');
    gsap.set(sticky, { height: atTall ? tall : short });
    ScrollTrigger.refresh();
  });
}
