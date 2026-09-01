import { getLenis, SELF_SCROLLING_SELECTOR } from './lenis.js';

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

// body { position: fixed } makes window.scrollY read 0 for as long as a lock is
// held, and ScrollTrigger cannot tell that apart from the user scrolling back to
// the top — so every scroll-driven animation sees a jump to zero and reacts.
//
// Anything whose reverse would be wrong in that situation asks here first. It is
// a getter rather than an exported flag so callers always read the live value
// instead of a copy captured at import time.
export function isPageScrollLocked() {
  return lockCount > 0;
}

// Fired on the transition in and out of a lock, for the cases the boolean above
// cannot serve. A tween that reacts at one moment (the aperture's reverse) can
// just ask the getter; a scrubbed tween writes a value on every update, so it
// has to be stopped outright or it will drive itself to zero and stay there.
//
// Dispatched BEFORE body is pinned and AFTER the scroll is restored, so a
// listener that disables its trigger never sees the bogus position at either
// end.
const LOCK_EVENT = 'scroll-lock:change';

function notify(locked) {
  window.dispatchEvent(new CustomEvent(LOCK_EVENT, { detail: { locked } }));
}

export function onPageScrollLockChange(handler) {
  window.addEventListener(LOCK_EVENT, (event) => handler(event.detail.locked));
}

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

// overflow: clip was tried as a replacement for the pin below — it stops
// scrolling like overflow: hidden but does not establish a scroll container, so
// it should not have broken position: sticky, and window.scrollY would have kept
// telling the truth for the whole lock. It did not hold: clip removes the
// browser's scrollport, but Lenis drives scroll through its own path and carried
// on regardless. The pin stays.
//
// stopLenis is opt-in per caller rather than always-on. Lenis's stopped branch
// preventDefaults every wheel and touch event, and the containers listed in
// SELF_SCROLLING_SELECTOR are exempted from it by the `prevent` option in
// lenis.js — but only those. Anything else that needs to scroll while a lock is
// held would still be swallowed, so callers say when it is safe for them.
// The two are alternatives, not a belt-and-braces pair. A stopped Lenis already
// swallows every wheel and touch event, so pinning body on top of it buys
// nothing and costs the thing that caused two visible bugs: a pinned body makes
// window.scrollY read 0, and no scroll-driven animation can tell that apart from
// a real jump to the top.
let stoppedLenis = false;
let pinned = false;

export function lockPageScroll({ stopLenis = false } = {}) {
  lockCount += 1;
  if (lockCount > 1) return;

  // Lenis's handler does
  // `if (this.isStopped || this.isLocked) { event.preventDefault(); return; }`
  // for every wheel/touch event site-wide with no target exemption, and that is
  // what broke platform-modal-content's touch drag when stop() was called
  // unconditionally here. The exemption exists now: lenis.js passes a `prevent`
  // option covering SELF_SCROLLING_SELECTOR, and Lenis evaluates it and returns
  // BEFORE reaching that branch. It still only covers those containers, which is
  // why this stays opt-in.
  const lenis = stopLenis ? getLenis() : null;

  // No Lenis instance means no Lenis lock — initLenis() returns null under
  // prefers-reduced-motion, and there the page still scrolls natively. Falling
  // back to the pin rather than leaving it unlocked.
  stoppedLenis = Boolean(lenis);
  pinned = !stoppedLenis;

  savedScrollY = window.scrollY || window.pageYOffset || 0;

  // Before the pin, so anything that disables itself does so while the scroll
  // position is still real — one update at scrollY 0 is all it takes for a
  // scrub to write its start value. A no-op on the Lenis path, where scrollY
  // never lies, but listeners are cheap and symmetry is worth more.
  notify(true);

  if (stoppedLenis) {
    lenis.stop();
  } else {
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }

  document.documentElement.style.overscrollBehavior = 'none';
  window.addEventListener('keydown', preventKeys);
}

export function unlockPageScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;

  document.documentElement.style.overscrollBehavior = '';
  window.removeEventListener('keydown', preventKeys);

  if (stoppedLenis) {
    // Nothing was moved, so there is no scroll to restore and nothing for
    // Lenis to have drifted from.
    getLenis()?.start();
    stoppedLenis = false;
  }

  if (pinned) {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    pinned = false;

    window.scrollTo(0, savedScrollY);
    // Lenis's cached target/animated scroll can still have drifted from the
    // real position while the page was pinned — resize() re-reads the actual
    // scroll and resets both to it, which is what stops the drift from
    // surfacing as a jump on the next scroll input.
    getLenis()?.resize();
  }

  // Last, once the real position is back — a trigger re-enabled any earlier
  // would read 0 and jump before settling.
  notify(false);
}
