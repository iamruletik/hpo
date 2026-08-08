import { ScrollTrigger } from '../core/gsap.js';
import { getElementTheme, findOverlappingThemedElements, computeGradientStops } from '../core/theme.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const THEMES = {
  light: {
    primaryText: '#ffffff',
    primaryIdleBorder: 'rgba(255, 255, 255, 0.12)',
    primaryActiveBorder: '#ffffff',
    secondaryText: '#1e1e1e',
    secondaryBackground: '#ffffff',
  },
  dark: {
    primaryText: '#000000',
    primaryIdleBorder: 'rgba(0, 0, 0, 0.12)',
    primaryActiveBorder: '#000000',
    secondaryText: '#ffffff',
    secondaryBackground: '#1e1e1e',
  },
};

function getThemeColor(theme, colorType) {
  return THEMES[theme]?.[colorType] ?? THEMES.light[colorType];
}

function ensureGradient(svg, gradientId) {
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS(SVG_NS, 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }

  svg.querySelector(`#${gradientId}`)?.remove();

  const gradient = document.createElementNS(SVG_NS, 'linearGradient');
  const viewBox = svg.viewBox?.baseVal;
  const y1 = viewBox?.y ?? 0;
  const height = viewBox?.height || 57;

  gradient.setAttribute('id', gradientId);
  gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
  gradient.setAttribute('x1', '0');
  gradient.setAttribute('y1', String(y1));
  gradient.setAttribute('x2', '0');
  gradient.setAttribute('y2', String(y1 + height));
  defs.appendChild(gradient);

  return gradient;
}

function setSvgGradientStops(gradient, stops) {
  gradient.replaceChildren();
  stops.forEach(({ percentage, color }) => {
    const stop = document.createElementNS(SVG_NS, 'stop');
    stop.setAttribute('offset', `${percentage}%`);
    stop.setAttribute('stop-color', color);
    gradient.appendChild(stop);
  });
}

function stopsToLinearGradientCss(stops) {
  if (!stops.length) return 'none';
  const gradientStops = stops.map(({ percentage, color }) => `${color} ${percentage}%`).join(', ');
  return `linear-gradient(to bottom, ${gradientStops})`;
}

function getTextLayers(label) {
  if (!label) return [];
  const texts = Array.from(label.querySelectorAll('.demo-button__text'));
  return texts.length ? texts : [label];
}

// Clears the label container's own background/color overrides so it never
// carries background-clip: text — only the individual text layers should.
function resetLabelBackground(label) {
  if (!label) return;
  label.style.background = 'none';
  label.style.backgroundImage = 'none';
  label.style.backgroundClip = 'border-box';
  label.style.webkitBackgroundClip = 'border-box';
  label.style.color = 'inherit';
  label.style.webkitTextFillColor = 'currentColor';
}

function setSolidTextColor(textEl, color) {
  textEl.style.backgroundImage = 'none';
  textEl.style.background = 'none';
  textEl.style.backgroundRepeat = '';
  textEl.style.backgroundPosition = '';
  textEl.style.backgroundSize = '';
  textEl.style.backgroundClip = 'border-box';
  textEl.style.webkitBackgroundClip = 'border-box';
  textEl.style.color = color;
  textEl.style.webkitTextFillColor = color;
}

function setGradientTextColor(textEl, stops) {
  textEl.style.backgroundImage = stopsToLinearGradientCss(stops);
  textEl.style.backgroundRepeat = 'no-repeat';
  textEl.style.backgroundPosition = '0 0';
  textEl.style.backgroundSize = '100% 100%';
  textEl.style.backgroundClip = 'text';
  textEl.style.webkitBackgroundClip = 'text';
  textEl.style.color = 'transparent';
  textEl.style.webkitTextFillColor = 'transparent';
}

function buildDemoButtonEntry(button, index) {
  const svg = button.querySelector('.demo-button__border');
  const base = button.querySelector('.demo-button__base');
  const activePaths = Array.from(button.querySelectorAll('.demo-button__active path'));
  const label = button.querySelector('.demo-button__label');
  const texts = Array.from(button.querySelectorAll('.demo-button__text'));

  if (!svg || !base || !activePaths.length || !label || !texts.length) {
    console.warn('[Chameleon Buttons] Unexpected .demo-button structure', button);
    return null;
  }

  svg.setAttribute('preserveAspectRatio', 'none');

  const baseGradientId = `chameleonButtonBase-${index}`;
  const activeGradientId = `chameleonButtonActive-${index}`;
  const baseGradient = ensureGradient(svg, baseGradientId);
  const activeGradient = ensureGradient(svg, activeGradientId);

  resetLabelBackground(label);

  return {
    type: 'demo',
    button,
    svg,
    base,
    activePaths,
    label,
    texts,
    baseGradient,
    activeGradient,
    baseGradientId,
    activeGradientId,
  };
}

function buildSecondaryButtonEntry(button) {
  const container = button.querySelector('.chameleon-text') || button;
  return { type: 'secondary', button, container };
}

