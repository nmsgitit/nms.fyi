// Lit LED "bulletin board" sign over the entrance door (both sides): an amber dot-matrix board.
// Everything is drawn on a dot grid, like a real LED message board: the lamp logo on the left,
// two overlapping gears on the right, "COMMAND ROOM" in double-size 5×7 letters and
// "LAMPLIGHT MAINFRAME" in single-size letters. Unlit dots stay faintly visible.
import * as THREE from 'three';

const BOARD_COLS = 210, BOARD_ROWS = 28;
export const LED_BOARD_ASPECT = BOARD_COLS / BOARD_ROWS;

// 5×7 dot-matrix capitals (only the letters the sign needs).
const FONT = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

// Oil lamp with its flame, drawn for the dot grid (24 × 20): flame over the spout tip on the
// right, lid and knob on top, the handle loop on the left, a stepped foot.
const LAMP = [
  '......................#.',
  '.....................##.',
  '....................###.',
  '....................####',
  '....................###.',
  '.....................#..',
  '..........##............',
  '.........####......##...',
  '........######....##....',
  '.###...########..##.....',
  '#...#############.......',
  '#...##############......',
  '#....############.......',
  '.#...###########........',
  '..##..#########.........',
  '....#..#######..........',
  '........###.............',
  '.......#####............',
  '......#######...........',
  '.....#########..........',
];

function gearsBitmap(size) {
  // Two overlapping gears: a large one (top left) and a smaller one in front of it (bottom right).
  const rows = [];
  const big = { x: size * 0.39, y: size * 0.39, ro: size * 0.38, ri: size * 0.29, hole: size * 0.12, teeth: 8, ph: 0.2 };
  const small = { x: size * 0.73, y: size * 0.73, ro: size * 0.255, ri: size * 0.185, hole: size * 0.075, teeth: 6, ph: 0.5 };
  const inGear = (g, x, y) => {
    const dx = x - g.x, dy = y - g.y, r = Math.hypot(dx, dy);
    if (r < g.hole) return false;
    if (r <= g.ri) return true;
    if (r > g.ro) return false;
    return Math.cos(Math.atan2(dy, dx) * g.teeth + g.ph) > -0.1; // tooth
  };
  for (let y = 0; y < size; y++) {
    let row = '';
    for (let x = 0; x < size; x++) {
      const cx = x + 0.5, cy = y + 0.5;
      const s = inGear(small, cx, cy);
      // A one-dot gap around the small gear so the two read as separate pieces.
      const nearSmall = Math.hypot(cx - small.x, cy - small.y) < small.ro + 1.1;
      row += s || (!nearSmall && inGear(big, cx, cy)) ? '#' : '.';
    }
    rows.push(row);
  }
  return rows;
}

/** The sign as a grid of booleans: { cols, rows, on(x, y) }. */
function composeBoard() {
  const COLS = BOARD_COLS, ROWS = BOARD_ROWS;
  const grid = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
  const blit = (bitmap, x0, y0, scale = 1) => {
    bitmap.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] !== '#') continue;
        for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
          const gx = x0 + x * scale + sx, gy = y0 + y * scale + sy;
          if (gx >= 0 && gx < COLS && gy >= 0 && gy < ROWS) grid[gy][gx] = 1;
        }
      }
    });
  };
  const textWidth = (str, scale) => str.length * 6 * scale - scale;
  const text = (str, y0, scale) => {
    let x = Math.round((COLS - textWidth(str, scale)) / 2);
    for (const ch of str) { blit(FONT[ch] || FONT[' '], x, y0, scale); x += 6 * scale; }
  };
  text('COMMAND ROOM', 2, 2); // rows 2..15
  text('LAMPLIGHT MAINFRAME', 19, 1); // rows 19..25
  blit(LAMP, 4, 4);
  blit(gearsBitmap(24), COLS - 4 - 24, 2);
  return { cols: COLS, rows: ROWS, on: (x, y) => grid[y][x] === 1 };
}

let cachedTexture = null;

/** CanvasTexture of the board: glowing amber dots on black, unlit dots faintly visible. */
export function ledBoardTexture() {
  if (cachedTexture) return cachedTexture;
  const board = composeBoard();
  const P = 12; // canvas pixels per dot
  const c = document.createElement('canvas');
  c.width = board.cols * P;
  c.height = board.rows * P;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#080605';
  ctx.fillRect(0, 0, c.width, c.height);
  // Pre-render one lit and one unlit dot, then stamp them.
  const dot = (lit) => {
    const d = document.createElement('canvas');
    d.width = d.height = P;
    const g = d.getContext('2d');
    const grad = g.createRadialGradient(P / 2, P / 2, 0, P / 2, P / 2, P * 0.5);
    if (lit) {
      grad.addColorStop(0, '#fff3c4');
      grad.addColorStop(0.3, '#ffb53a');
      grad.addColorStop(0.62, '#e2700f');
      grad.addColorStop(0.85, 'rgba(120,40,0,0.35)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      grad.addColorStop(0, '#2a1c11');
      grad.addColorStop(0.6, '#1c130c');
      grad.addColorStop(0.75, 'rgba(0,0,0,0)');
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, P, P);
    return d;
  };
  const litDot = dot(true), offDot = dot(false);
  for (let y = 0; y < board.rows; y++) {
    for (let x = 0; x < board.cols; x++) ctx.drawImage(board.on(x, y) ? litDot : offDot, x * P, y * P);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cachedTexture = t;
  return t;
}

