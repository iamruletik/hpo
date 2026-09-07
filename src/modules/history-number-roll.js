import { gsap, ScrollTrigger } from '../core/gsap.js';

// Rolls the second digit of each .history_item-big up to its own value — 01
// counts 0→1, 02 counts 0→2, and so on. The leading zero never moves.
//
// Every card starts from 0, including the first: counting from 1 meant card 01
// had nowhere to travel and sat still while the others rolled, which read as it
// being broken rather than as a deliberate start point.
//
// When it fires depends on width. Desktop shows the whole track at once, so all
// four roll together the moment the section arrives — staggering them by
// individual visibility there would fire them all within a few pixels of each
// other anyway, just raggedly. Mobile shows one card at a time in a horizontal
// drag track, so each one waits until it is actually the card you are looking
// at.
//
// Built like the old iOS picker drum: a column holding every digit from 1 to the
// target, inside a window one digit tall. Translating the column is what shows
// the intermediate digits sliding past, so 04 genuinely rolls through 2 and 3
// rather than cutting to the answer.
//
// The first card is 01 and has nowhere to roll from, so it is skipped entirely
// and keeps its original markup.
const SECTION = '[data-component="history"]';
const ITEM = '.history_item';
const NUMBER = '.history_item-big';

const MOBILE_QUERY = '(max-width: 991px)';

const ROLL = {
  // gsap's power2 is the cubic curve (power1 is quadratic).
  ease: 'power2.inOut',
  duration: 1.1,
  // Later cards travel further, so a flat duration makes 04 look hurried next to
  // 01. Each extra digit adds this much.
  perDigit: 0.18,
};

// Mobile only. How much of the card has to be inside the track's window before
// it counts as in focus — the items are full-width there, so a low threshold
// would fire all four while the first is still the only one visible.
const VISIBLE_RATIO = 0.6;

// Desktop only. The whole track is on screen at once, so this just needs the
// section to have arrived.
const SECTION_START = 'top 75%';

function buildDrum(number, target) {
  const original = number.textContent.trim();
  const prefix = original.slice(0, -1);

  // The rolling digits are decoration; the number still has to read as its
  // final value to a screen reader.
  number.setAttribute('aria-label', original);
  number.textContent = '';

  const drum = document.createElement('span');
  drum.className = 'history-drum';
  drum.setAttribute('aria-hidden', 'true');

  const lead = document.createElement('span');
  lead.className = 'history-drum__lead';
  lead.textContent = prefix;

  const window_ = document.createElement('span');
  window_.className = 'history-drum__window';

  const reel = document.createElement('span');
  reel.className = 'history-drum__reel';

  for (let digit = 0; digit <= target; digit += 1) {
    const cell = document.createElement('span');
    cell.className = 'history-drum__digit';
    cell.textContent = String(digit);
    reel.append(cell);
  }

  window_.append(reel);
  drum.append(lead, window_);
  number.append(drum);

  // steps === target now that the reel starts at 0: 01 travels one digit, 04
  // travels four.
  return { window_, reel, steps: target };
}

export function initHistoryNumberRoll() {
  const items = Array.from(document.querySelectorAll(ITEM));
  if (!items.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.matchMedia(MOBILE_QUERY).matches;

  // Percentage of the reel's own height, so this stays correct when the font
  // size changes at a breakpoint without re-measuring.
  const restingY = (steps) => (-100 * steps) / (steps + 1);

  const play = (reel, steps) =>
    gsap.fromTo(
      reel,
      { yPercent: 0 },
      {
        yPercent: restingY(steps),
        duration: ROLL.duration + ROLL.perDigit * (steps - 1),
        ease: ROLL.ease,
      }
    );

  // Collected so the desktop path can fire them as one group. Mobile ignores
  // this and binds per card below.
  const drums = [];

  items.forEach((item) => {
    const number = item.querySelector(NUMBER);
    if (!number || number.dataset.drumReady === 'true') return;

    const target = Number(number.textContent.trim().slice(-1));
    // 0 has nowhere to travel, and anything unparseable is left alone.
    if (!Number.isFinite(target) || target < 1) return;

    number.dataset.drumReady = 'true';
    const { window_, reel, steps } = buildDrum(number, target);

    // The window is one digit tall, measured rather than assumed: the Designer
    // sets line-height: .8em on this class, so a 1em guess would clip.
    const sizeWindow = () => {
      const digit = reel.firstElementChild;
      if (digit?.offsetHeight) window_.style.height = `${digit.offsetHeight}px`;
    };

    sizeWindow();
    new ResizeObserver(sizeWindow).observe(reel);

    if (reduceMotion) {
      gsap.set(reel, { yPercent: restingY(steps) });
      return;
    }

    drums.push({ item, reel, steps });
  });

  if (!drums.length) return;

  if (isMobile) {
    // One card fills the track, so each waits until it is the one in focus.
    drums.forEach(({ item, reel, steps }) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          observer.disconnect();
          play(reel, steps);
        },
        { threshold: VISIBLE_RATIO }
      );

      observer.observe(item);
    });
    return;
  }

  // Desktop: the whole track is visible at once, so one trigger on the section
  // rolls all of them together.
  const section = document.querySelector(SECTION);
  if (!section) return;

  ScrollTrigger.create({
    trigger: section,
    start: SECTION_START,
    once: true,
    onEnter: () => drums.forEach(({ reel, steps }) => play(reel, steps)),
  });
}
