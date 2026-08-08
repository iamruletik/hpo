import { gsap } from '../core/gsap.js';

const IDLE_DASH = 0.2;
const ACTIVE_DASH = 1;

export function initArrowButton() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.arrow-button').forEach((button) => {
    if (button.dataset.arrowButtonReady === 'true') return;

    const paths = Array.from(button.querySelectorAll('.arrow-button__active path'));
    if (!paths.length) {
      console.warn('[Arrow Button] SVG paths not found', button);
      return;
    }

    button.dataset.arrowButtonReady = 'true';

    const dashState = { value: IDLE_DASH };
    let borderTween = null;
    let isPointerInside = false;
    let isKeyboardFocused = false;
    let isActive = false;

    function updateBorder() {
      const value = gsap.utils.clamp(IDLE_DASH, ACTIVE_DASH, dashState.value);
      const formattedValue = Number(value.toFixed(4));

      paths.forEach((path) => {
        path.style.strokeDasharray = `${formattedValue} 1`;
        path.style.strokeDashoffset = '0';
      });
    }

    function stopBorderTween() {
      if (!borderTween) return;
      borderTween.kill();
      borderTween = null;
    }

    function animateBorder(targetValue) {
      stopBorderTween();

      if (reduceMotion) {
        dashState.value = targetValue;
        updateBorder();
        return;
      }

      const isOpening = targetValue === ACTIVE_DASH;

      borderTween = gsap.to(dashState, {
        value: targetValue,
        duration: isOpening ? 0.62 : 0.36,
        ease: isOpening ? 'power2.inOut' : 'power3.inOut',
        overwrite: true,
        onUpdate: updateBorder,
        onComplete: () => {
          dashState.value = targetValue;
          updateBorder();
          borderTween = null;
        },
      });
    }

    function syncActiveState() {
      const nextActive = isPointerInside || isKeyboardFocused;
      if (nextActive === isActive) return;
      isActive = nextActive;
      animateBorder(isActive ? ACTIVE_DASH : IDLE_DASH);
    }

    button.addEventListener('pointerenter', (event) => {
      // Hover animation is for mouse/trackpad only — touch never leaves the border stuck active.
      if (event.pointerType === 'touch') return;
      isPointerInside = true;
      syncActiveState();
    });

    button.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'touch') return;
      isPointerInside = false;
      syncActiveState();
    });

    button.addEventListener('focus', () => {
      isKeyboardFocused = button.matches(':focus-visible');
      syncActiveState();
    });

    button.addEventListener('blur', () => {
      isKeyboardFocused = false;
      syncActiveState();
    });

    updateBorder();
  });
}
