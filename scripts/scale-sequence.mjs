// Scales a folder of WebP frames down and renumbers them to 0001.webp.
//
//   node scripts/scale-sequence.mjs <in> <out> [size] [quality]
//   node scripts/scale-sequence.mjs reveal-new reveal-240 240 82
//
// sharp rather than ffmpeg: these frames are animated-WebP containers (VP8X
// with ANIM/ANMF chunks, one frame each — After Effects writes them that way),
// and ffmpeg's webp decoder cannot read ANMF at all. It fails with "image data
// not found" on every file. libvips handles them.
//
// Renumbering is the other half of the job. The source runs 00016..00599 with a
// space in the name; a sequence player wants a contiguous run from 1 it can
// build with padStart, not an offset it has to remember.
import sharp from 'sharp';
import { readdirSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';

const [inDir, outDir, sizeArg, qualityArg] = process.argv.slice(2);

if (!inDir || !outDir) {
  console.error('usage: node scripts/scale-sequence.mjs <in> <out> [size] [quality]');
  process.exit(1);
}

const SIZE = Number(sizeArg ?? 240);
const QUALITY = Number(qualityArg ?? 82);

// Numeric sort on the trailing digits. A plain readdir sort is lexicographic,
// which is only correct here because the source happens to be zero-padded —
// this does not rely on that.
const frames = readdirSync(inDir)
  .filter((name) => name.toLowerCase().endsWith('.webp'))
  .map((name) => ({ name, index: Number(name.match(/(\d+)\.webp$/i)?.[1] ?? -1) }))
  .filter((frame) => frame.index >= 0)
  .sort((a, b) => a.index - b.index);

if (!frames.length) {
  console.error(`no .webp frames in ${inDir}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const kb = (p) => statSync(p).size / 1024;
let before = 0;
let after = 0;

for (const [position, frame] of frames.entries()) {
  const from = path.join(inDir, frame.name);
  const to = path.join(outDir, `${String(position + 1).padStart(4, '0')}.webp`);

  await sharp(from)
    .resize(SIZE, SIZE, { fit: 'cover' })
    // alphaQuality 100: the artwork is a shape on transparency, so a soft alpha
    // channel is the whole silhouette. Compressing it is what produces halos.
    .webp({ quality: QUALITY, alphaQuality: 100, effort: 6 })
    .toFile(to);

  before += kb(from);
  after += kb(to);
}

console.log(`${frames.length} frames  ${SIZE}x${SIZE} q${QUALITY}`);
console.log(`source ${frame_range(frames)}  ->  0001..${String(frames.length).padStart(4, '0')}`);
console.log(`${Math.round(before)}kB -> ${Math.round(after)}kB  (${Math.round((1 - after / before) * 100)}% smaller)`);
console.log(`decoded in memory: ${((SIZE * SIZE * 4 * frames.length) / 1048576).toFixed(1)}MB if every frame is held at once`);

function frame_range(list) {
  return `${list[0].name} .. ${list[list.length - 1].name}`;
}
