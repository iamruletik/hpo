export function getElementTheme(element) {
  return element?.getAttribute('data-logo-theme') === 'dark' ? 'dark' : 'light';
}

// Elements whose bounds overlap `rect`, top to bottom. Falls back to the
// single nearest themed element when nothing directly overlaps (e.g. rect
// sits in a gap between sections) so callers always have something to paint with.
export function findOverlappingThemedElements(rect, themedElements) {
  const overlapping = themedElements
    .map((element) => ({ element, rect: element.getBoundingClientRect() }))
    .filter(({ rect: elRect }) => elRect.bottom > rect.top && elRect.top < rect.bottom)
    .sort((a, b) => a.rect.top - b.rect.top);

  if (overlapping.length) return overlapping;

  const centerY = rect.top + rect.height / 2;
  const nearest = themedElements
    .map((element) => {
      const elRect = element.getBoundingClientRect();
      let distance = 0;
      if (centerY < elRect.top) distance = elRect.top - centerY;
      else if (centerY > elRect.bottom) distance = centerY - elRect.bottom;
      return { element, rect: elRect, distance };
    })
    .sort((a, b) => a.distance - b.distance)[0];

  return nearest ? [nearest] : [];
}

// Hard-edge gradient stops: two stops at the same percentage at each
// section boundary produce a sharp color change instead of a blend.
export function computeGradientStops({ rect, overlappingElements, getColor }) {
  if (!rect || rect.height <= 0 || !overlappingElements.length) return [];

  const stops = [];
  let currentColor = getColor(getElementTheme(overlappingElements[0].element));
  stops.push({ percentage: 0, color: currentColor });

  for (let index = 0; index < overlappingElements.length - 1; index++) {
    const current = overlappingElements[index];
    const next = overlappingElements[index + 1];
    const boundaryY = Math.min(current.rect.bottom, next.rect.top);
    const percentage = Math.max(0, Math.min(100, ((boundaryY - rect.top) / rect.height) * 100));

    stops.push({ percentage, color: currentColor });
    currentColor = getColor(getElementTheme(next.element));
    stops.push({ percentage, color: currentColor });
  }

  stops.push({ percentage: 100, color: currentColor });
  return stops;
}
