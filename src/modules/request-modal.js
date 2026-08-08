import { gsap } from '../core/gsap.js';

const REQUIRED_FIELD_IDS = ['WorkEmail', 'FirstName', 'LastName', 'Company-Name'];

const AUTOCOMPLETE_MAP = {
  WorkEmail: 'email',
  FirstName: 'given-name',
  LastName: 'family-name',
  'Company-Name': 'organization',
};

export function initRequestModal() {
  const modal = document.querySelector('.request-modal');
  if (!modal || modal.dataset.modalReady === 'true') return;
  modal.dataset.modalReady = 'true';

  const modalContent = modal.querySelector('.request-modal-content');
  const form = modal.querySelector('form');
  const closeWrapper = modal.querySelector('.request-modal-close-wrapper');
  const cancelButton = modal.querySelector('.form-cancel-button');
  const sendButton = modal.querySelector('.form-send-button');

  if (!modalContent || !form || !closeWrapper || !cancelButton || !sendButton) return;

  let isOpen = false;
  let isClosing = false;
  let previouslyFocusedElement = null;
  let savedScrollY = 0;

  form.noValidate = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-hidden', 'true');
  modalContent.setAttribute('role', 'document');
  closeWrapper.setAttribute('role', 'button');
  closeWrapper.setAttribute('tabindex', '0');
  closeWrapper.setAttribute('aria-label', 'Close modal');
  cancelButton.setAttribute('role', 'button');
  cancelButton.setAttribute('tabindex', '0');

  const inputs = Array.from(form.querySelectorAll('.modal-input'));

  // Wrap each raw input in a .modal-field with placeholder/error elements,
  // unless it's already wrapped (Webflow markup here ships plain inputs).
  const fields = inputs.map((input) => {
    const existingField = input.closest('.modal-field');
    if (existingField) {
      return { input, field: existingField, error: existingField.querySelector('.modal-error') };
    }

    const field = document.createElement('div');
    const rawPlaceholder = input.getAttribute('placeholder') || '';
    const isRequired = input.required || rawPlaceholder.includes('*');

    field.className = 'modal-field';
    field.dataset.field = input.id || input.name || 'field';
    input.parentNode.insertBefore(field, input);
    field.appendChild(input);
    input.style.gridColumn = '';
    input.style.gridRow = '';

    const labelText = rawPlaceholder.replace(/\*/g, '').trim();
    input.setAttribute('placeholder', '');
    input.setAttribute('aria-label', labelText);

    const placeholder = document.createElement('span');
    placeholder.className = 'modal-placeholder';
    const label = document.createElement('span');
    label.textContent = labelText;
    placeholder.appendChild(label);

    if (isRequired) {
      const star = document.createElement('em');
      star.className = 'modal-placeholder-star';
      star.textContent = '*';
      placeholder.appendChild(star);
    }

    const error = document.createElement('div');
    const errorId = `${input.id || input.name || 'field'}-modal-error`;
    error.className = 'modal-error';
    error.id = errorId;
    error.setAttribute('aria-live', 'polite');

    field.appendChild(placeholder);
    field.appendChild(error);
    input.setAttribute('aria-describedby', errorId);
    input.setAttribute('aria-invalid', 'false');

    return { input, field, error };
  });

  function findField(input) {
    return fields.find((entry) => entry.input === input);
  }

  function getValidationError(input) {
    const value = input.value.trim();
    const isRequired = REQUIRED_FIELD_IDS.includes(input.id) || input.required;

    if (isRequired && !value) return 'The field must be filled in';
    if (input.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value)) return 'Invalid text';
    return '';
  }

  function updateHasValue(input) {
    const entry = findField(input);
    entry?.field.classList.toggle('has-value', input.value.trim().length > 0);
  }

  function validateField(input, showError = true) {
    const entry = findField(input);
    if (!entry) return true;

    updateHasValue(input);
    const error = getValidationError(input);
    const isValid = !error;

    if (showError) {
      entry.field.classList.toggle('is-invalid', !isValid);
      if (entry.error) entry.error.textContent = error;
      input.setAttribute('aria-invalid', String(!isValid));
    }

    return isValid;
  }

  function allRequiredValid() {
    return fields.filter(({ input }) => REQUIRED_FIELD_IDS.includes(input.id)).every(({ input }) => !getValidationError(input));
  }

  function updateSendButtonState() {
    const canSend = allRequiredValid();
    sendButton.classList.toggle('is-active', canSend);
    sendButton.setAttribute('aria-disabled', String(!canSend));
  }

  function validateForm() {
    let firstInvalid = null;
    let isValid = true;

    fields.forEach(({ input }) => {
      if (!validateField(input, true)) {
        isValid = false;
        firstInvalid ??= input;
      }
    });

    updateSendButtonState();

    if (firstInvalid) {
      firstInvalid.focus({ preventScroll: true });
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return isValid;
  }

  function lockScroll() {
    savedScrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.width = '100%';
    window.lenis?.stop?.();
  }

  function unlockScroll() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.width = '';
    window.scrollTo(0, savedScrollY);
    window.lenis?.start?.();
  }

  function openModal(trigger = null) {
    if (isOpen) return;
    isOpen = true;
    isClosing = false;
    previouslyFocusedElement = trigger || document.activeElement;

    lockScroll();
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.setAttribute('aria-hidden', 'false');

    const firstInput = form.querySelector('.modal-input');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      modal.style.opacity = '1';
      firstInput?.focus({ preventScroll: true });
      return;
    }

    gsap.killTweensOf([modal, modalContent]);
    gsap.set(modal, { opacity: 0 });
    gsap.set(modalContent, { y: 32, scale: 0.97, opacity: 0, transformOrigin: 'center bottom' });

    gsap
      .timeline({ onComplete: () => firstInput?.focus({ preventScroll: true }) })
      .to(modal, { opacity: 1, duration: 0.25, ease: 'power2.out' })
      .to(modalContent, { y: 0, scale: 1, opacity: 1, duration: 0.6, ease: 'power4.out', clearProps: 'transform' }, 0.05);
  }

  function finishClose() {
    modal.style.display = 'none';
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
    modal.setAttribute('aria-hidden', 'true');
    unlockScroll();
    isOpen = false;
    isClosing = false;
    previouslyFocusedElement?.focus?.({ preventScroll: true });
  }

  function closeModal() {
    if (!isOpen) return;
    isClosing = true;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      finishClose();
      return;
    }

    gsap.killTweensOf([modal, modalContent]);
    gsap
      .timeline({ onComplete: finishClose })
      .to(modalContent, { y: 20, scale: 0.98, opacity: 0, duration: 0.3, ease: 'power3.in' })
      .to(modal, { opacity: 0, duration: 0.25, ease: 'power2.in' }, 0.05);
  }

  // Marks closing before the click fires (on pointerdown), so the blur
  // handler doesn't flash a validation error while the modal is dismissing.
  function markClosing() {
    if (isOpen) isClosing = true;
  }

  fields.forEach(({ input }) => {
    const autocomplete = AUTOCOMPLETE_MAP[input.id];
    if (autocomplete) input.setAttribute('autocomplete', autocomplete);
  });

  fields.forEach(({ input }) => {
    updateHasValue(input);

    input.addEventListener('input', () => {
      updateHasValue(input);
      const entry = findField(input);
      if (entry?.field.classList.contains('is-invalid')) validateField(input, true);
      updateSendButtonState();
    });

    input.addEventListener('blur', () => {
      if (isClosing || !isOpen) return;
      if (REQUIRED_FIELD_IDS.includes(input.id) || input.value.trim()) validateField(input, true);
      updateSendButtonState();
    });
  });

  form.addEventListener(
    'submit',
    (event) => {
      if (!validateForm()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      sendButton.classList.remove('is-active');
      sendButton.setAttribute('aria-disabled', 'true');
    },
    true
  );

  closeWrapper.addEventListener('pointerdown', markClosing);
  cancelButton.addEventListener('pointerdown', markClosing);
  modal.addEventListener('pointerdown', (event) => {
    if (event.target === modal) markClosing();
  });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-request-modal-open]');
    if (trigger) {
      event.preventDefault();
      openModal(trigger);
    }
  });

  closeWrapper.addEventListener('click', closeModal);
  cancelButton.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (isOpen && event.key === 'Escape') {
      event.preventDefault();
      isClosing = true;
      closeModal();
    }
  });

  [closeWrapper, cancelButton].forEach((element) => {
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        isClosing = true;
        closeModal();
      }
    });
  });

  updateSendButtonState();
  modal.style.display = 'none';
  modal.style.visibility = 'hidden';
  modal.style.opacity = '0';
}
