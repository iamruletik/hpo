import { getLenis } from './lenis.js';

// Shared by every modal/overlay that needs to stop the page scrolling behind
// it (request-modal, the platform-card modal — previously each rolled its
// own, and both were incomplete: locking Lenis alone or `overflow: hidden`
// alone doesn't stop native wheel/touch/key scroll, since Lenis and the
// browser's default scroll are independent paths. See preloader.js for the
// full writeup of why.
//
// Deliberately NOT overflow: hidden on <html>/<body> — that breaks
// position: sticky for every sticky descendant on the page (documented
// incident, see preloader.js). position: fixed on body avoids it, at the
// cost of needing to capture/restore scrollY manually since — unlike the
// preloader, which always locks from the top — a modal can open mid-scroll.

let lockCount = 0;
let savedScrollY = 0;

// Containers that manage their own internal scroll while the page-level lock
// is active — platform-modal-content drags horizontally on mobile
// (platform-explorer.css), request-modal-content and solution-modal-content
// scroll vertically. Each already has its own overscroll-behavior: contain
// so a gesture that reaches their edge doesn't chain into the page behind.
const SELF_SCROLLING_SELECTOR = '.platform-modal-content, .request-modal-content, .solution-modal-content';

function isWithinSelfScrollingContainer(event) {
  return Boolean(event.target?.closest?.(SELF_SCROLLING_SELECTOR));
}

// No wheel/touchmove blockers here, deliberately — unlike the preloader
// (which has a real first-paint race before its lock engages, see
// preloader.js), lockPageScroll() below applies position: fixed to body
// synchronously, in the same tick as the click that opens the modal. The
// page is already structurally unscrollable the instant this runs; there is
// no gap left for a wheel/touchmove listener to guard.
//
// Tried adding one anyway as defense-in-depth (with a target.closest()
// exemption for the containers above) and it broke platform-modal-content's
// mobile drag-scroll on real devices — both Android and iOS, not a WebKit-
// only quirk. A non-passive touchmove listener on window forces the browser
// to run the JS handler synchronously on every touchmove before it can
// commit to native scrolling, which blocks the compositor-thread fast path
// fling/momentum scrolling depends on. Direct-manipulation drag still
// worked (each touchmove got handled and correctly skipped preventDefault),
// but the inertia phase after touchend never engaged — simulators don't
// reproduce this either way; only found it by testing real hardware.
const LOCK_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
function preventKeys(event) {
  if (!LOCK_KEYS.includes(event.key)) return;
  // Home/End/Space/arrows are also text-editing keys — never swallow them
  // while the user is actually typing (request-modal's form fields), and
  // never swallow them inside a container that's supposed to keep scrolling.
  const target = event.target;
  const isFormField = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
  if (isFormField || isWithinSelfScrollingContainer(event)) return;
  event.preventDefault();
}

export function lockPageScroll() {
  lockCount += 1;
  if (lockCount > 1) return;

  savedScrollY = window.scrollY || window.pageYOffset || 0;

  document.body.style.position = 'fixed';
  document.body.style.top = `-${savedScrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
  document.documentElement.style.overscrollBehavior = 'none';

  window.addEventListener('keydown', preventKeys);

  // Deliberately NOT calling lenis.stop() here. Lenis's own handler does
  // `if (this.isStopped || this.isLocked) { event.preventDefault(); return; }`
  // for every wheel/touch event site-wide, unconditionally — no target
  // exemption. Normally Lenis doesn't touch native touch scroll at all
  // (syncTouch: false makes it fall through further down that same
  // handler), but the stopped-check runs BEFORE that passthrough, so
  // stopping Lenis is exactly what broke platform-modal-content's touch
  // drag — same failure shape as the window-level listeners above, just
  // inside a dependency instead of our own code.
  //
  // It's redundant anyway: body { position: fixed } already makes the page
  // structurally unscrollable, so there's nothing for Lenis to visibly
  // scroll regardless of its own state. unlockPageScroll() resyncs it below
  // so its internal target/animated scroll don't drift from reality while
  // this was in effect.
}

export function unlockPageScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;

  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  document.documentElement.style.overscrollBehavior = '';

  window.removeEventListener('keydown', preventKeys);

  window.scrollTo(0, savedScrollY);
  // Lenis was never stopped (see lockPageScroll), but its cached
  // target/animated scroll can still have drifted from the real position
  // while the page was pinned — resize() re-reads the actual scroll and
  // resets both to it, which is what stops the drift from surfacing as a
  // jump on the next scroll input.
  getLenis()?.resize();
}
