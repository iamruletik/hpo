// Two separate stacks of layered backdrop-filters, both of which Safari
// handles badly — backdrop-filter repaints every frame on scroll, and Safari
// can't hardware-accelerate stacked instances of it the way Chromium does.
//
// They get different treatment because they cost different amounts:
//
// .progressive-blur-wrapper (nav) is 7 layers, blur 32px down to 0, over a
// scrolling page. Collapsed to a single layer rather than dropped — one
// backdrop-filter is cheap enough, and the fixed 100-160px strip under the nav
// is small. The survivor's blur and mask are set inline so the ramp still
// reads as a gradient without the other six; leaving it on the stylesheet's
// nth-child(1) rule would keep blur(32px) and a mask that clears at 40%,
// which without the layers below it ends in a visible hard band.
//
// .hero_hardware-blur is 5 layers at blur(6/14/26/42/64px), built in JS by
// hero-text-split.js. Removed outright: the radii go to 64px, and it sits over
// the hero video, so its backdrop is invalidated every frame the video
// advances rather than only on scroll. It is position:absolute, so removing it
// shifts nothing, and doing it here — before hero-text-split.js runs — means
// buildProgressiveBlur() never builds the layers at all. That module already
// guards both its uses on the container existing.
const NAV_BLUR_WRAPPER = '.progressive-blur-wrapper';
const HERO_BLUR_STACK = '.hero_hardware-blur';

const NAV_BLUR_RADIUS = 20;
const NAV_BLUR_MASK = 'linear-gradient(to bottom, black 0%, black 35%, transparent 100%)';

function collapseNavBlur(wrapper) {
  const layers = [...wrapper.querySelectorAll('.blur-filter')];
  if (!layers.length) return;

  layers.slice(1).forEach((layer) => layer.remove());

  const [layer] = layers;
  layer.style.backdropFilter = `blur(${NAV_BLUR_RADIUS}px)`;
  layer.style.webkitBackdropFilter = `blur(${NAV_BLUR_RADIUS}px)`;
  layer.style.mask = NAV_BLUR_MASK;
  layer.style.webkitMask = NAV_BLUR_MASK;
}

export function initSafariBlurDisable() {
  const userAgent = navigator.userAgent;
  const isSafari = /Safari/i.test(userAgent) && !/Chrome|Chromium|CriOS|Edg|EdgiOS|OPR|FxiOS/i.test(userAgent);
  if (!isSafari) return;

  const navBlur = document.querySelector(NAV_BLUR_WRAPPER);
  if (navBlur) collapseNavBlur(navBlur);

  document.querySelector(HERO_BLUR_STACK)?.remove();
}
