// Two stacks of layered backdrop-filters, both removed on Safari. backdrop-filter
// repaints every frame on scroll there, and Safari cannot hardware-accelerate
// stacked instances of it the way Chromium does — cheaper to drop the effect
// than to try to make it cheap.
//
// .progressive-blur-wrapper is the strip under the nav: 7 layers, blur 32px down
// to 0, over a scrolling page. It was briefly collapsed to a single layer here
// rather than removed, on the theory that one backdrop-filter over a small fixed
// strip was affordable. It is not; it goes.
//
// .hero_hardware-blur is 5 layers at blur(6/14/26/42/64px), built in JS by
// hero-text-split.js. Worse than the nav's on both counts: bigger radii, and it
// sits over the hero video, so its backdrop is invalidated every frame the video
// advances rather than only on scroll.
//
// Both are position:absolute or fixed, so removing them shifts no layout. Doing
// it here — before hero-text-split.js runs — also means buildProgressiveBlur()
// never builds its layers at all; that module already guards both its uses on
// the container existing.
// .hero_hardware-blur is removed outright: 5 layers at blur(6/14/26/42/64px)
// over the hero video, so its backdrop is invalidated every frame the video
// advances rather than only on scroll. Nothing sits behind it that needs
// covering.
//
// .progressive-blur-wrapper is kept, collapsed to a single 1px layer.
//
// Removing it entirely was tried and left something visible at the top of the
// screen that the strip had been covering. Replacing it with a white gradient
// was also tried: it does not substitute, because a blur softens what is behind
// it while a white wash lightens it, and over the hero video that read as a
// large white band.
//
// 1px is not free — backdrop-filter forces a backdrop snapshot and a filter pass
// per frame at any radius, and the radius only scales the blur work itself. But
// one layer at 1px against seven running 32px down to 0 is most of the saving,
// and it keeps a backdrop-filter element at the top edge, which is what Safari
// 26 samples to tint the toolbar strip.
const REMOVE = '.hero_hardware-blur';
const COLLAPSE = '.progressive-blur-wrapper';

const RADIUS = 1;

export function initSafariBlurDisable() {
  const userAgent = navigator.userAgent;
  const isSafari = /Safari/i.test(userAgent) && !/Chrome|Chromium|CriOS|Edg|EdgiOS|OPR|FxiOS/i.test(userAgent);
  if (!isSafari) return;

  document.querySelector(REMOVE)?.remove();

  const layers = document.querySelectorAll(`${COLLAPSE} .blur-filter`);
  if (!layers.length) return;

  // Keep the first, drop the rest.
  layers.forEach((layer, index) => {
    if (index > 0) layer.remove();
  });

  const [layer] = layers;
  layer.style.backdropFilter = `blur(${RADIUS}px)`;
  layer.style.webkitBackdropFilter = `blur(${RADIUS}px)`;
  // The stylesheet masks each layer to its own band of the stack — nth-child(1)
  // clears at 40%. With the others gone that leaves a hard edge, so this one
  // covers the full strip and fades out at the bottom instead.
  const mask = 'linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%)';
  layer.style.mask = mask;
  layer.style.webkitMask = mask;
}
