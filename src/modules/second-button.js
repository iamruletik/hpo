import { gsap } from '../core/gsap.js';

export function initSecondaryButtonRoll() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const buttons = document.querySelectorAll('[data-chameleon-btn].button.is-secondary');

  buttons.forEach((button) => {
    if (button.dataset.secondaryRollReady === 'true') return;

    const label = button.querySelector('.chameleon-text');
    if (!label) {
      console.warn('[Secondary Button] .chameleon-text not found', button);
      return;
    }

    button.dataset.secondaryRollReady = 'true';

    const originalText = label.textContent.trim() || 'Explore';
    if (!button.getAttribute('aria-label')) {
      button.setAttribute('aria-label', originalText);
    }

    label.setAttribute('aria-hidden', 'true');
    label.classList.add('is-roll-label');

    let texts = Array.from(label.querySelectorAll('.demo-button__text'));

    // Auto-create the two text layers if they don't already exist.
    if (texts.length !== 2) {
      const firstText = document.createElement('span');
      const secondText = document.createElement('span');

      firstText.className = 'demo-button__text';
      secondText.className = 'demo-button__text';
      firstText.textContent = originalText;
      secondText.textContent = originalText;

      label.replaceChildren(firstText, secondText);
      texts = [firstText, secondText];
    }

    if (reduceMotion) {
      gsap.set(texts[0], { yPercent: 0 });
      gsap.set(texts[1], { yPercent: 115 });
      window.requestChameleonButtonsUpdate?.();
      return;
    }

    let currentTextIndex = 0;
    let textTimeline = null;
    let isActive = false;
    let isPointerInside = false;
    let isFocused = false;

    gsap.set(texts[0], { yPercent: 0 });
    gsap.set(texts[1], { yPercent: 115 });

    function requestChameleonUpdate() {
      window.requestChameleonButtonsUpdate?.();
    }

    function finishRunningAnimation() {
      if (!textTimeline) return;
      const timeline = textTimeline;
      textTimeline = null;
      timeline.progress(1);
      timeline.kill();
      requestChameleonUpdate();
    }

    function rollText() {
      finishRunningAnimation();

      const outgoing = texts[currentTextIndex];
      const nextTextIndex = currentTextIndex === 0 ? 1 : 0;
      const incoming = texts[nextTextIndex];

      gsap.set(incoming, { yPercent: 115 });

      const timeline = gsap.timeline({
        defaults: { duration: 0.5, ease: 'power4.inOut', overwrite: true },
        onUpdate: requestChameleonUpdate,
        onComplete: () => {
          gsap.set(outgoing, { yPercent: 115 });
          currentTextIndex = nextTextIndex;
          if (textTimeline === timeline) textTimeline = null;
          requestChameleonUpdate();
        },
      });

      textTimeline = timeline;
      timeline.to(outgoing, { yPercent: -115 }, 0).to(incoming, { yPercent: 0 }, 0);
    }

    function syncActiveState() {
      const nextActive = isPointerInside || isFocused;
      if (nextActive === isActive) return;
      isActive = nextActive;
      if (isActive) rollText();
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

    requestChameleonUpdate();
  });
}