function updateDemoButton(entry, overlappingElements) {
  const { button, svg, base, activePaths, label, texts, baseGradient, activeGradient, baseGradientId, activeGradientId } = entry;
  const svgRect = svg.getBoundingClientRect();

  if (svgRect.height <= 0) return;

  resetLabelBackground(label);

  if (overlappingElements.length === 1) {
    const theme = getElementTheme(overlappingElements[0].element);
    const textColor = getThemeColor(theme, 'primaryText');
    const idleBorder = getThemeColor(theme, 'primaryIdleBorder');
    const activeBorder = getThemeColor(theme, 'primaryActiveBorder');

    texts.forEach((text) => setSolidTextColor(text, textColor));
    button.style.color = textColor;
    base.style.stroke = idleBorder;
    base.setAttribute('stroke', idleBorder);
    activePaths.forEach((path) => {
      path.style.stroke = activeBorder;
      path.setAttribute('stroke', activeBorder);
    });
    return;
  }

  texts.forEach((text) => {
    const textRect = text.getBoundingClientRect();
    if (textRect.height <= 0) return;
    const stops = computeGradientStops({ rect: textRect, overlappingElements, getColor: (theme) => getThemeColor(theme, 'primaryText') });
    setGradientTextColor(text, stops);
  });

  const baseStops = computeGradientStops({ rect: svgRect, overlappingElements, getColor: (theme) => getThemeColor(theme, 'primaryIdleBorder') });
  setSvgGradientStops(baseGradient, baseStops);
  const baseFill = `url(#${baseGradientId})`;
  base.style.stroke = baseFill;
  base.setAttribute('stroke', baseFill);

  const activeStops = computeGradientStops({ rect: svgRect, overlappingElements, getColor: (theme) => getThemeColor(theme, 'primaryActiveBorder') });
  setSvgGradientStops(activeGradient, activeStops);
  const activeFill = `url(#${activeGradientId})`;
  activePaths.forEach((path) => {
    path.style.stroke = activeFill;
    path.setAttribute('stroke', activeFill);
  });
}

function updateSecondaryButton(entry, overlappingElements) {
  const { button, container } = entry;
  const buttonRect = button.getBoundingClientRect();

  // Always clear the container's own inline styles first — if this ran
  // before second-button.js split it into rolling spans, an earlier paint
  // may have set gradient/clip styles directly on the container itself,
  // and once the spans exist nothing else would ever touch it again to
  // undo that. This makes the container self-healing regardless of init order.
  resetLabelBackground(container);

  // second-button.js replaces the container's direct text with two rolling
  // .demo-button__text spans on first init — recompute the actual leaf
  // layers each time rather than caching them, and always paint the leaves,
  // never the container (which gets a CSS !important lock once it carries
  // .is-roll-label, silently no-op-ing any inline gradient set on it).
  const texts = getTextLayers(container);

  if (buttonRect.height <= 0) return;

  if (overlappingElements.length === 1) {
    const theme = getElementTheme(overlappingElements[0].element);
    const background = getThemeColor(theme, 'secondaryBackground');
    const textColor = getThemeColor(theme, 'secondaryText');

    button.style.background = background;
    texts.forEach((text) => setSolidTextColor(text, textColor));
    button.style.color = textColor;
    return;
  }

  const backgroundStops = computeGradientStops({ rect: buttonRect, overlappingElements, getColor: (theme) => getThemeColor(theme, 'secondaryBackground') });
  button.style.background = stopsToLinearGradientCss(backgroundStops);

  texts.forEach((text) => {
    const textRect = text.getBoundingClientRect();
    if (textRect.height <= 0) return;
    const stops = computeGradientStops({ rect: textRect, overlappingElements, getColor: (theme) => getThemeColor(theme, 'secondaryText') });
    setGradientTextColor(text, stops);
  });
}

export function initThemeColorSwap() {
  const buttons = Array.from(document.querySelectorAll('[data-chameleon-btn]'));
  if (!buttons.length) {
    console.warn('[Chameleon Buttons] No buttons found');
    return;
  }

  const entries = buttons
    .map((button, index) => {
      if (button.classList.contains('is-footer')) return null;
      if (button.classList.contains('demo-button')) return buildDemoButtonEntry(button, index);
      if (button.classList.contains('is-secondary')) return buildSecondaryButtonEntry(button);
      console.warn('[Chameleon Buttons] Unknown button type', button);
      return null;
    })
    .filter(Boolean);

  if (!entries.length) return;

  let frameRequested = false;
  function update() {
    if (frameRequested) return;
    frameRequested = true;

    requestAnimationFrame(() => {
      const themedElements = Array.from(document.querySelectorAll('[data-logo-theme]'));

      if (themedElements.length) {
        entries.forEach((entry) => {
          const rect = entry.button.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;

          const overlappingElements = findOverlappingThemedElements(rect, themedElements);
          if (!overlappingElements.length) return;

          if (entry.type === 'demo') updateDemoButton(entry, overlappingElements);
          else updateSecondaryButton(entry, overlappingElements);
        });
      }

      frameRequested = false;
    });
  }

  window.requestChameleonButtonsUpdate = update;

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  window.addEventListener('load', update);
  ScrollTrigger.addEventListener('refresh', update);
  ScrollTrigger.addEventListener('scrollEnd', update);
  document.fonts?.ready && document.fonts.ready.then(update);

  update();
  setTimeout(update, 100);
  setTimeout(update, 500);
  setTimeout(update, 1000);
}
