import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';

gsap.registerPlugin(
  ScrollTrigger,
  DrawSVGPlugin,
  Draggable,
  InertiaPlugin,
  ScrollToPlugin,
  MorphSVGPlugin
);

// iOS Safari's collapsing/expanding toolbar resizes the viewport mid-scroll,
// which used to trigger a full ScrollTrigger refresh — jarring on any pinned
// section (cta pin, aim morph, solutions carousel). This was previously only
// set inside cta-parallax.js's mobile branch, so it only took effect if that
// specific module happened to run in that viewport at init. Global and
// unconditional here instead.
//
// NOT pairing this with ScrollTrigger.normalizeScroll(true) — that makes
// ScrollTrigger take over native scroll itself, which fights Lenis for
// control of the same scroll position. Two libraries both trying to drive
// scroll is worse than the toolbar jitter this is meant to fix.
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger, DrawSVGPlugin, Draggable, InertiaPlugin, ScrollToPlugin, MorphSVGPlugin };
