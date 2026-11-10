"""Builds the site favicon: a 32x32 pixel-art oil lamp in the LAMPLIGHT OS palette (lamp.js).

Writes public/favicon.svg, public/favicon-32.png, public/favicon.ico (PNG inside) and
public/apple-touch-icon.png (180x180 on a dark tile). Pure Python, no dependencies.
Run from the repo root:  python3 tools/favicon/make_favicon.py [preview.png]
"""
import math, struct, sys, zlib
from pathlib import Path

PAL = {  # same colors as LAMP_PALETTE in src/scene/lamp.js
    'O': '#2a1405', 'D': '#6e3c12', 'M': '#a8652a', 'L': '#d9994a', 'S': '#f6d48e',
    'R': '#cf3a12', 'F': '#ff8a1e', 'Y': '#ffd640', 'W': '#fff7cf',
}
N = 32
g = [[None] * N for _ in range(N)]

def put(x, y, c, over=True):
    if 0 <= x < N and 0 <= y < N and (over or g[y][x] is None):
        g[y][x] = c

def each():
    for y in range(N):
        for x in range(N):
            yield x, y, x + 0.5, y + 0.5

# Handle: left loop (drawn first, the body overlaps its right side).
for x, y, px, py in each():
    r = math.hypot(px - 5.2, py - 17.6)
    if 1.7 < r < 3.7 and px < 8.5:
        put(x, y, 'L' if py < 16.4 else 'M')
# Body: flattened ellipse with banded shading.
cx, cy, rx, ry = 13.5, 18.6, 8.6, 4.3
for x, y, px, py in each():
    if ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1:
        put(x, y, 'L' if py < cy - 1.8 else 'D' if py > cy + 1.9 else 'M')
for x, y in [(8, 16), (9, 16), (10, 15)]:
    put(x, y, 'S')
# Spout: tapered from the body's right shoulder up to the tip.
x0, y0, x1, y1 = 19.5, 18.4, 28.6, 12.6
for x, y, px, py in each():
    vx, vy = x1 - x0, y1 - y0
    t = max(0, min(1, ((px - x0) * vx + (py - y0) * vy) / (vx * vx + vy * vy)))
    d = math.hypot(px - (x0 + vx * t), py - (y0 + vy * t))
    if d < 2.0 - 1.2 * t:
        put(x, y, 'L' if (py - (y0 + vy * t)) < -0.3 else 'M')
# Lid dome and knob.
for x, y, px, py in each():
    if py <= 15.2 and ((px - 13.5) / 4.3) ** 2 + ((py - 15.2) / 2.9) ** 2 <= 1:
        put(x, y, 'L' if px < 13.5 else 'M')
    if math.hypot(px - 13.5, py - 11.4) <= 1.25:
        put(x, y, 'L')
# Foot: neck and base.
for x in range(11, 16):
    for y in (23,):
        put(x, y, 'D')
for x, y, px, py in each():
    if ((px - 13.5) / 5.2) ** 2 + ((py - 25.0) / 1.45) ** 2 <= 1:
        put(x, y, 'L' if py < 24.8 else 'M')

# One-pixel outline around the lamp (4-neighbourhood keeps it crisp).
body = [[c is not None for c in row] for row in g]
for x, y, _, _ in each():
    if body[y][x]:
        continue
    if any(0 <= x + dx < N and 0 <= y + dy < N and body[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
        g[y][x] = 'O'

# Flame over the spout tip: a teardrop, red edge -> orange -> yellow -> pale core.
fx, top, base = 28.9, 2.0, 11.2
for x, y, px, py in each():
    if not (top <= py <= base):
        continue
    k = (py - top) / (base - top)  # 0 at the tip, 1 at the base
    half = 2.3 * math.sin(math.pi * min(1, k * 0.82)) ** 0.9
    lean = -0.5 * (1 - k)
    d = abs(px - (fx + lean))
    if d <= half:
        inner = half - d
        c = 'R' if inner < 0.7 else 'F' if inner < 1.3 else 'Y' if (inner < 1.9 or k < 0.75) else 'W'
        put(x, y, c)

# Center vertically (the art spans rows 2..26).
g = [[None] * N for _ in range(2)] + g[:-2]

# ---------------------------------------------------------------- outputs
rgb = {k: tuple(int(v[i:i + 2], 16) for i in (1, 3, 5)) for k, v in PAL.items()}

def png(pixels, w, h):
    raw = b''.join(b'\x00' + b''.join(struct.pack('BBBB', *p) for p in row) for row in pixels)
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')

def scaled(scale, pad=0, bg=None):
    size = N * scale + 2 * pad
    out = [[(bg + (255,)) if bg else (0, 0, 0, 0)] * size for _ in range(size)]
    out = [list(r) for r in out]
    for y in range(N):
        for x in range(N):
            c = g[y][x]
            if c is None:
                continue
            for sy in range(scale):
                for sx in range(scale):
                    out[pad + y * scale + sy][pad + x * scale + sx] = rgb[c] + (255,)
    return out, size

pub = Path('public')
p32, s32 = scaled(1)
png32 = png(p32, s32, s32)
(pub / 'favicon-32.png').write_bytes(png32)
# ICO with the 32 px PNG inside (valid in every current browser).
(pub / 'favicon.ico').write_bytes(struct.pack('<HHH', 0, 1, 1) + struct.pack('<BBBBHHII', 32, 32, 0, 0, 1, 32, len(png32), 22) + png32)
ap, asz = scaled(5, pad=10, bg=(0x1d, 0x1b, 0x18))
(pub / 'apple-touch-icon.png').write_bytes(png(ap, asz, asz))
rects = ''.join(f'<rect x="{x}" y="{y}" width="1" height="1" fill="{PAL[g[y][x]]}"/>' for y in range(N) for x in range(N) if g[y][x])
(pub / 'favicon.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">{rects}</svg>\n')
if len(sys.argv) > 1:  # big preview on a light and a dark half for checking
    pv, psz = scaled(12, pad=12, bg=(0xee, 0xea, 0xe0))
    for y in range(psz):
        for x in range(psz // 2, psz):
            if pv[y][x] == (0xee, 0xea, 0xe0, 255):
                pv[y][x] = (0x20, 0x21, 0x24, 255)
    Path(sys.argv[1]).write_bytes(png(pv, psz, psz))
print('\n'.join(''.join(c or '.' for c in row) for row in g))
