import { gsap, ScrollTrigger } from '../core/gsap.js';
import SplitType from 'split-type';
import { PIN_LENGTH } from './cta-parallax.js';

// Fraction of the pinned scroll that passes before the copy comes in.
const REVEAL_AT = 0.15;

export async function initCtaReveal() {
  if (document.fonts?.ready) await document.fonts.ready;

  const section = document.querySelector('.section_cta');
  const contentWrapper = document.querySelector('.cta_content-wrapper');
  if (!section || section.dataset.textRevealReady === 'true') return;
  section.dataset.textRevealReady = 'true';

  const targets = section.querySelectorAll('.cta_title, .cta_s-copy, .cta_last-copy');
  const lines = [];

  targets.forEach((target) => {
    const split = new SplitType(target, { types: 'lines', lineClass: 'cta-line' });
    split.lines.forEach((line) => {
      const mask = document.createElement('div');
      mask.classList.add('cta-line-mask');
      line.parentNode.insertBefore(mask, line);
      mask.appendChild(line);
      lines.push(line);
    });
  });

  gsap.set(lines, { yPercent: 100, force3D: true });
  gsap.set(contentWrapper, { yPercent: 20, force3D: true });
  // CSS hides these until the lines are split and parked; see reveal-states.css.
  gsap.set(targets, { visibility: 'visible' });

  const isMedium = window.matchMedia('(max-width: 991px)').matches;
  const imageWrapper = section.querySelector('.cta_img-wrapper');

  // Desktop fires off the section: its top 70% of the way up the viewport.
  //
  // That style of rule cannot express "a moment into the pin". A start point
  // that falls inside a pinned range is pushed to the far side of it when
  // ScrollTrigger resolves positions — the section's top is glued to the
  // viewport top for the whole pin, so 'top top-=12%' could only be satisfied
  // after the pin released. Hence the progress-based trigger below: it spans
  // exactly the pinned range (same start, same '+=' distance, so no element
  // position is involved) and plays the timeline at a fraction of it.
  const timeline = gsap.timeline({
    paused: isMedium,
    scrollTrigger: isMedium ? undefined : { trigger: section, start: 'top 30%', once: true },
  });

  if (isMedium) {
    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: PIN_LENGTH,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        if (self.progress >= REVEAL_AT) timeline.play();
      },
      // Reloading below the section starts it past the threshold with no scroll
      // event to follow, so onUpdate alone would leave the copy parked.
      onRefresh: (self) => {
        if (self.progress >= REVEAL_AT) timeline.play();
      },
    });
  }

  timeline
    .to(lines, { yPercent: 0, duration: 1, stagger: 0.1, ease: 'power4.out', force3D: true }, 0)
    .to(contentWrapper, { yPercent: 0, duration: 1.4, ease: 'power4.out', force3D: true }, 0);

  // The button has no line mask to ride in on, so it just fades, a beat behind
  // the copy it sits under.
  const button = section.querySelector('.demo-button-css, .demo-button');
  if (button) {
    gsap.set(button, { autoAlpha: 0 });
    timeline.to(button, { autoAlpha: 1, duration: 0.8, ease: 'power2.out' }, 0.35);
  }

  // Scrim fades in with the copy; see the ::after in cta.css. The custom
  // property is set explicitly first — an inherited/absent one computes to an
  // empty string, which GSAP cannot read a start value from.
  if (imageWrapper) {
    gsap.set(imageWrapper, { '--cta-scrim': 0 });
    timeline.to(imageWrapper, { '--cta-scrim': 1, duration: 1.2, ease: 'power2.out' }, 0);
  }
}
