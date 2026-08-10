import { findOverlappingThemedElements, computeGradientStops } from '../core/theme.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const GRADIENT_ID = 'navLogoGradient';

function getLogoColor(theme) {
  return theme === 'light' ? '#ffffff' : '#000000';
}

function getBorderColor(theme) {
  return theme === 'light' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
}

export function initNavLogoTheme() {
  const logoWrap = document.querySelector('.logo-wrap');
  const logoSvg = document.querySelector('.logo-svg');
  const logoPath = logoSvg?.querySelector('path');

  if (!logoWrap || !logoSvg || !logoPath) {
    console.warn('[Nav Logo] Required elements not found', { logoWrap, logoSvg, logoPath });
    return;
  }

  // Remove any gradient left over from a previous init to avoid duplicate IDs.
  logoSvg.querySelector(`#${GRADIENT_ID}`)?.remove();

  let defs = logoSvg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS(SVG_NS, 'defs');
    logoSvg.insertBefore(defs, logoSvg.firstChild);
  }

  const gradient = document.createElementNS(SVG_NS, 'linearGradient');
  gradient.setAttribute('id', GRADIENT_ID);
  gradient.setAttribute('x1', '0%');
  gradient.setAttribute('y1', '0%');
  gradient.setAttribute('x2', '0%');
  gradient.setAttribute('y2', '100%');
  defs.appendChild(gradient);

  function setSvgGradientStops(stops) {
    gradient.replaceChildren();
    stops.forEach(({ percentage, color }) => {
      const stop = document.createElementNS(SVG_NS, 'stop');
      stop.setAttribute('offset', `${percentage}%`);
      stop.setAttribute('stop-color', color);
      gradient.appendChild(stop);
    });
  }

  function setBorderGradient(stops) {
    const gradientStops = stops.map(({ percentage, color }) => `${color} ${percentage}%`).join(', ');
    logoWrap.style.setProperty('--logo-border-background', `linear-gradient(to bottom, ${gradientStops})`);
  }

  function updateLogo() {
    const themedElements = Array.from(document.querySelectorAll('[data-logo-theme]'));

    if (!themedElements.length) {
      logoPath.style.fill = '#000000';
      logoWrap.style.setProperty('--logo-border-background', 'rgba(0, 0, 0, 0.12)');
      return;
    }

    const logoRect = logoSvg.getBoundingClientRect();
    const wrapRect = logoWrap.getBoundingClientRect();

    if (logoRect.height <= 0 || wrapRect.height <= 0) return;

    const overlappingElements = findOverlappingThemedElements(wrapRect, themedElements);

    if (overlappingElements.length === 1) {
      const theme = overlappingElements[0].element.getAttribute('data-logo-theme') === 'dark' ? 'dark' : 'light';
      const logoColor = getLogoColor(theme);
      const borderColor = getBorderColor(theme);

      logoPath.style.fill = logoColor;
      logoPath.setAttribute('fill', logoColor);
      logoWrap.style.setProperty('--logo-border-background', borderColor);
      return;
    }

    const svgStops = computeGradientStops({ rect: logoRect, overlappingElements, getColor: getLogoColor });
    setSvgGradientStops(svgStops);

    const gradientFill = `url(#${GRADIENT_ID})`;
    logoPath.style.fill = gradientFill;
    logoPath.setAttribute('fill', gradientFill);

    // Border is measured against the full button rect (3rem), separate from
    // the SVG's own rect, since the two don't share the same bounds.
    const borderStops = computeGradientStops({ rect: wrapRect, overlappingElements, getColor: getBorderColor });
    setBorderGradient(borderStops);
  }

  let frameRequested = false;
  function requestUpdate() {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(() => {
      updateLogo();
      frameRequested = false;
    });
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  window.addEventListener('load', requestUpdate);

  requestUpdate();
  setTimeout(requestUpdate, 100);
  setTimeout(requestUpdate, 500);
}
