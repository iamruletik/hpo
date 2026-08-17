import { gsap, ScrollTrigger } from '../core/gsap.js';
import SplitType from 'split-type';

const CONFIG = {
  duration: 0.75,
  ease: 'power3.out',
  // Scroll distance per item, as a % of viewport height. Section height is
  // viewportHeight + (count - 1) * stepVh, so with 8 items 42 meant ~394vh of
  // scrolling to get through the carousel. This is the only knob for pacing.
  stepVh: 26,
  useSnap: false,
  titleGapRem: { mobile: 1.5, desktop: 3 },
  titleActiveShiftRem: { mobile: 0.5, desktop: 2 },
  modal: {
    open: {
      backdropDuration: 0.38,
      backgroundDuration: 0.9,
      maskDuration: 0.82,
      contentDuration: 0.62,
      contentStagger: 0.045,
      contentStart: 0.18,
      contentShift: window.innerWidth <= 768 ? 20 : 54,
    },
    close: {
      backdropDuration: 0.3,
      backgroundDuration: 0.48,
      maskDuration: 0.44,
      contentDuration: 0.27,
      contentStagger: 0.01,
      contentShift: window.innerWidth <= 768 ? 20 : 46,
    },
  },
};

function getResponsiveConfig(key) {
  const value = CONFIG[key];
  if (typeof value === 'object' && value !== null && 'mobile' in value) {
    return window.innerWidth <= 768 ? value.mobile : value.desktop;
  }
  return value;
}

function remToPx(rem) {
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return rootFontSize * rem;
}

