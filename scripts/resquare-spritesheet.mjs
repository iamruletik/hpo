// Rebuilds the foot-icon sprite sheet so every cell is an exact integer square.
//
//   node scripts/resquare-spritesheet.mjs [cell]
//   node scripts/resquare-spritesheet.mjs 144      (default)
//
// The source is 3615x3470 over a 25x24 grid, which is 144.6 x 144.583 per cell.
// Nothing downstream can draw that cleanly: every frame's source origin lands on
// a different sub-pixel phase, the GPU resamples each one at a different offset,
// and the sprite visibly shakes — worst on iOS, which is stricter about it.
//
// Rounding in the player only moves the problem around, because rounding the
// origin and flooring the size are two different compromises and neither makes
// the phases match. Fixing the asset does: at 144x144 every origin is a multiple
// of 144 and every frame samples an identically aligned box by construction.
//
// Each cell is extracted at its true fractional position (rounded to the pixel
// grid, sized to reach its neighbour exactly, so nothing is dropped between
// cells) and then resized to the target square. Extracting per cell rather than
// resizing the whole sheet is what stops artwork bleeding across cell borders.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const CELL = Number(process.argv[2] ?? 144);
const QUALITY = Number(process.argv[3] ?? 82);

const SRC = 'https://storage.googleapis.com/radiance/hpo/spritesheet-full.webp';
const OUT_DIR = 'spritesheet-out';
const OUT = `${OUT_DIR}/spritesheet-full.webp`;

const COLUMNS = 25;
const ROWS = 24;

const response = await fetch(SRC);
if (!response.ok) throw new Error(`source: HTTP ${response.status}`);
const source = Buffer.from(await response.arrayBuffer());

const meta = await sharp(source).metadata();
console.log(`source ${meta.width}x${meta.height}  alpha=${meta.hasAlpha}`);
console.log(`true cell ${(meta.width / COLUMNS).toFixed(3)} x ${(meta.height / ROWS).toFixed(3)}`);
console.log(`target cell ${CELL} x ${CELL}\n`);

// Edges on the pixel grid. Deriving both sides of every cell from the same
// rounded-edge list means adjacent cells share a boundary exactly — no gap, no
// overlap, nothing lost between them.
const xEdges = Array.from({ length: COLUMNS + 1 }, (_, i) => Math.round((i * meta.width) / COLUMNS));
const yEdges = Array.from({ length: ROWS + 1 }, (_, i) => Math.round((i * meta.height) / ROWS));

const tiles = [];

for (let row = 0; row < ROWS; row += 1) {
  for (let column = 0; column < COLUMNS; column += 1) {
    const left = xEdges[column];
    const top = yEdges[row];

    const cell = await sharp(source)
      .extract({ left, top, width: xEdges[column + 1] - left, height: yEdges[row + 1] - top })
      .resize(CELL, CELL, { fit: 'fill' })
      .toBuffer();

    tiles.push({ input: cell, left: column * CELL, top: row * CELL });
  }
}

mkdirSync(OUT_DIR, { recursive: true });

await sharp({
  create: {
    width: COLUMNS * CELL,
    height: ROWS * CELL,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite(tiles)
  // alphaQuality 100: the artwork is a shape on transparency, so the alpha
  // channel is the whole silhouette — compressing it is what produces halos.
  .webp({ quality: QUALITY, alphaQuality: 100, effort: 6 })
  .toFile(OUT);

const out = await sharp(OUT).metadata();
console.log(`wrote ${OUT}  ${out.width}x${out.height}  alpha=${out.hasAlpha}`);
console.log(`\nupload it, then in src/modules/foot-icon.js set:`);
console.log(`  SHEET_WIDTH  = ${out.width}`);
console.log(`  SHEET_HEIGHT = ${out.height}`);
