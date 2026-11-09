// The command room: sterile white light, light gray walls, taupe wainscot,
// a tilted glass wall at the front, and a short entry corridor behind.
import * as THREE from 'three';
import { Builder } from './builder.js';
import { ROOM, CORRIDOR, DOOR, HATCH } from './layout.js';
import { PALETTE } from './palette.js';

export function buildCommandRoom(m, leds) {
  const b = new Builder();
  const { xMin, xMax, zBack, height: H, sill } = ROOM;
  const zTop = ROOM.glassTopZ;

  // ---- floor + walkway mat
  b.span(m.floor, xMin, xMax, -0.06, 0, zTop, zBack);
  b.span(m.floorMat, -0.75, 0.75, 0, 0.008, 1.75, zBack);
  b.span(m.trim, -0.8, -0.75, 0, 0.01, 1.75, zBack);
  b.span(m.trim, 0.75, 0.8, 0, 0.01, 1.75, zBack);
  // baseboards
  b.span(m.taupeDark, xMin, xMin + 0.03, 0, 0.1, 0, zBack);
  b.span(m.taupeDark, xMax - 0.03, xMax, 0, 0.1, 0, zBack);

  // ---- ceiling, light panels, monitor hatch
  b.span(m.ceiling, xMin, xMax, H, H + 0.1, zTop, zBack + 0.2);
  const panels = [];
  for (const x of [-3, 0, 3]) for (const z of [3.1, 5.9]) panels.push([x, z, 2.2, 0.9]);
  panels.push([-3, 1.35, 2.2, 0.7], [3, 1.35, 2.2, 0.7]);
  for (const [x, z, w, d] of panels) {
    b.span(m.lightPanel, x - w / 2, x + w / 2, H - 0.012, H - 0.002, z - d / 2, z + d / 2);
    // beige frame around each fixture
    b.span(m.beige, x - w / 2 - 0.06, x + w / 2 + 0.06, H - 0.03, H - 0.013, z - d / 2 - 0.06, z - d / 2);
    b.span(m.beige, x - w / 2 - 0.06, x + w / 2 + 0.06, H - 0.03, H - 0.013, z + d / 2, z + d / 2 + 0.06);
    b.span(m.beige, x - w / 2 - 0.06, x - w / 2, H - 0.03, H - 0.013, z - d / 2, z + d / 2);
    b.span(m.beige, x + w / 2, x + w / 2 + 0.06, H - 0.03, H - 0.013, z - d / 2, z + d / 2);
  }
  // Hatch (closed for now; the monitor drops through it in stage 2).
  const hx0 = HATCH.x - HATCH.w / 2, hx1 = HATCH.x + HATCH.w / 2;
  const hz0 = HATCH.z - HATCH.d / 2, hz1 = HATCH.z + HATCH.d / 2;
  b.span(m.taupe, hx0, hx1, H - 0.02, H, hz0, hz1);
  b.span(m.grille, hx0 - 0.02, hx1 + 0.02, H - 0.025, H - 0.02, HATCH.z - 0.005, HATCH.z + 0.005); // door seam
  b.span(m.trim, hx0 - 0.07, hx1 + 0.07, H - 0.03, H - 0.01, hz0 - 0.07, hz0);
  b.span(m.trim, hx0 - 0.07, hx1 + 0.07, H - 0.03, H - 0.01, hz1, hz1 + 0.07);
  b.span(m.trim, hx0 - 0.07, hx0, H - 0.03, H - 0.01, hz0, hz1);
  b.span(m.trim, hx1, hx1 + 0.07, H - 0.03, H - 0.01, hz0, hz1);

  // ---- back wall with door opening
  const dw = CORRIDOR.halfW;
  b.span(m.wallUpper, xMin, -dw, 0, H, zBack, zBack + 0.2);
  b.span(m.wallUpper, dw, xMax, 0, H, zBack, zBack + 0.2);
  b.span(m.wallUpper, -dw, dw, CORRIDOR.height, H, zBack, zBack + 0.2);
  b.span(m.wallLower, xMin, -dw - 0.25, 0, 1.0, zBack - 0.025, zBack);
  b.span(m.wallLower, dw + 0.25, xMax, 0, 1.0, zBack - 0.025, zBack);
  b.span(m.trim, xMin, -dw - 0.25, 1.0, 1.05, zBack - 0.035, zBack);
  b.span(m.trim, dw + 0.25, xMax, 1.0, 1.05, zBack - 0.035, zBack);
  // Chunky slab door frame (rounded-over jambs + header).
  const jambW = 0.34;
  for (const s of [-1, 1]) b.rbox(m.beige, jambW, DOOR.height + 0.3, 0.55, 0.09, s * (DOOR.halfW + jambW / 2), (DOOR.height + 0.3) / 2, zBack + 0.1);
  b.rbox(m.beige, DOOR.halfW * 2 + jambW * 2, 0.34, 0.55, 0.09, 0, DOOR.height + 0.17, zBack + 0.1);

  // ---- side walls
  for (const s of [-1, 1]) {
    const xw = s > 0 ? xMax : xMin; // inner face
    const xo = xw + s * 0.2;
    b.span(m.wallUpper, Math.min(xw, xo), Math.max(xw, xo), 0, H, zTop, zBack + 0.2);
    b.span(m.wallLower, Math.min(xw, xw - s * 0.025), Math.max(xw, xw - s * 0.025), 0, 1.0, 0.45, zBack);
    b.span(m.trim, Math.min(xw, xw - s * 0.035), Math.max(xw, xw - s * 0.035), 1.0, 1.05, 0.45, zBack);

    // Raised wall panels in two rows. Some carry a sparse grid of tiny pinpoint lights.
    const cols = [1.25, 2.65, 4.05, 5.45, 6.85];
    const rows = [1.62, 2.62];
    cols.forEach((z, ci) => {
      rows.forEach((y, ri) => {
        const xp = xw - s * 0.016;
        b.box(m.panelInset, 0.03, 0.86, 1.24, xp, y, z);
        const nx = -s;
        if ((ci + ri + (s > 0 ? 1 : 0)) % 2 === 0) {
          leds.grid([xw - s * 0.032, y, z], [0, 0, 1], [0, 1, 0], [nx, 0, 0], 11, 7, 0.1, 0.11,
            { size: 0.0065, color: PALETTE.ledWarm, group: 'cmd', intensity: 1.6, blink: (r) => (r < 0.12 ? 0.25 + r * 4 : 0) }, 0.33);
        } else if (ri === 0 && ci % 2 === 1) {
          // Small inset display.
          b.box(m.grille, 0.02, 0.36, 0.48, xw - s * 0.034, y + 0.05, z);
          b.box(m.screenGlow, 0.01, 0.3, 0.42, xw - s * 0.046, y + 0.05, z);
        }
      });
    });
  }

  // ---- front: console ledge under the sill, then the tilted glass wall
  b.rbox(m.taupe, xMax - xMin, sill - 0.03, 0.5, 0.035, 0, (sill - 0.03) / 2, 0.25);
  b.rbox(m.beigeLight, xMax - xMin, 0.05, 0.58, 0.02, 0, sill - 0.015, 0.21);
  // Under the ledge, between sill and floor at the very front.
  b.span(m.wallUpper, xMin, xMax, -0.06, sill - 0.03, ROOM.glassTopZ, 0);

  const gh = H - sill;
  const tilt = Math.atan2(-zTop, gh); // top leans away from the viewer
  const glassLen = Math.hypot(gh, zTop);
  const midY = (sill + H) / 2;
  const midZ = zTop / 2;
  const mullionX = [xMin + 0.06, -1.8, 1.8, xMax - 0.06];
  for (const x of mullionX) b.rbox(m.beige, 0.12, glassLen, 0.16, 0.03, x, midY, midZ, [-tilt, 0, 0]);
  b.rbox(m.beige, xMax - xMin, 0.1, 0.18, 0.03, 0, sill, 0.0); // bottom rail
  b.rbox(m.beige, xMax - xMin, 0.14, 0.2, 0.03, 0, H - 0.05, zTop + 0.02); // top rail
  const panes = [[xMin + 0.06, -1.8], [-1.8, 1.8], [1.8, xMax - 0.06]];
  for (const [x0, x1] of panes) {
    b.add(new THREE.PlaneGeometry(x1 - x0 - 0.12, glassLen - 0.1), m.glass, [(x0 + x1) / 2, midY, midZ], [-tilt, 0, 0]);
  }

  // ---- entry corridor
  const cz0 = CORRIDOR.zStart, cz1 = CORRIDOR.zEnd, ch = CORRIDOR.height;
  b.span(m.floor, -dw, dw, -0.06, 0, zBack, cz1);
  b.span(m.floorMat, -0.75, 0.75, 0, 0.008, zBack, cz1);
  b.span(m.ceiling, -dw, dw, ch, ch + 0.1, zBack, cz1);
  b.span(m.wallUpper, -dw - 0.2, -dw, 0, ch, cz0, cz1);
  b.span(m.wallUpper, dw, dw + 0.2, 0, ch, cz0, cz1);
  b.span(m.wallLower, -dw, -dw + 0.025, 0, 1.0, cz0, cz1);
  b.span(m.wallLower, dw - 0.025, dw, 0, 1.0, cz0, cz1);
  b.span(m.wallUpper, -dw, dw, 0, ch, cz1, cz1 + 0.2);
  b.span(m.corridorPanel, -0.45, 0.45, ch - 0.01, ch - 0.002, 9.6, 11.2);

  const group = b.build({ name: 'commandRoom', receiveShadow: true, castShadow: true });
  // Glass must not cast shadows or write depth.
  group.children.forEach((mesh) => {
    if (mesh.material === m.glass) {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.renderOrder = 2;
    }
  });
  return group;
}

