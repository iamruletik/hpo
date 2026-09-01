// Re-encodes the offer-item icon videos smaller.
//
//   node scripts/encode-offer-icons.mjs [size] [fps] [crf]
//   node scripts/encode-offer-icons.mjs 256 30 28     (defaults)
//   node scripts/encode-offer-icons.mjs 128
//
// Writes to offer-icons-out/ for upload to the bucket; nothing here touches the
// live files.
//
// On the default size: the .offer_item-icon box is 4rem — 64px at the capped
// root — and offer-icons.js scales the video 1.6x, so it paints at ~102 CSS px.
// That is 205 device px at DPR 2 and 307 at DPR 3. 256 is the honest floor;
// 128 will look soft on any retina phone, which is why it is an argument rather
// than the default.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import ffmpeg from 'ffmpeg-static';

const SIZE = Number(process.argv[2] ?? 256);
const FPS = Number(process.argv[3] ?? 30);
const CRF = Number(process.argv[4] ?? 28);

const BASE = 'https://storage.googleapis.com/radiance/hpo/new_offer_icons/';
// Singular for the first and last, plural for the middle two — the bucket's
// naming, not a typo.
const FILES = ['icon_1.mp4', 'icons_2.mp4', 'icons_3.mp4', 'icon_4.mp4'];

const SRC_DIR = 'offer-icons-src';
const OUT_DIR = 'offer-icons-out';

mkdirSync(SRC_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const kb = (path) => Math.round(statSync(path).size / 1024);

console.log(`target ${SIZE}x${SIZE} @ ${FPS}fps, crf ${CRF}\n`);

let before = 0;
let after = 0;

for (const name of FILES) {
  const src = `${SRC_DIR}/${name}`;
  const out = `${OUT_DIR}/${name}`;

  const response = await fetch(BASE + name);
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  writeFileSync(src, Buffer.from(await response.arrayBuffer()));

  execFileSync(
    ffmpeg,
    [
      '-y',
      '-i', src,
      // increase + crop, not a plain scale: icons_2 is 568x564, so scaling it
      // straight to a square would squash it. This matches what object-fit:
      // cover does in the browser, so the crop is the same either way.
      '-vf', `scale=${SIZE}:${SIZE}:force_original_aspect_ratio=increase,crop=${SIZE}:${SIZE},fps=${FPS}`,
      '-an',
      '-c:v', 'libx264',
      '-profile:v', 'main',
      // yuv420p or Safari refuses the file outright.
      '-pix_fmt', 'yuv420p',
      '-crf', String(CRF),
      '-preset', 'slow',
      // moov atom first, so playback can start before the whole file lands.
      '-movflags', '+faststart',
      out,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );

  before += kb(src);
  after += kb(out);
  console.log(`${name.padEnd(14)} ${String(kb(src)).padStart(5)}kB -> ${String(kb(out)).padStart(4)}kB`);
}

console.log(`\ntotal ${before}kB -> ${after}kB  (${Math.round((1 - after / before) * 100)}% smaller)`);
console.log(`\nupload ${OUT_DIR}/ to the bucket, then point BASE in src/modules/offer-icons.js at it`);
