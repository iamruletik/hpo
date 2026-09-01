// Holds .section_platform-explorer still for a short beat before the page
// carries on. Nothing animates during the hold — the stick IS the effect.
//
// position:sticky rather than a ScrollTrigger pin: no measurement, no pin
// spacer, no refresh to get wrong on a resize, and the browser drives it on the
// compositor instead of GSAP writing a transform every frame.
//
// The wrapper is the whole trick. A sticky element sticks until the bottom of
// its CONTAINING BLOCK, so left as a direct child of .main it would stay put
// for the entire rest of the page. Wrapped in a box that is exactly its own
// height plus HOLD, it releases after exactly HOLD pixels.
//
// Built here rather than in the Designer only because the wrapper has no
// purpose in the layout — it is a scroll-distance device, and an empty div in
// the Navigator invites someone to "tidy" it away.
const SECTION = '.section_platform-explorer';
const WRAPPER_CLASS = 'platform-explorer-sticky';

export function initPlatformExplorerSticky() {
  const section = document.querySelector(SECTION);
  if (!section) return;

  // Idempotent: a second call (hot reload in dev) must not nest wrappers.
  if (section.parentElement?.classList.contains(WRAPPER_CLASS)) return;

  const wrapper = document.createElement('div');
  wrapper.className = WRAPPER_CLASS;

  section.parentNode.insertBefore(wrapper, section);
  wrapper.append(section);
}
