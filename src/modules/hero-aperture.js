import { gsap, ScrollTrigger } from '../core/gsap.js';
import { isPageScrollLocked } from '../core/scroll-lock.js';

// The white plane the hero video is seen through. This element is the HOLE; the
// box-shadow paints the plane around it, so opening the hole is a transform on
// one box and the video behind it is never touched.
//
// The height is animated as part of the same scroll timeline rather than
// tracked against the live viewport. This does not follow the URL bar at all:
// it grows from the small viewport to the large one over the same scroll that
// opens the hole, so scrolling down guarantees the tall height and scrolling up
// guarantees the short one. The bar moves on the same gesture, so the two agree
// closely enough, and both endpoints are exactly right.
//
// It also sidesteps the reason the plane was being cut off at the bottom:
// WebKit clips a position:fixed layer to the layout viewport, and box-shadow is
// the one thing here that paints outside its own box. At the open end this box
// is a full lvh, so its bottom edge IS the bottom of the layout viewport and
// nothing needs to paint below it.
const CONTAINER = '.hero-video-container';

// 'shadow' — one box, plane painted by a 400vmax box-shadow. Best animation of
//            the three: border-radius is a real animatable property, so the
//            corners genuinely un-round. Its plane will not paint past iOS 26's
//            floating address bar, because a shadow paints outside its box.
//            (outline is no help — it is also drawn outside the border edge, so
//            the same clip cuts it.)
// 'slices'  — the same plane from eight real element boxes. Reaches past the
//            bar, but corners can only translate out of frame; they cannot
//            un-round, so the radius does not animate.
// 'hybrid'  — shadow, plus one real bottom bar covering the strip the shadow
//            cannot reach. Keeps the border-radius animation and fixes the only
//            place the clip is visible.
//
// 'auto' resolves to hybrid on Safari and plain shadow everywhere else: the
// clip is a WebKit behaviour and Chrome paints the shadow to the bottom of the
// screen on its own, so the extra element is dead weight there. Set one of the
// three explicitly to force it while testing.
const MODE = 'auto';

function resolveMode() {
  if (MODE !== 'auto') return MODE;

  // Chrome/Chromium also match "Safari" in their UA string, so both must be
  // excluded — same test as safari-blur-disable.js.
  const userAgent = navigator.userAgent;
  const isSafari =
    /Safari/i.test(userAgent) && !/Chrome|Chromium|CriOS|Edg|EdgiOS|OPR|FxiOS/i.test(userAgent);

  return isSafari ? 'hybrid' : 'shadow';
}

const APERTURE = {
  // Width of the white plane around the hole at rest, in px.
  inset: 8,
  radius: '2.5rem',
  // Slices need the radius as a number: the corner pieces are sized in px and
  // their mask circle has to match. 2.5rem against Webflow's fluid root would
  // drift, so it is stated once here rather than derived.
  radiusPx: 40,
  duration: 1.1,
  ease: 'power3.inOut',
  start: 'top+=100 top',
};

// Slices only, and deliberately ONE curve for every piece. Bars and corners
// both start at position 0, so any difference in ease reads as one of them
// starting late — power3.inOut holds almost still through its first third while
// power2.inOut leaves immediately, which looked like the plane lagging behind
// its own corners. Softer than APERTURE.ease overall: raise toward
// power3.inOut for a lazier start, drop toward power1.inOut for a brisker one.
const SLICE_EASE = 'power2.inOut';

// Viewport units cannot be read back off a custom property — getPropertyValue
// hands back the unresolved token. A throwaway element sized in the unit and
// measured is the only reliable way to get the number into JS.
function measure(unit) {
  const probe = document.createElement('div');
  probe.style.cssText = `position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;height:100${unit}`;
  document.body.append(probe);
  const value = probe.offsetHeight;
  probe.remove();
  return value;
}

function make(className) {
  const el = document.createElement('div');
  el.className = className;
  el.setAttribute('aria-hidden', 'true');
  // Every piece is a direct child of body. Nesting them under a shared
  // transformed wrapper would make that wrapper their containing block and
  // collapse them back into one clipped layer.
  document.body.append(el);
  return el;
}

// The original: one box, plane painted by a 400vmax box-shadow.
//
// In hybrid mode a single real bottom bar rides along. The shadow already
// paints the rounded bottom corners and the strip immediately under the hole —
// the bar only exists to carry that white further down, past the line where the
// clip stops the shadow dead. Its top edge tracks the hole's bottom edge, so
// they never separate, and it overhangs the screen so there is no lower edge to
// get wrong.
function buildShadow(vars, withBottomBar) {
  const aperture = make('hero-aperture');
  const { inset, radius, radiusPx, closedHeight, openHeight, startScaleX } = vars;

  const from = { y: inset, height: closedHeight, scaleX: startScaleX, borderRadius: radius };
  const to = { y: 0, height: openHeight, scaleX: 1, borderRadius: '0rem' };

  if (!withBottomBar) {
    return {
      timeline: gsap.timeline({ defaults: { ease: APERTURE.ease } }).fromTo(aperture, from, to, 0),
    };
  }

  document.documentElement.style.setProperty('--slice-radius', `${radiusPx}px`);
  const bottom = make('hero-slice hero-slice--bottom');

  const closedBottom = () => closedHeight() + inset;
  const openBottom = () => openHeight();

  const timeline = gsap.timeline({ defaults: { ease: APERTURE.ease } });
  timeline.fromTo(aperture, from, to, 0).fromTo(bottom, { y: closedBottom }, { y: openBottom }, 0);

  return { timeline };
}

