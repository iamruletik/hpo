import { gsap, ScrollTrigger, MorphSVGPlugin } from '../core/gsap.js';

const FIRST_MORPH = 50;
const PAUSE = 1;
const SECOND_MORPH = 70;
const TOTAL_SCROLL = FIRST_MORPH + PAUSE + SECOND_MORPH;

const LARGE_OFFSET = '8.33vw';
const SMALL_OFFSET = '5.21vw';

const CARD_STATE_1 = ['0vw', SMALL_OFFSET, LARGE_OFFSET, LARGE_OFFSET, SMALL_OFFSET, '0vw'];
const CARD_STATE_2 = ['0vw', '0vw', '0vw', '0vw', '0vw', '0vw'];
const CARD_STATE_3 = [LARGE_OFFSET, '3.13vw', '0vw', '0vw', '3.13vw', LARGE_OFFSET];

export function initMorphSvgAim() {
  const section = document.querySelector('.section_aim');
  const svg = document.querySelector('#morphSvg');
  const shapeTop = document.querySelector('#shapeTop');
  const shapeMiddle = document.querySelector('#shapeMiddle');
  const shapeEnd = document.querySelector('#shapeEnd');
  const cards = gsap.utils.toArray('.aim-cards > .aim-card');
  const aimMedia = document.querySelector('.aim_media');

  if (!section || !svg || !shapeTop || !shapeMiddle || !shapeEnd || cards.length < 6) return;

  if (aimMedia) {
    gsap.fromTo(
      aimMedia,
      { y: '0.5vw' },
      {
        y: 0,
        ease: 'none',
        force3D: true,
        scrollTrigger: {
          trigger: section,
          start: 'top center',
          end: 'top top',
          scrub: 1,
          invalidateOnRefresh: true,
        },
      }
    );
  }

  gsap.set(cards, {
    y: (index) => CARD_STATE_1[index],
    force3D: true,
    willChange: 'transform',
  });

  // 0–50vh: State 1 → State 2, 50–51vh: pause, 51–121vh: State 2 → State 3
  const timeline = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section,
      start: 'top center',
      end: () => `+=${window.innerHeight * (TOTAL_SCROLL / 100)}`,
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });

  timeline.to(shapeTop, { morphSVG: { shape: shapeMiddle, shapeIndex: 'auto' }, duration: FIRST_MORPH }, 0);
  timeline.to(svg, { attr: { viewBox: '0 0 1644 424' }, duration: FIRST_MORPH }, 0);
  timeline.to(cards, { y: (index) => CARD_STATE_2[index], duration: FIRST_MORPH, force3D: true }, 0);

  timeline.to({}, { duration: PAUSE }, FIRST_MORPH);

  const secondAnimationStart = FIRST_MORPH + PAUSE;

  timeline.to(shapeTop, { morphSVG: { shape: shapeEnd, shapeIndex: 'auto' }, duration: SECOND_MORPH }, secondAnimationStart);
  timeline.to(svg, { attr: { viewBox: '0 0 1644 424' }, duration: SECOND_MORPH }, secondAnimationStart);
  timeline.to(cards, { y: (index) => CARD_STATE_3[index], duration: SECOND_MORPH, force3D: true }, secondAnimationStart);
}
