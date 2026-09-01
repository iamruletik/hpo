import { gsap } from '../core/gsap.js';

// Rolls the second digit of each .history_item-big up to its own value the
// first time that card comes into view — 02 counts 1→2, 03 counts 1→3, 04
// counts 1→4. The leading zero never moves.
//
// Built like the old iOS picker drum: a column holding every digit from 1 to the
// target, inside a window one digit tall. Translating the column is what shows
// the intermediate digits sliding past, so 04 genuinely rolls through 2 and 3
// rather than cutting to the answer.
//
// The first card is 01 and has nowhere to roll from, so it is skipped entirely
// and keeps its original markup.
const ITEM = '.history_item';
const NUMBER = '.history_item-big';

const ROLL = {
  // gsap's power2 is the cubic curve (power1 is quadratic).
  ease: 'power2.inOut',
  duration: 1.1,
  // Later cards travel further, so a flat duration makes 04 look hurried next to
  // 02. Each extra digit adds this much.
  perDigit: 0.18,
};

// How much of the card has to be inside the track's window before it counts as
// in focus. The items are full-width on mobile, so a low threshold would fire
// all four while the first is still the only one visible.
const VISIBLE_RATIO = 0.6;

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

  for (let digit = 1; digit <= target; digit += 1) {
    const cell = document.createElement('span');
    cell.className = 'history-drum__digit';
    cell.textContent = String(digit);
    reel.append(cell);
  }

  window_.append(reel);
  drum.append(lead, window_);
  number.append(drum);

  return { window_, reel, steps: target - 1 };
}

export function initHistoryNumberRoll() {
  const items = Array.from(document.querySelectorAll(ITEM));
  if (!items.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  items.forEach((item) => {
    const number = item.querySelector(NUMBER);
    if (!number || number.dataset.drumReady === 'true') return;

    const target = Number(number.textContent.trim().slice(-1));
    // 01 has no distance to cover, and anything unparseable is left alone.
    if (!Number.isFinite(target) || target < 2) return;

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
      gsap.set(reel, { yPercent: (-100 * steps) / (steps + 1) });
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        gsap.fromTo(
          reel,
          { yPercent: 0 },
          {
            // Percentage of the reel's own height, so this stays correct when
            // the font size changes at a breakpoint without re-measuring.
            yPercent: (-100 * steps) / (steps + 1),
            duration: ROLL.duration + ROLL.perDigit * (steps - 1),
            ease: ROLL.ease,
          }
        );
      },
      { threshold: VISIBLE_RATIO }
    );

    observer.observe(item);
  });
}