function isTouchDevice() {
  return window.matchMedia('(hover: none), (pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

// window.innerHeight is unreliable on mobile (browser chrome show/hide), so
// measure a real 100svh element instead when on a touch device.
function getViewportHeight() {
  if (!isTouchDevice()) return window.innerHeight;

  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:100svh;visibility:hidden;pointer-events:none;z-index:-9999;';
  document.documentElement.appendChild(probe);
  const height = probe.getBoundingClientRect().height;
  probe.remove();
  return Math.round(height || document.documentElement.clientHeight || window.innerHeight);
}

function restoreScrollTo(x, y) {
  window.scrollTo(x, y);
  window.lenis?.scrollTo?.(y, { immediate: true, force: true });
}

// If scroll drifted from the locked position (e.g. a focus change nudged
// it), snap back. Guards against re-entering while its own restore is in flight.
function restoreScrollPosition(modalEl) {
  if (!modalEl?._scrollState || modalEl._scrollState.restoring) return;

  const state = modalEl._scrollState;
  const currentX = window.scrollX || window.pageXOffset || 0;
  const currentY = window.scrollY || window.pageYOffset || 0;
  const driftedX = Math.abs(currentX - state.x) > 0.5;
  const driftedY = Math.abs(currentY - state.y) > 0.5;

  if (driftedX || driftedY) {
    state.restoring = true;
    restoreScrollTo(state.x, state.y);
    requestAnimationFrame(() => {
      if (modalEl._scrollState) modalEl._scrollState.restoring = false;
    });
  }
}

function revertModalTitleSplit(modalEl) {
  if (!modalEl?._titleSplit) return;
  modalEl._titleSplit.revert();
  modalEl._titleSplit = null;

  const title = modalEl.querySelector('.solution-modal-title');
  if (title) gsap.set(title, { clearProps: 'visibility,opacity,transform' });
}

function bindCloseHoverEffects(modalEl) {
  const closeButton = modalEl.querySelector('.solution-modal-close');
  if (!closeButton || closeButton.dataset.hoverReady === 'true') return;
  closeButton.dataset.hoverReady = 'true';

  gsap.set(closeButton, { transformOrigin: '50% 50%', rotation: 0, scale: 1 });

  closeButton.addEventListener('mouseenter', () => {
    gsap.to(closeButton, { rotation: 90, scale: 0.8, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
  });
  closeButton.addEventListener('mouseleave', () => {
    gsap.to(closeButton, { rotation: 0, scale: 1, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
  });
  closeButton.addEventListener('pointerdown', () => {
    gsap.to(closeButton, { scale: 0.72, duration: 0.15, ease: 'power2.out', overwrite: 'auto' });
  });
  closeButton.addEventListener('pointerup', () => {
    gsap.to(closeButton, { rotation: 90, scale: 0.8, duration: 0.25, ease: 'power3.out', overwrite: 'auto' });
  });
}

// Blocks page scroll (wheel/touch/keyboard) while the modal is locked, but
// still allows scrolling *within* .solution-modal-content specifically.
function bindScrollBlockers(modalEl) {
  if (modalEl._scrollHandlers) return;

  const scrollKeys = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

  function findScrollableContent(target) {
    return target?.closest?.('.solution-modal-content') || null;
  }

  function canScrollWithin(el, delta) {
    if (!el) return false;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 1) return false;
    if (delta < 0 && el.scrollTop <= 0) return false;
    if (delta > 0 && el.scrollTop >= maxScroll - 1) return false;
    return true;
  }

  function onWheel(event) {
    const content = findScrollableContent(event.target);
    if (!(content && canScrollWithin(content, event.deltaY))) event.preventDefault();
  }

  function onTouchStart(event) {
    if (modalEl._scrollState && event.touches?.length) {
      modalEl._scrollState.touchY = event.touches[0].clientY;
    }
  }

  function onTouchMove(event) {
    if (!modalEl._scrollState || !event.touches?.length) {
      event.preventDefault();
      return;
    }
    const currentY = event.touches[0].clientY;
    const previousY = modalEl._scrollState.touchY;
    modalEl._scrollState.touchY = currentY;

    const content = findScrollableContent(event.target);
    if (!(content && canScrollWithin(content, previousY - currentY))) event.preventDefault();
  }

  function onKeyDown(event) {
    if (!scrollKeys.has(event.key)) return;
    const content = findScrollableContent(event.target);
    if (!content) event.preventDefault();
  }

  function onWindowScroll() {
    if (modalEl._isOpenOrOpening) restoreScrollPosition(modalEl);
  }

  modalEl._scrollHandlers = { onWheel, onTouchStart, onTouchMove, onKeyDown, onWindowScroll };

  window.addEventListener('wheel', onWheel, { passive: false, capture: true });
  window.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
  window.addEventListener('keydown', onKeyDown, { capture: true });
  window.addEventListener('scroll', onWindowScroll, { passive: true });
}

function unbindScrollBlockers(modalEl) {
  const handlers = modalEl._scrollHandlers;
  if (!handlers) return;

  window.removeEventListener('wheel', handlers.onWheel, true);
  window.removeEventListener('touchstart', handlers.onTouchStart, true);
  window.removeEventListener('touchmove', handlers.onTouchMove, true);
  window.removeEventListener('keydown', handlers.onKeyDown, true);
  window.removeEventListener('scroll', handlers.onWindowScroll);
  modalEl._scrollHandlers = null;
}

function lockPageScroll(modalEl) {
  if (modalEl._scrollState) return;

  modalEl._scrollState = {
    x: window.scrollX || window.pageXOffset || 0,
    y: window.scrollY || window.pageYOffset || 0,
    restoring: false,
    touchY: 0,
  };

  gsap.killTweensOf(window);

  const sectionTrigger = modalEl._sectionTrigger;
  sectionTrigger?.getTween?.()?.kill();
  ScrollTrigger.getAll().forEach((trigger) => trigger.getTween?.()?.kill());

  if (window.lenis?.stop) {
    window.lenis.stop();
    modalEl._lenisStoppedForModal = true;
  }

  if (sectionTrigger?.disable) {
    sectionTrigger.disable(false);
    modalEl._sectionTriggerDisabled = true;
  }

  document.documentElement.classList.add('solution-modal-lock');
  document.body.classList.add('solution-modal-lock');

  bindScrollBlockers(modalEl);
}

function unlockPageScroll(modalEl) {
  if (!modalEl._scrollState) {
    modalEl._isOpenOrOpening = false;
    return;
  }

  unbindScrollBlockers(modalEl);
  const { x, y } = modalEl._scrollState;
  modalEl._scrollState = null;

  document.documentElement.classList.remove('solution-modal-lock');
  document.body.classList.remove('solution-modal-lock');

  // Double rAF: let the overflow unlock settle before re-asserting scroll position.
  requestAnimationFrame(() => {
    restoreScrollTo(x, y);
    requestAnimationFrame(() => {
      restoreScrollTo(x, y);

      if (modalEl._sectionTriggerDisabled && modalEl._sectionTrigger) {
        modalEl._sectionTrigger.enable();
        modalEl._sectionTriggerDisabled = false;
      }

      if (modalEl._lenisStoppedForModal && window.lenis?.start) {
        window.lenis.start();
        modalEl._lenisStoppedForModal = false;
      }

      modalEl._isOpenOrOpening = false;
      ScrollTrigger.update();
    });
  });
}

function getOrCreateModal() {
  let modal = document.querySelector('.solution-modal');

  if (modal) {
    if (!modal.querySelector('.solution-modal-panel-bg')) {
      modal.remove();
      modal = null;
    } else {
      bindCloseHoverEffects(modal);
      return modal;
    }
  }

  modal = document.createElement('div');
  modal.className = 'solution-modal';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="solution-modal-backdrop" data-solution-modal-close></div>
    <div class="solution-modal-panel" role="dialog" aria-modal="true" aria-labelledby="solution-modal-title">
      <div class="solution-modal-panel-bg" aria-hidden="true"></div>
      <div class="solution-modal-content-mask">
        <div class="solution-modal-inner">
          <button class="solution-modal-close" type="button" aria-label="Close" data-solution-modal-close data-modal-animate>
            <svg class="close-button-svg" width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.0204 0.292893C13.4109 -0.0975498 14.044 -0.0973872 14.4345 0.292893C14.825 0.683417 14.825 1.31643 14.4345 1.70696L8.77727 7.36321L14.4345 13.0204C14.825 13.411 14.825 14.044 14.4345 14.4345C14.044 14.825 13.411 14.825 13.0204 14.4345L7.36321 8.77727L1.70696 14.4355C1.31649 14.8257 0.683356 14.8257 0.292893 14.4355C-0.0976311 14.0449 -0.0976311 13.411 0.292893 13.0204L5.94914 7.36321L0.292893 1.70696C-0.0976311 1.31643 -0.0976311 0.683417 0.292893 0.292893C0.683417 -0.0976311 1.31643 -0.0976311 1.70696 0.292893L7.36321 5.94914L13.0204 0.292893Z" fill="black"/>
            </svg>
          </button>
          <div class="solution-modal-meta" data-modal-animate>
            <span>WHO IS IT FOR ?</span>
            <span class="solution-modal-dot"></span>
            <span class="solution-modal-category"></span>
          </div>
          <h2 id="solution-modal-title" class="solution-modal-title" data-modal-title-animate></h2>
          <div class="solution-modal-content" data-modal-animate></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener('click', (event) => {
    if (event.target.closest('[data-solution-modal-close]')) {
      event.preventDefault();
      closeSolutionModal(modal);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      event.preventDefault();
      closeSolutionModal(modal);
    }
  });

  bindCloseHoverEffects(modal);
  return modal;
}

function openSolutionModal(modalEl, item) {
  if (!modalEl || !item || modalEl.classList.contains('is-open')) return;

  const category = modalEl.querySelector('.solution-modal-category');
  const title = modalEl.querySelector('.solution-modal-title');
  const content = modalEl.querySelector('.solution-modal-content');
  const backdrop = modalEl.querySelector('.solution-modal-backdrop');
  const panelBg = modalEl.querySelector('.solution-modal-panel-bg');
  const contentMask = modalEl.querySelector('.solution-modal-content-mask');
  const animatedEls = Array.from(modalEl.querySelectorAll('[data-modal-animate]'));

  revertModalTitleSplit(modalEl);

  category.textContent = item.title || '';
  title.textContent = item.popupTitle || item.caption || item.title || '';
  content.innerHTML = item.popupHtml || '';
  content.scrollTop = 0;

  const listItems = Array.from(content.querySelectorAll('li'));

  modalEl._timeline?.kill();
  modalEl._timeline = null;
  modalEl._isOpenOrOpening = true;

  // Make it visible BEFORE the side effects. These used to run first, so a
  // throw anywhere in lockPageScroll — killing tweens, stopping Lenis,
  // disabling the pinned trigger — left the modal populated but without
  // .is-open, i.e. invisible. The next click then found stale content already
  // in place and got through, which is why it always took two.
  modalEl.classList.add('is-open');
  modalEl.setAttribute('aria-hidden', 'false');

  try {
    lockPageScroll(modalEl);
  } catch (error) {
    console.warn('[Solution Modal] Scroll lock failed; opening anyway', error);
  }

  bindCloseHoverEffects(modalEl);
  gsap.set(title, { visibility: 'hidden' });
  gsap.set(modalEl, { display: 'block' });

  let titleLines = [];
  if (title.textContent.trim()) {
    const split = new SplitType(title, { types: 'lines', lineClass: 'solution-modal-title-line' });
    modalEl._titleSplit = split;
    split.lines.forEach((line) => {
      const mask = document.createElement('span');
      mask.className = 'solution-modal-title-line-mask';
      line.parentNode.insertBefore(mask, line);
      mask.appendChild(line);
    });
    titleLines = split.lines;
  }

  gsap.killTweensOf([backdrop, panelBg, contentMask, ...animatedEls, ...titleLines, ...listItems]);
  gsap.set(backdrop, { opacity: 0 });
  gsap.set(panelBg, { scaleX: 0.018, transformOrigin: 'right center' });
  gsap.set(contentMask, { clipPath: 'inset(0% 0% 0% 98.2%)' });
  gsap.set(animatedEls, { autoAlpha: 0, x: getResponsiveConfig('modal').open.contentShift });
  gsap.set(titleLines, { yPercent: 110, autoAlpha: 0.8 });
  gsap.set(listItems, { y: 12, autoAlpha: 0 });
  gsap.set(title, { visibility: 'visible' });

  // Re-snap scroll position for a few frames to fight layout shift as the modal opens.
  let framesLeft = 8;
  (function reSnap() {
    if (!modalEl._scrollState || framesLeft <= 0) return;
    restoreScrollPosition(modalEl);
    framesLeft -= 1;
    requestAnimationFrame(reSnap);
  })();

  const openConfig = CONFIG.modal.open;
  modalEl._timeline = gsap.timeline({
    defaults: { overwrite: true },
    onComplete: () => {
      modalEl._timeline = null;
    },
  });

  modalEl._timeline.to(backdrop, { opacity: 1, duration: openConfig.backdropDuration, ease: 'power2.out' }, 0);
  modalEl._timeline.to(panelBg, { scaleX: 1, duration: openConfig.backgroundDuration, ease: 'power4.out' }, 0.02);
  modalEl._timeline.to(contentMask, { clipPath: 'inset(0% 0% 0% 0%)', duration: openConfig.maskDuration, ease: 'power4.out' }, 0.1);
  modalEl._timeline.to(
    animatedEls,
    { autoAlpha: 1, x: 0, duration: openConfig.contentDuration, ease: 'power3.out', stagger: { each: openConfig.contentStagger, from: 'start' } },
    openConfig.contentStart
  );
  modalEl._timeline.to(
    titleLines,
    { yPercent: 0, autoAlpha: 1, duration: 0.72, ease: 'power4.out', stagger: { each: 0.08, from: 'start' }, overwrite: true },
    openConfig.contentStart + 0.04
  );
  modalEl._timeline.to(
    listItems,
    { y: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out', stagger: { each: 0.06, from: 'start' }, overwrite: true },
    openConfig.contentStart + 0.22
  );
}

function closeSolutionModal(modalEl) {
  if (!modalEl || !modalEl.classList.contains('is-open')) return;

  const title = modalEl.querySelector('.solution-modal-title');
  const content = modalEl.querySelector('.solution-modal-content');
  const backdrop = modalEl.querySelector('.solution-modal-backdrop');
  const panelBg = modalEl.querySelector('.solution-modal-panel-bg');
  const contentMask = modalEl.querySelector('.solution-modal-content-mask');
  const animatedEls = Array.from(modalEl.querySelectorAll('[data-modal-animate]'));
  const titleLines = modalEl._titleSplit ? modalEl._titleSplit.lines : [];
  const listItems = content ? Array.from(content.querySelectorAll('li')) : [];

  modalEl._timeline?.kill();
  modalEl._timeline = null;
  gsap.killTweensOf([backdrop, panelBg, contentMask, ...animatedEls, ...titleLines, ...listItems]);
  gsap.set(panelBg, { transformOrigin: 'right center' });

  const closeConfig = CONFIG.modal.close;
  modalEl._timeline = gsap.timeline({
    defaults: { overwrite: true },
    onComplete: () => {
      modalEl.classList.remove('is-open');
      modalEl.setAttribute('aria-hidden', 'true');
      gsap.set(modalEl, { display: 'none' });
      revertModalTitleSplit(modalEl);
      gsap.set(animatedEls, { visibility: 'hidden' });
      if (title) gsap.set(title, { clearProps: 'visibility,opacity,transform' });

      unlockPageScroll(modalEl);

      modalEl._timeline = null;
      modalEl._sectionTrigger = null;
      modalEl._ownerSection = null;
    },
  });

  modalEl._timeline.to(
    animatedEls,
    { autoAlpha: 0, x: closeConfig.contentShift, duration: closeConfig.contentDuration, ease: 'power2.in', stagger: { each: closeConfig.contentStagger, from: 'end' } },
    0
  );
  modalEl._timeline.to(titleLines, { yPercent: 35, autoAlpha: 0, duration: 0.25, ease: 'power2.in', stagger: { each: 0.01, from: 'end' }, overwrite: true }, 0);
  modalEl._timeline.to(listItems, { y: 8, autoAlpha: 0, duration: 0.2, ease: 'power2.in', stagger: { each: 0.008, from: 'end' }, overwrite: true }, 0);
  modalEl._timeline.to(contentMask, { clipPath: 'inset(0% 0% 0% 98.2%)', duration: closeConfig.maskDuration, ease: 'power3.inOut' }, 0.025);
  modalEl._timeline.to(panelBg, { scaleX: 0.018, duration: closeConfig.backgroundDuration, ease: 'power4.in' }, 0.025);
  modalEl._timeline.to(backdrop, { opacity: 0, duration: closeConfig.backdropDuration, ease: 'power2.out' }, 0.08);
}

function setupSolutionsSection(section, sharedModal) {
  if (section.dataset.solutionsReady === 'true') return;
  section.dataset.solutionsReady = 'true';

  const cmsItems = Array.from(section.querySelectorAll('.solution-cms-item'));
  const items = cmsItems
    .map((cmsItem) => {
      const titleEl = cmsItem.querySelector('.solution-cms-title');
      const imageEl = cmsItem.querySelector('.solution-cms-img');
      const captionEl = cmsItem.querySelector('.solution-cms-caption');
      const popupTitleEl = cmsItem.querySelector('.solution-cms-popup-title');
      const popupRichEl = cmsItem.querySelector('.solution-cms-popup-rich');

      const image = (imageEl && (imageEl.currentSrc || imageEl.getAttribute('src') || imageEl.getAttribute('data-src'))) || '';

      return {
        title: titleEl ? titleEl.textContent.trim() : '',
        image,
        alt: (imageEl && imageEl.getAttribute('alt')) || '',
        caption: captionEl ? captionEl.textContent.trim() : '',
        popupTitle: popupTitleEl ? popupTitleEl.textContent.trim() : captionEl ? captionEl.textContent.trim() : '',
        popupHtml: popupRichEl ? popupRichEl.innerHTML.trim() : '',
      };
    })
    .filter((item) => item.title && item.image);

  if (!items.length) {
    console.warn('No valid .solution-cms-item found');
    return;
  }

  const count = items.length;
  const imageStage = section.querySelector('.solution-image-stage');
  const titleList = section.querySelector('.solutions-title-list');
  const captionEl = section.querySelector('.solution-caption');
  const moreButton = section.querySelector('.solution-more');
  const solutionsCard = section.querySelector('.solutions-card');
  const stepLabel = section.querySelector('.solutions-step');
  const sideLabel = section.querySelector('.solutions-label');

  if (!imageStage || !titleList) {
    console.warn('Missing .solution-image-stage or .solutions-title-list');
    return;
  }

  const modal = sharedModal;
  imageStage.innerHTML = '';
  titleList.innerHTML = '';

  const stageImages = [];
  const titleButtons = [];
  let activeIndex = -1;
  let captionSplit = null;
  let sectionTrigger = null;
  let viewportHeight = getViewportHeight();
  let viewportWidth = document.documentElement.clientWidth;
  let isScrollToActive = false;
  // False until scroll restoration and the first refresh are done with; see
  // the trigger's onUpdate.
  let isSettled = false;
  let scrollToTween = null;

  function getTitleGapPx() {
    return remToPx(getResponsiveConfig('titleGapRem'));
  }

  function setSectionHeight() {
    const stepPx = viewportHeight * (CONFIG.stepVh / 100);
    const target = viewportHeight + Math.max(count - 1, 1) * stepPx;

    // The Webflow class sets a static height so the document is the right size
    // on first paint. If it disagrees with what we compute here, the document
    // resizes the moment this runs — and on a reload partway down the page the
    // browser has already restored scroll against the old height, so the
    // pinned content lands at the wrong progress and visibly snaps once
    // ScrollTrigger refreshes. Keep the two in sync.
    const rendered = section.offsetHeight;
    if (Math.abs(rendered - target) > window.innerHeight * 0.25) {
      console.warn(
        `[Solution Carousel] .solutions-scroll height in Webflow is ${Math.round((rendered / window.innerHeight) * 100)}vh but ${count} items need ${Math.round((target / window.innerHeight) * 100)}vh. Update the class or expect a jump on reload.`,
      );
    }

    section.style.height = `${target}px`;
  }

  function updateStepLabelAndCaption(index, isInstant) {
    if (stepLabel) stepLabel.innerHTML = `${index + 1} <span>/ ${count}</span>`;

    if (!captionEl) return;

    captionSplit?.revert();
    captionSplit = null;
    captionEl.textContent = items[index].caption || '';

    if (!captionEl.textContent.trim()) return;

    captionSplit = new SplitType(captionEl, { types: 'lines', lineClass: 'line' });
    captionSplit.lines.forEach((line) => {
      const inner = document.createElement('span');
      inner.className = 'solution-caption-line-inner';
      inner.innerHTML = line.innerHTML;
      line.innerHTML = '';
      line.appendChild(inner);
    });

    const innerLines = captionEl.querySelectorAll('.solution-caption-line-inner');
    gsap.fromTo(
      innerLines,
      { yPercent: -100 },
      { yPercent: 0, duration: isInstant ? 0 : 0.65, ease: 'power3.out', stagger: isInstant ? 0 : 0.06, overwrite: true }
    );
  }

  // Walks from `from` to `to`, summing real rendered button heights (titles
  // can wrap to different line counts) to get the exact pixel offset.
  function computeTitleOffset(from, to, gapPx) {
    if (from === to) return 0;
    const direction = to > from ? 1 : -1;
    let index = from;
    let offset = 0;

    while (index !== to) {
      const next = index + direction;
      const currentHeight = titleButtons[index].offsetHeight;
      const nextHeight = titleButtons[next].offsetHeight;
      offset += (currentHeight / 2 + gapPx + nextHeight / 2) * direction;
      index = next;
    }

    return offset;
  }

  function updateTitleList(index, isInstant) {
    const gapPx = getTitleGapPx();
    const activeShift = `${getResponsiveConfig('titleActiveShiftRem')}rem`;

    titleButtons.forEach((button, buttonIndex) => {
      const isActive = buttonIndex === index;
      const distance = Math.abs(buttonIndex - index);
      const yOffset = computeTitleOffset(index, buttonIndex, gapPx);
      const opacity = isActive ? 1 : gsap.utils.clamp(0.12, 0.22, 0.22 - 0.025 * distance);
      // Stashed so the hover bump below knows what to return to. GSAP writes
      // opacity inline, so a :hover rule in CSS would never win.
      button._baseAlpha = distance > 5 ? 0 : opacity;

      button.classList.toggle('is-active', isActive);
      if (isActive) {
        button.setAttribute('aria-current', 'true');
        button.setAttribute('aria-label', `Open ${items[buttonIndex].title}`);
      } else {
        button.removeAttribute('aria-current');
        button.setAttribute('aria-label', `Show ${items[buttonIndex].title}`);
      }

      gsap.to(button, {
        yPercent: -50,
        y: yOffset,
        x: isActive ? activeShift : '0rem',
        scale: 1 - 0.018 * Math.min(distance, 3),
        autoAlpha: distance > 5 ? 0 : opacity,
        cursor: 'pointer',
        duration: isInstant ? 0 : CONFIG.duration,
        ease: CONFIG.ease,
        overwrite: true,
      });

      gsap.to(button.querySelectorAll('.solution-paren'), {
        scale: isActive ? 1 : 0,
        duration: isInstant ? 0 : 0.75 * CONFIG.duration,
        ease: CONFIG.ease,
        overwrite: true,
      });
    });
  }

  function updateSideLabel(index, isInstant) {
    if (!sideLabel || window.innerWidth <= 768) return;
    const gapPx = getTitleGapPx();
    const offset = -computeTitleOffset(0, index, gapPx);

    gsap.to(sideLabel, { y: offset, duration: isInstant ? 0 : CONFIG.duration, ease: CONFIG.ease, overwrite: true });
  }

  function updateStageImages(index, previousIndex, isInstant) {
    stageImages.forEach((image, imageIndex) => {
      const isActive = imageIndex === index;
      image.tabIndex = isActive ? 0 : -1;
      image.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      gsap.set(image, { pointerEvents: isActive ? 'auto' : 'none', cursor: isActive ? 'pointer' : 'default' });
    });

    if (isInstant || previousIndex < 0) {
      stageImages.forEach((image, imageIndex) => {
        const isActive = imageIndex === index;
        gsap.set(image, {
          autoAlpha: isActive ? 1 : 0,
          zIndex: isActive ? 2 : 0,
          yPercent: 0,
          scale: 1,
          pointerEvents: isActive ? 'auto' : 'none',
          cursor: isActive ? 'pointer' : 'default',
          clipPath: isActive ? 'inset(0% 0% 0% 0%)' : 'inset(100% 0% 0% 0%)',
        });
      });
      return;
    }

    const direction = index > previousIndex ? 1 : -1;
    const incoming = stageImages[index];
    const outgoing = stageImages[previousIndex];

    stageImages.forEach((image, imageIndex) => {
      if (imageIndex !== index && imageIndex !== previousIndex) {
        gsap.set(image, { autoAlpha: 0, zIndex: 0, pointerEvents: 'none', clipPath: 'inset(100% 0% 0% 0%)' });
      }
    });

    gsap.set(outgoing, { autoAlpha: 1, zIndex: 1, yPercent: 0, scale: 1, pointerEvents: 'none', cursor: 'default', clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.set(incoming, {
      autoAlpha: 1,
      zIndex: 2,
      yPercent: direction > 0 ? 8 : -8,
      scale: 1.04,
      pointerEvents: 'auto',
      cursor: 'pointer',
      clipPath: direction > 0 ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)',
    });

    gsap.to(incoming, { clipPath: 'inset(0% 0% 0% 0%)', yPercent: 0, scale: 1, duration: CONFIG.duration, ease: CONFIG.ease, overwrite: true });
    gsap.to(outgoing, {
      scale: 1.02,
      duration: CONFIG.duration,
      ease: CONFIG.ease,
      overwrite: true,
      onComplete: () => {
        if (activeIndex !== previousIndex) gsap.set(outgoing, { autoAlpha: 0, zIndex: 0, pointerEvents: 'none' });
      },
    });
  }

  function goToIndex(index, isInstant) {
    const clamped = gsap.utils.clamp(0, count - 1, index);
    if (clamped === activeIndex && !isInstant) return;

    const previousIndex = activeIndex;
    activeIndex = clamped;

    updateStepLabelAndCaption(clamped, isInstant);
    updateTitleList(clamped, isInstant);
    updateSideLabel(clamped, isInstant);
    updateStageImages(clamped, previousIndex, isInstant);
  }

  function openModalForIndex(index) {
    const clamped = gsap.utils.clamp(0, count - 1, index);
    modal.setAttribute('data-item-index', clamped);
    modal._sectionTrigger = sectionTrigger;
    modal._ownerSection = section;
    openSolutionModal(modal, items[clamped]);
  }

  items.forEach((item, index) => {
    const image = document.createElement('img');
    image.className = 'solution-stage-img';
    image.src = item.image;
    image.alt = item.alt || item.title;
    image.loading = 'eager';
    image.decoding = 'async';
    image.setAttribute('role', 'button');
    image.setAttribute('tabindex', '-1');
    image.setAttribute('aria-label', `Open ${item.title}`);
    image.addEventListener('click', () => {
      if (index === activeIndex) openModalForIndex(index);
    });
    image.addEventListener('keydown', (event) => {
      if (index === activeIndex && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        openModalForIndex(index);
      }
    });
    imageStage.appendChild(image);
    stageImages.push(image);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'solution-title-line';
    button.setAttribute('aria-label', item.title);
    button.innerHTML = `
      <span class="solution-paren is-first">
        <img src="https://cdn.prod.website-files.com/69d50584fecafe4b63f705ad/6a47a90b245a74ee7c3dfae7_Subtract1.svg" alt="" aria-hidden="true">
      </span>
      <span class="solution-name"></span>
      <span class="solution-paren is-second">
        <img src="https://cdn.prod.website-files.com/69d50584fecafe4b63f705ad/6a47a90b245a74ee7c3dfae7_Subtract1.svg" alt="" aria-hidden="true" style="transform: scaleX(-1);">
      </span>
    `;
    button.querySelector('.solution-name').textContent = item.title;

    // Hovering the active title should read as hovering the More button, since
    // clicking either does the same thing. Guarded to the active index so the
    // other titles do not light it up.
    // overwrite: 'auto' rather than true — it should only take over autoAlpha,
    // leaving the position/scale tween from updateTitleList running.
    const fadeTo = (value) =>
      gsap.to(button, { autoAlpha: value, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });

    button.addEventListener('mouseenter', () => {
      if (index === activeIndex) {
        moreButton?.classList.add('is-hovered');
        return;
      }
      // Skip the ones parked off-screen at zero, or they would fade in.
      if (!button._baseAlpha) return;
      fadeTo(Math.min(1, button._baseAlpha + 0.22));
    });

    button.addEventListener('mouseleave', () => {
      moreButton?.classList.remove('is-hovered');
      if (index === activeIndex || !button._baseAlpha) return;
      fadeTo(button._baseAlpha);
    });

    button.addEventListener('click', () => {
      if (modal._isOpenOrOpening) return;

      if (index === activeIndex) {
        openModalForIndex(index);
        return;
      }

      const target = gsap.utils.clamp(0, count - 1, index);

      scrollToTween?.kill();
      scrollToTween = null;
      goToIndex(target, false);

      if (!sectionTrigger || count <= 1) {
        isScrollToActive = false;
        return;
      }

      isScrollToActive = true;
      sectionTrigger.getTween?.()?.kill();

      const progress = target / (count - 1);
      const scrollTarget = sectionTrigger.start + (sectionTrigger.end - sectionTrigger.start) * progress;

      scrollToTween = gsap.to(window, {
        scrollTo: { y: scrollTarget, autoKill: false },
        duration: 0.35,
        ease: 'power2.out',
        overwrite: true,
        onComplete: () => {
          scrollToTween = null;
          isScrollToActive = false;
          goToIndex(target, false);
        },
        onInterrupt: () => {
          scrollToTween = null;
          isScrollToActive = false;
        },
      });
    });

    titleList.appendChild(button);
    titleButtons.push(button);
  });

  if (moreButton && !moreButton.innerHTML.trim()) {
    moreButton.innerHTML = `
      <span>More</span>
      <span style="font-size: 22px; line-height: 0.8;">+</span>
    `;
  }
  moreButton?.addEventListener('click', (event) => {
    event.preventDefault();
    if (activeIndex >= 0) openModalForIndex(activeIndex);
  });

  // .solution-more is hidden on mobile — the whole card stands in for it
  // there instead. Guarded to mobile only, and skips clicks already
  // handled by .solution-more itself (hidden there, but defensive anyway).
  solutionsCard?.addEventListener('click', (event) => {
    if (window.innerWidth > 768) return;
    if (event.target.closest('.solution-more')) return;
    if (activeIndex >= 0) openModalForIndex(activeIndex);
  });

  setSectionHeight();
  goToIndex(0, true);

  sectionTrigger = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    invalidateOnRefresh: true,
    // Instant, unlike onUpdate. Refresh fires after load and after scroll
    // restoration, which is exactly when the carousel would otherwise animate
    // from index 0 to wherever the page actually is.
    onRefresh: (self) => {
      if (modal._isOpenOrOpening) return;
      goToIndex(Math.round(self.progress * (count - 1)), true);
    },
    onUpdate: (self) => {
      if (modal._isOpenOrOpening || isScrollToActive) return;
      // Instant until the page has settled. On a reload partway into the
      // sticky section this module runs before the browser restores scroll, so
      // progress reads 0 and the carousel sets up on item 0. Restoration then
      // fires this handler with the real progress — animating that correction
      // is the jump. Reloading at the very top looked fine only because index 0
      // was already correct there.
      goToIndex(Math.round(self.progress * (count - 1)), !isSettled);
    },
    snap: CONFIG.useSnap && count > 1 && !isTouchDevice() && {
      snapTo: (value) => {
        // Returning `value` unchanged means "already snapped", so nothing moves.
        // Until the user has actually scrolled, that is what we want: reloading
        // partway into the section leaves you between snap points, and the
        // refresh-triggered snap would drag the page to the nearest one. That
        // is the jump. Reloading at the very top never showed it because the
        // top IS a snap point.
        if (modal._isOpenOrOpening || !isSettled) return value;
        const step = 1 / (count - 1);
        return Math.round(value / step) * step;
      },
      duration: { min: 0.18, max: 0.42 },
      delay: 0.04,
      ease: 'power2.out',
    },
  });

  // The trigger knows the real scroll position the moment it is created, so
  // adopt it before the first paint rather than starting at 0 and easing there.
  goToIndex(Math.round(sectionTrigger.progress * (count - 1)), true);

  // Settle on genuine user intent rather than `load`. ScrollTrigger refreshes
  // — and the snap that rides along with them — can fire well after load, so a
  // time-based flag still lets the initial snap through. Nothing needs to
  // animate until the user has touched the page anyway.
  const markSettled = () => {
    isSettled = true;
  };
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((type) => {
    window.addEventListener(type, markSettled, { once: true, passive: true });
  });

  const resizeRecalc = gsap
    .delayedCall(0.15, () => {
      if (modal._isOpenOrOpening) return;
      setSectionHeight();
      captionSplit?.revert();
      captionSplit = null;
      updateStepLabelAndCaption(activeIndex, true);
      updateTitleList(activeIndex, true);
      updateSideLabel(activeIndex, true);
      updateStageImages(activeIndex, activeIndex, true);
      ScrollTrigger.refresh();
    })
    .pause();

  window.addEventListener('resize', () => {
    if (modal._isOpenOrOpening) return;
    const currentWidth = document.documentElement.clientWidth;
    const widthChanged = Math.abs(currentWidth - viewportWidth) > 1;

    if (!isTouchDevice() || widthChanged) {
      viewportWidth = currentWidth;
      viewportHeight = getViewportHeight();
      resizeRecalc.restart(true);
    }
  });
}

export function initSolutionCarousel() {
  // Runs synchronously. This used to sit behind window.Webflow.push AND
  // `await document.fonts.ready`, which meant it built the section at a time
  // nobody controlled — long after main.js, and in practice after the preloader
  // had already lifted. Since it wipes and rebuilds .solution-image-stage and
  // .solutions-title-list and sets the section height, that rebuild was a
  // layout change happening in full view.
  //
  // Neither wrapper was needed: the CMS markup is server-rendered, and main.js
  // is a module script so the DOM is parsed by the time this evaluates.
  const sections = document.querySelectorAll('.solutions-scroll');
  if (!sections.length) return;

  const modal = getOrCreateModal();
  sections.forEach((section) => setupSolutionsSection(section, modal));

  // Text measurements taken before the webfonts swap are wrong, so re-measure
  // once they land. The preloader also waits on document.fonts.ready, so this
  // still resolves while the curtains are down.
  document.fonts?.ready?.then(() => {
    window.dispatchEvent(new Event('resize'));
  });
}