// The alternative: plane painted by real element boxes. Four bars squeeze the
// hole open on one axis each; four corners only ever translate, so the radius
// stays exactly as authored rather than squashing under a non-uniform scale,
// and they fade out at the end instead of un-rounding.
function buildSlices(vars) {
  const { inset, radiusPx, closedHeight, openHeight } = vars;

  document.documentElement.style.setProperty('--slice-inset', `${inset}px`);
  document.documentElement.style.setProperty('--slice-radius', `${radiusPx}px`);

  const top = make('hero-slice hero-slice--top');
  const bottom = make('hero-slice hero-slice--bottom');
  const left = make('hero-slice hero-slice--left');
  const right = make('hero-slice hero-slice--right');

  const tl = make('hero-corner hero-corner--tl');
  const tr = make('hero-corner hero-corner--tr');
  const bl = make('hero-corner hero-corner--bl');
  const br = make('hero-corner hero-corner--br');

  // Hole bottom edge: inset above the small viewport when closed, flush with
  // the large one when open. The bottom bar's top edge rides that line.
  const closedBottom = () => closedHeight() + inset;
  const openBottom = () => openHeight();

  // A corner cannot un-round: scaling it to nothing would squash the radius
  // into an ellipse on the way, which is the whole reason these are separate
  // pieces. Instead each one travels outward past its own corner of the screen,
  // so the curve slides off and leaves a square corner behind. That reads as
  // the hole opening rather than the plane dissolving — a plain opacity fade
  // was the previous attempt and it looked exactly like what it was.
  //
  // +1 so the piece is fully clear rather than resting flush on the edge.
  const gone = radiusPx + 1;

  // x is signed per side: the right-hand pieces are anchored to right:0, so
  // positive x moves them outward, negative inward.
  //
  // The ease has to be stated. Without it every tween falls back to gsap's
  // default power1.out, which spends most of its motion in the first few
  // frames. One curve for the whole timeline — see SLICE_EASE.
  const timeline = gsap.timeline({ defaults: { ease: SLICE_EASE } });

  timeline
    .fromTo(top, { scaleY: 1 }, { scaleY: 0 }, 0)
    .fromTo(left, { scaleX: 1 }, { scaleX: 0 }, 0)
    .fromTo(right, { scaleX: 1 }, { scaleX: 0 }, 0)
    .fromTo(bottom, { y: closedBottom }, { y: openBottom }, 0)

    .fromTo(tl, { x: inset, y: inset }, { x: -gone, y: -gone }, 0)
    .fromTo(tr, { x: -inset, y: inset }, { x: gone, y: -gone }, 0)
    .fromTo(
      bl,
      { x: inset, y: () => closedBottom() - radiusPx },
      { x: -gone, y: () => openBottom() + 1 },
      0
    )
    .fromTo(
      br,
      { x: -inset, y: () => closedBottom() - radiusPx },
      { x: gone, y: () => openBottom() + 1 },
      0
    );

  return { timeline };
}

export function initHeroAperture() {
  const container = document.querySelector(CONTAINER);
  if (!container) return;

  const vars = {
    inset: APERTURE.inset,
    radius: APERTURE.radius,
    radiusPx: APERTURE.radiusPx,
    // Closed height leaves the inset on top and bottom; open height is the full
    // large viewport. On desktop svh === lvh, so that leg is a no-op there and
    // only the inset comes off.
    closedHeight: () => measure('svh') - APERTURE.inset * 2,
    openHeight: () => measure('lvh'),
    startScaleX: () => (window.innerWidth - APERTURE.inset * 2) / window.innerWidth,
  };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const mode = resolveMode();
  const built = mode === 'slices' ? buildSlices(vars) : buildShadow(vars, mode === 'hybrid');

  // Every mode ends up as a paused timeline driven by one ScrollTrigger, so the
  // duration, the reduced-motion path and the resize guard below are shared
  // rather than repeated per branch.
  const timeline = built.timeline.duration(APERTURE.duration).pause();

  const scrollTrigger = {
    trigger: 'body',
    start: APERTURE.start,
    // onEnter only. The reverse used to ride along as the fourth toggleAction,
    // but a modal pins the page with body{position:fixed} (core/scroll-lock.js),
    // which makes window.scrollY read 0 for as long as it is open —
    // indistinguishable from a real scroll to the top, so the frame closed
    // itself behind the modal and replayed its whole open on close.
    //
    // Reversing is still right when the user genuinely scrolls back up, so it
    // stays; it just asks whether a lock is holding the page first.
    toggleActions: 'play none none none',
    onLeaveBack: () => {
      if (isPageScrollLocked()) return;
      timeline.reverse();
    },
    // Deliberately off. ScrollTrigger refreshes on every resize, a URL bar
    // collapsing fires resize, and re-reading the from-values mid-tween is what
    // made the animation snap back to its start mid-scroll.
    invalidateOnRefresh: false,
  };

  if (reduced) {
    // Straight to the open state, no scroll binding.
    timeline.progress(1);
    return;
  }

  ScrollTrigger.create({ ...scrollTrigger, animation: timeline });

  const animation = timeline;

  // svh, lvh and the width only change on a real resize — orientation, or a
  // desktop window drag. A collapsing URL bar changes none of them, which is
  // the whole point of measuring the units instead of the live viewport.
  let width = window.innerWidth;

  window.addEventListener('resize', () => {
    if (window.innerWidth === width) return;
    width = window.innerWidth;
    animation.invalidate();
    animation.scrollTrigger?.refresh();
  });
}
