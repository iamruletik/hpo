import { gsap } from '../core/gsap.js';

const IDLE_DASH = 0.2;
const FULL_DASH = 1;

export function initButtonDemo() {
  document.querySelectorAll('.demo-button').forEach((button) => {
    const paths = Array.from(button.querySelectorAll('.demo-button__active path'));
    const texts = Array.from(button.querySelectorAll('.demo-button__text'));

    if (!paths.length || texts.length !== 2) {
      console.warn('[Button Demo] Unexpected .demo-button structure', button);
      return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let currentTextIndex = 0;
    let textTimeline = null;
    let borderTween = null;

    let isActive = false;
    let isPointerInside = false;
    let isFocused = false;

    // Numeric state for the SVG stroke-dasharray so GSAP can tween it
    // (it can't interpolate the string form directly).
    const dashState = { value: IDLE_DASH };

    function updateBorder() {
      const value = Math.max(IDLE_DASH, Math.min(FULL_DASH, dashState.value));
      const formattedValue = Number(value.toFixed(4));

      paths.forEach((path) => {
        path.style.strokeDasharray = `${formattedValue} 1`;
        path.style.strokeDashoffset = '0';
      });
    }

    updateBorder();
    gsap.set(texts[0], { yPercent: 0 });
    gsap.set(texts[1], { yPercent: 115 });

    function finishRunningTextAnimation() {
      if (!textTimeline) return;
      const timeline = textTimeline;
      textTimeline = null;
      // progress(1) can trigger onComplete, so stash the timeline first.
      timeline.progress(1);
      timeline.kill();
    }

    function rollText() {
      finishRunningTextAnimation();

      const outgoing = texts[currentTextIndex];
      const nextTextIndex = currentTextIndex === 0 ? 1 : 0;
      const incoming = texts[nextTextIndex];

      if (reduceMotion) {
        gsap.set(outgoing, { yPercent: 115 });
        gsap.set(incoming, { yPercent: 0 });
        currentTextIndex = nextTextIndex;
        window.requestChameleonButtonsUpdate?.();
        return;
      }

      gsap.set(incoming, { yPercent: 115 });

      const timeline = gsap.timeline({
        defaults: { duration: 0.5, ease: 'power4.inOut', overwrite: true },
        onUpdate: () => window.requestChameleonButtonsUpdate?.(),
        onComplete: () => {
          gsap.set(outgoing, { yPercent: 115 });
          currentTextIndex = nextTextIndex;
          window.requestChameleonButtonsUpdate?.();
          if (textTimeline === timeline) textTimeline = null;
        },
      });

      textTimeline = timeline;
      timeline.to(outgoing, { yPercent: -115 }, 0).to(incoming, { yPercent: 0 }, 0);
    }

    function stopBorderTween() {
      if (!borderTween) return;
      borderTween.kill();
      borderTween = null;
    }

    function drawBorder() {
      stopBorderTween();

      if (reduceMotion) {
        dashState.value = FULL_DASH;
        updateBorder();
        return;
      }

      borderTween = gsap.to(dashState, {
        value: FULL_DASH,
        duration: 0.62,
        ease: 'power2.inOut',
        overwrite: true,
        onUpdate: updateBorder,
        onComplete: () => {
          dashState.value = FULL_DASH;
          updateBorder();
          borderTween = null;
        },
      });
    }

    function retractBorder() {
      stopBorderTween();

      if (reduceMotion) {
        dashState.value = IDLE_DASH;
        updateBorder();
        return;
      }

      borderTween = gsap.to(dashState, {
        value: IDLE_DASH,
        duration: 0.36,
        ease: 'power3.inOut',
        overwrite: true,
        onUpdate: updateBorder,
        onComplete: () => {
          dashState.value = IDLE_DASH;
          updateBorder();
          borderTween = null;
        },
      });
    }

    function syncActiveState() {
      const nextActive = isPointerInside || isFocused;
      if (nextActive === isActive) return;
      isActive = nextActive;

      if (isActive) {
        drawBorder();
        rollText();
      } else {
        retractBorder();
      }
    }

    button.addEventListener('pointerenter', () => {
      isPointerInside = true;
      syncActiveState();
    });

    button.addEventListener('pointerleave', () => {
      isPointerInside = false;
      syncActiveState();
    });

    button.addEventListener('focus', () => {
      isFocused = true;
      syncActiveState();
    });

    button.addEventListener('blur', () => {
      isFocused = false;
      syncActiveState();
    });

    button.addEventListener('click', (event) => {
      // Remove preventDefault() once the button gets a real URL or opens a modal.
      event.preventDefault();
    });
  });
}
