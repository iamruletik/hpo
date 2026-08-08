import { gsap } from '../core/gsap.js';
import SplitType from 'split-type';

function normalizeIndex(index, length) {
  if (!length) return 0;
  if (index < 0) return length - 1;
  if (index >= length) return 0;
  return index;
}

export function initTabs() {
  // Runs via Webflow's own ready queue rather than our defer/module timing,
  // since this code depends on Webflow's CMS-bound markup (.w-dyn-item) being
  // fully rendered first — a real cross-library ordering need, not dead code.
  window.Webflow ||= [];
  window.Webflow.push(() => {
    const platformRoot = document.querySelector('[data-platform]');
    if (!platformRoot || platformRoot.dataset.platformInitialized === 'true') return;
    platformRoot.dataset.platformInitialized = 'true';

    const tabs = Array.from(platformRoot.querySelectorAll('[data-layer-tab]')).sort(
      (a, b) => Number(a.getAttribute('data-layer-index') || 0) - Number(b.getAttribute('data-layer-index') || 0)
    );
    const cards = Array.from(platformRoot.querySelectorAll('[data-card]'));
    const eyebrow = platformRoot.querySelector('.eyebrow');
    const cardEntries = cards.map((card) => ({ card, item: card.closest('.w-dyn-item') || card }));
    const heroTitle = platformRoot.querySelector('[data-hero-title]');
    const prevButton = platformRoot.querySelector('[data-layer-prev]');
    const nextButton = platformRoot.querySelector('[data-layer-next]');

    const modal = document.querySelector('[data-modal]');
    const modalOverlay = document.querySelector('[data-modal-overlay]');
    const modalClose = document.querySelector('[data-modal-close]');
    const modalPanel = modal ? modal.querySelector('.platform-modal-panel') : null;
    const modalImage = document.querySelector('[data-modal-render-image]');
    const modalTitle = document.querySelector('[data-modal-render-title]');
    const modalClientBullets = document.querySelector('[data-modal-render-client-bullets]');
    const modalCompanyBullets = document.querySelector('[data-modal-render-company-bullets]');

    if (!tabs.length || !cards.length || !heroTitle) return;

    let currentIndex = (() => {
      const defaultIndex = tabs.findIndex((tab) => tab.getAttribute('data-layer-default') === 'true');
      return defaultIndex >= 0 ? defaultIndex : 0;
    })();

    let tabTransition = null;
    let heroTitleSplit = null;
    let eyebrowSplit = null;
    let modalTimeline = null;
    let modalTitleSplit = null;
    let lastFocusedCard = null;

    function revertModalTitleSplit() {
      modalTitleSplit?.revert();
      modalTitleSplit = null;
    }

    function getHeroTitleLines() {
      return heroTitleSplit?.lines?.length ? heroTitleSplit.lines : [heroTitle];
    }

    function updateHeroTitle(index) {
      const rawLine = tabs[index].getAttribute('data-hero-line') || '';

      heroTitleSplit?.revert();
      heroTitleSplit = null;

      heroTitle.innerHTML = rawLine
        ? rawLine
            .trim()
            .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
            .replace(/<br\s*\/?>/gi, '<br>')
            .replace(/\s*\|\s*/g, '<br>')
        : '';

      gsap.set(heroTitle, { opacity: 1, y: 0, clearProps: 'filter' });

      heroTitleSplit = new SplitType(heroTitle, { types: 'lines', lineClass: 'hero-line' });
      heroTitleSplit.lines.forEach((line) => {
        const mask = document.createElement('div');
        mask.classList.add('hero-line-mask');
        line.parentNode.insertBefore(mask, line);
        mask.appendChild(line);
      });
      gsap.set(heroTitleSplit.lines, { yPercent: 0, opacity: 1 });
    }

    function setActiveTabUI(activeIndex) {
      tabs.forEach((tab, index) => {
        const isActive = index === activeIndex;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        tab.setAttribute('tabindex', isActive ? '0' : '-1');
      });
    }

    function setActiveCards(index) {
      const layerKey = tabs[index].getAttribute('data-layer-key');
      cardEntries.forEach(({ card, item }) => {
        const isVisible = card.getAttribute('data-card-layer') === layerKey;
        item.classList.toggle('is-hidden', !isVisible);
        card.classList.toggle('is-hidden', !isVisible);
      });
    }

    function getVisibleCards() {
      return cardEntries.filter(({ item }) => !item.classList.contains('is-hidden')).map(({ card }) => card);
    }

    function enableNavButtons() {
      if (!prevButton || !nextButton) return;
      prevButton.classList.remove('is-disabled');
      nextButton.classList.remove('is-disabled');
      prevButton.setAttribute('aria-disabled', 'false');
      nextButton.setAttribute('aria-disabled', 'false');
    }

    function goToTab(targetIndex) {
      const nextIndex = normalizeIndex(targetIndex, tabs.length);
      if (nextIndex === currentIndex && !tabTransition) return;

      tabTransition?.kill();
      tabTransition = null;

      const outLines = getHeroTitleLines();
      const outCards = getVisibleCards();
      gsap.killTweensOf(outLines);
      gsap.killTweensOf(outCards);

      currentIndex = nextIndex;
      setActiveTabUI(currentIndex);
      enableNavButtons();

      tabTransition = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          updateHeroTitle(currentIndex);
          setActiveCards(currentIndex);

          const inLines = getHeroTitleLines();
          const inCards = getVisibleCards();
          gsap.set(inLines, { yPercent: 110, opacity: 1 });
          gsap.set(inCards, { x: -28, opacity: 0, filter: 'blur(8px)' });

          tabTransition = gsap.timeline({
            defaults: { ease: 'power4.out' },
            onComplete: () => {
              gsap.set(inLines, { clearProps: 'transform' });
              gsap.set(inCards, { clearProps: 'transform,filter,opacity' });
              tabTransition = null;
            },
          });
          tabTransition.to(inLines, { yPercent: 0, duration: 0.72, stagger: 0.065 });
          tabTransition.to(inCards, { x: 0, opacity: 1, filter: 'blur(0px)', duration: 0.5, stagger: 0.06 }, '-=0.46');
        },
      });

      tabTransition.to(outLines, { yPercent: -110, duration: 0.38, stagger: 0.045, ease: 'power4.inOut' });
      tabTransition.to(outCards, { x: -18, opacity: 0, filter: 'blur(8px)', duration: 0.22, stagger: 0.025 }, '<0.03');
    }

    function closeCardModal() {
      if (!modal || !modal.classList.contains('is-open')) return;

      modalTimeline?.kill();
      modalTimeline = null;

      const columns = Array.from(modal.querySelectorAll('.platform-modal-column'));
      const titleLines = modalTitleSplit ? modalTitleSplit.lines : [];
      const listItems = Array.from(modal.querySelectorAll('[data-modal-render-client-bullets] li, [data-modal-render-company-bullets] li'));
      const toKill = [modalOverlay, modalPanel, ...columns, ...titleLines, ...listItems].filter(Boolean);
      gsap.killTweensOf(toKill);

      modalTimeline = gsap.timeline({
        onComplete: () => {
          modal.classList.remove('is-open');
          modal.setAttribute('aria-hidden', 'true');
          document.body.classList.remove('is-platform-modal-open');
          revertModalTitleSplit();
          gsap.set(listItems, { clearProps: 'transform,opacity,visibility' });
          if (modalPanel) gsap.set(modalPanel, { clearProps: 'transform,opacity,visibility' });
          modalTimeline = null;
          lastFocusedCard?.focus?.({ preventScroll: true });
          lastFocusedCard = null;
        },
      });

      if (titleLines.length) {
        modalTimeline.to(titleLines, { yPercent: 35, autoAlpha: 0, duration: 0.25, ease: 'power2.in', stagger: { each: 0.01, from: 'end' } }, 0);
      }
      if (listItems.length) {
        modalTimeline.to(listItems, { y: 8, autoAlpha: 0, duration: 0.2, ease: 'power2.in', stagger: { each: 0.008, from: 'end' } }, 0);
      }
      if (modalPanel) {
        modalTimeline.to(modalPanel, { y: window.innerWidth <= 768 ? 24 : 42, autoAlpha: 0, duration: 0.36, ease: 'power3.in' }, 0);
      }
      if (modalOverlay) {
        modalTimeline.to(modalOverlay, { opacity: 0, duration: 0.3, ease: 'power2.out' }, 0.08);
      }
    }

    function openCardModal(cardElement) {
      if (!modal || !cardElement || modal.classList.contains('is-open')) return;

      lastFocusedCard = document.activeElement;

      const modalData = cardElement.querySelector('.card-modal-data');
      const dataTitle = modalData?.querySelector('[data-modal-title]') || null;
      const dataImage = modalData?.querySelector('[data-modal-image]') || null;
      const dataClientBullets = modalData?.querySelector('[data-client-bullets]') || null;
      const dataCompanyBullets = modalData?.querySelector('[data-company-bullets]') || null;
      const cardTitle = cardElement.querySelector('.platform-card-title');
      const cardImage = cardElement.querySelector('.platform-card-image');

      if (modalTitle) {
        const titleAttr = dataTitle ? dataTitle.getAttribute('data-modal-title') : '';
        modalTitle.innerHTML = titleAttr || (dataTitle ? dataTitle.innerHTML : '') || (cardTitle ? cardTitle.innerHTML : '');
      }

      if (modalImage) {
        const sourceImage = dataImage || cardImage;
        if (sourceImage) {
          modalImage.src = sourceImage.currentSrc || sourceImage.src || '';
          modalImage.alt = sourceImage.alt || '';
          if (sourceImage.srcset) modalImage.srcset = sourceImage.srcset;
          else modalImage.removeAttribute('srcset');
          if (sourceImage.sizes) modalImage.sizes = sourceImage.sizes;
          else modalImage.removeAttribute('sizes');
        } else {
          modalImage.removeAttribute('src');
          modalImage.removeAttribute('srcset');
          modalImage.removeAttribute('sizes');
          modalImage.alt = '';
        }
      }

      if (modalClientBullets) modalClientBullets.innerHTML = dataClientBullets ? dataClientBullets.innerHTML : '';
      if (modalCompanyBullets) modalCompanyBullets.innerHTML = dataCompanyBullets ? dataCompanyBullets.innerHTML : '';

      modalTimeline?.kill();
      modalTimeline = null;
      revertModalTitleSplit();

      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-platform-modal-open');

      let titleLines = [];
      if (modalTitle && modalTitle.textContent.trim()) {
        modalTitleSplit = new SplitType(modalTitle, { types: 'lines', lineClass: 'platform-modal-title-line' });
        modalTitleSplit.lines.forEach((line) => {
          const mask = document.createElement('span');
          mask.className = 'platform-modal-title-line-mask';
          line.parentNode.insertBefore(mask, line);
          mask.appendChild(line);
        });
        titleLines = modalTitleSplit.lines;
      }

      const columns = Array.from(modal.querySelectorAll('.platform-modal-column'));
      const listItems = Array.from(modal.querySelectorAll('[data-modal-render-client-bullets] li, [data-modal-render-company-bullets] li'));
      const toKill = [modalOverlay, modalPanel, ...columns, ...titleLines, ...listItems].filter(Boolean);
      gsap.killTweensOf(toKill);

      if (modalOverlay) gsap.set(modalOverlay, { opacity: 0 });
      if (modalPanel) gsap.set(modalPanel, { y: window.innerWidth <= 768 ? 32 : 56, autoAlpha: 0 });
      gsap.set(titleLines, { yPercent: 110, autoAlpha: 0.8 });
      gsap.set(listItems, { y: 12, autoAlpha: 0 });

      modalTimeline = gsap.timeline({
        onComplete: () => {
          modalTimeline = null;
          modalClose?.focus({ preventScroll: true });
        },
      });

      if (modalOverlay) modalTimeline.to(modalOverlay, { opacity: 1, duration: 0.38, ease: 'power2.out' }, 0);
      if (modalPanel) modalTimeline.to(modalPanel, { y: 0, autoAlpha: 1, duration: 0.72, ease: 'power4.out' }, 0.02);
      if (titleLines.length) modalTimeline.to(titleLines, { yPercent: 0, autoAlpha: 1, duration: 0.72, ease: 'power4.out', stagger: 0.08 }, 0.22);
      if (listItems.length) modalTimeline.to(listItems, { y: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out', stagger: 0.06 }, 0.4);
    }

    function bindInteractions() {
      setActiveTabUI(currentIndex);
      updateHeroTitle(currentIndex);
      setActiveCards(currentIndex);
      enableNavButtons();

      tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => goToTab(index));
        tab.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            goToTab(index);
          }
        });
      });

      cardEntries.forEach(({ card }) => {
        card.addEventListener('click', () => {
          if (card.getAttribute('data-card-layer') === 'layer-1') openCardModal(card);
        });
      });

      prevButton?.addEventListener('click', () => goToTab(currentIndex - 1));
      nextButton?.addEventListener('click', () => goToTab(currentIndex + 1));
      modalClose?.addEventListener('click', closeCardModal);
      modalOverlay?.addEventListener('click', closeCardModal);

      document.addEventListener('keydown', (event) => {
        const isModalOpen = modal && modal.classList.contains('is-open');

        if (event.key === 'Escape') {
          closeCardModal();
          return;
        }

        if (!isModalOpen) {
          if (event.key === 'ArrowRight') goToTab(currentIndex + 1);
          if (event.key === 'ArrowLeft') goToTab(currentIndex - 1);
        }
      });

      if (eyebrow) {
        eyebrowSplit?.revert();
        eyebrowSplit = new SplitType(eyebrow, { types: 'chars', charClass: 'eyebrow-char' });
        gsap.set(eyebrowSplit.chars, { yPercent: 120, opacity: 0 });
      }

      // Entrance reveal, triggered once the platform hero scrolls into view.
      const heroLines = getHeroTitleLines();
      const visibleCards = getVisibleCards();
      const eyebrowChars = eyebrowSplit?.chars || [];

      gsap.set(heroLines, { yPercent: 110, opacity: 1 });

      gsap.to(eyebrowChars, {
        yPercent: 0,
        opacity: 1,
        duration: 0.55,
        stagger: 0.025,
        ease: 'power4.out',
        scrollTrigger: { trigger: '.platform-hero', start: 'bottom+=200 bottom', once: true },
        onComplete: () => gsap.set(eyebrowChars, { clearProps: 'transform,opacity' }),
      });

      gsap.fromTo(
        '.pl-item',
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.4,
          stagger: 0.1,
          ease: 'power4.out',
          delay: 0.5,
          scrollTrigger: { trigger: '.platform-hero', start: 'bottom+=200 bottom', once: true },
          onComplete: () => gsap.set(visibleCards, { clearProps: 'transform,filter,opacity' }),
        }
      );

      gsap.fromTo(
        visibleCards,
        { y: -12, opacity: 0, filter: 'blur(8px)' },
        {
          y: 0,
          opacity: 1,
          filter: 'blur(0px)',
          duration: 0.4,
          stagger: 0.1,
          ease: 'power4.out',
          delay: 0.8,
          scrollTrigger: { trigger: '.platform-hero', start: 'bottom+=200 bottom', once: true },
          onComplete: () => gsap.set(visibleCards, { clearProps: 'transform,filter,opacity' }),
        }
      );

      gsap.to(heroLines, {
        yPercent: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power4.out',
        stagger: 0.1,
        scrollTrigger: { trigger: '.platform-hero', start: 'bottom bottom', once: true },
        onComplete: () => gsap.set(heroLines, { clearProps: 'transform,opacity' }),
      });
    }

    if (document.fonts?.ready) document.fonts.ready.then(bindInteractions);
    else bindInteractions();
  });
}