/** Command-room lighting: sterile, even, cool white. */
export function buildCommandLights() {
  const group = new THREE.Group();
  group.name = 'commandLights';
  const white = PALETTE.fluorescent;

  // IMPORTANT: three.js RectAreaLights can't be occluded, so they leak through walls
  // and would light the "dark" server room. The command room uses shadow-casting
  // spots instead. Each cone is aimed and sized so no ray exits through the glass
  // (see CLAUDE.md "Lighting rules"), plus a range-limited fill light.
  const spot = (x, z, tx, tz, intensity, angle, penumbra) => {
    const s = new THREE.SpotLight(white, intensity, 0, angle, penumbra, 2);
    s.position.set(x, ROOM.height - 0.05, z);
    s.target.position.set(tx, 0, tz);
    s.castShadow = true;
    s.shadow.mapSize.set(1024, 1024);
    s.shadow.bias = -0.0004;
    s.shadow.normalBias = 0.025;
    s.shadow.camera.near = 0.2;
    s.shadow.camera.far = 10;
    group.add(s, s.target);
    return s;
  };
  spot(-2.5, 5.0, -2.5, 4.4, 34, 0.85, 1); // ray to glass bottom is ~66° off vertical; cone edge 48.7°
  spot(2.5, 5.0, 2.5, 4.4, 34, 0.85, 1);
  spot(0, 2.6, 0, 1.8, 20, 0.55, 0.6); // desk light; glass is ~36° off its axis, cone 31.5°

  // Fill: range-limited so it fades out before reaching the server-room floor (~9.4 m away).
  const fill = new THREE.PointLight(white, 9, 8.5, 1.2);
  fill.position.set(0, 2.8, 5.0);
  group.add(fill);

  // Corridor wash (range-limited).
  const cor = new THREE.PointLight(white, 3, 4, 1.5);
  cor.position.set(0, CORRIDOR.height - 0.3, 10.4);
  group.add(cor);
  return group;
}
