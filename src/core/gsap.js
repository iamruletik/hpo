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

export { gsap, ScrollTrigger, DrawSVGPlugin, Draggable, InertiaPlugin, ScrollToPlugin, MorphSVGPlugin };
