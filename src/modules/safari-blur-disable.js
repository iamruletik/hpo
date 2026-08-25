// The progressive-blur stack behind the nav is 7 layered backdrop-filters,
// always active, over scrolling content — exactly the combination
// safari-webkit-gotchas.md flags as an FPS killer (backdrop-filter repaints
// every frame on scroll; Safari can't hardware-accelerate stacked instances
// of it the way Chromium does). Cheaper to drop the effect on Safari
// entirely than to try to make 7 blur layers cheap there.
export function initSafariBlurDisable() {
  const userAgent = navigator.userAgent;
  const isSafari = /Safari/i.test(userAgent) && !/Chrome|Chromium|CriOS|Edg|EdgiOS|OPR|FxiOS/i.test(userAgent);
  if (!isSafari) return;

  document.querySelector('.progressive-blur-wrapper')?.remove();
}
