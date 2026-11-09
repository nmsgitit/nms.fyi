// The command room: sterile white light, light gray walls, taupe wainscot,
// a tilted glass wall at the front, and a short entry corridor behind.
import * as THREE from 'three';
import { Builder } from './builder.js';
import { ROOM, CORRIDOR, DOOR, HATCH } from './layout.js';
import { PALETTE } from './palette.js';

const PANEL_T = 0.034; // wall panel thickness including its bevel
const BEZEL_T = 0.012; // CRT screen surround thickness

/**
 * A slab with rounded corners (w along the shape's x, h along y, corner radius r), thickness t
 * including a small edge bevel. The extrusion runs along local +z starting at z = 0.
 */
function roundedSlab(w, h, r, t) {
  const s = new THREE.Shape();
  const x0 = -w / 2, x1 = w / 2, y0 = -h / 2, y1 = h / 2;
  s.moveTo(x0 + r, y0);
  s.lineTo(x1 - r, y0);
  s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x1, y1 - r);
  s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  s.lineTo(x0 + r, y1);
  s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + r);
  s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  const bevel = Math.min(0.006, t / 3);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: t - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 10,
  });
  g.translate(0, 0, bevel); // back face at z = 0, front face at z = t
  return g;
}

export function buildCommandRoom(m, leds) {
  const b = new Builder();
  const { xMin, xMax, zBack, height: H, sill } = ROOM;
  const zTop = ROOM.glassTopZ;
  // One continuous rail around the room at the height of the window-ledge cap (0.91 to 0.96 m),
  // so the side and back wall bands line up with the front ledge (user caught the mismatch).
  const RAIL_Y0 = sill - 0.04, RAIL_Y1 = sill + 0.01;

  // ---- floor + walkway mat
  b.span(m.floor, xMin, xMax, -0.06, 0, zTop, zBack);
  // The walkway mat ends in a rounded tip short of the desk, and its white trim follows the curve.
  {
    const hw = 0.75, trimW = 0.05;
    const zTip = 2.1; // front-most point of the mat (the desk's bowed front edge is at ~1.7)
    const zc = zTip + hw; // center of the rounded end
    // Shape coords: x = world x, y = -world z (the -90° x-rotation maps shape y to world -z).
    const mat = new THREE.Shape();
    mat.moveTo(-hw, -zBack);
    mat.lineTo(-hw, -zc);
    mat.absarc(0, -zc, hw, Math.PI, 0, true); // sweeps through the tip at y = -zTip
    mat.lineTo(hw, -zBack);
    mat.closePath();
    b.add(new THREE.ExtrudeGeometry(mat, { depth: 0.008, bevelEnabled: false, curveSegments: 32 }), m.floorMat, [0, 0, 0], [-Math.PI / 2, 0, 0]);
    // Trim: straight side strips plus a half-ring around the tip.
    b.span(m.trim, -hw - trimW, -hw, 0, 0.01, zc, zBack);
    b.span(m.trim, hw, hw + trimW, 0, 0.01, zc, zBack);
    b.add(new THREE.RingGeometry(hw, hw + trimW, 40, 1, 0, Math.PI), m.trim, [0, 0.0095, zc], [-Math.PI / 2, 0, 0]);
  }
  // baseboards
  b.span(m.taupeDark, xMin, xMin + 0.03, 0, 0.1, 0, zBack);
  b.span(m.taupeDark, xMax - 0.03, xMax, 0, 0.1, 0, zBack);

  // ---- ceiling (with an opening for the monitor hatch), light panels
  {
    const hx0 = HATCH.x - HATCH.w / 2, hx1 = HATCH.x + HATCH.w / 2;
    const hz0 = HATCH.z - HATCH.d / 2, hz1 = HATCH.z + HATCH.d / 2;
    b.span(m.ceiling, xMin, xMax, H, H + 0.1, zTop, hz0);
    b.span(m.ceiling, xMin, xMax, H, H + 0.1, hz1, zBack + 0.2);
    b.span(m.ceiling, xMin, hx0, H, H + 0.1, hz0, hz1);
    b.span(m.ceiling, hx1, xMax, H, H + 0.1, hz0, hz1);
  }
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
  // Hatch trim frame. The doors, shaft and monitor rig live in monitor.js.
  const hx0 = HATCH.x - HATCH.w / 2, hx1 = HATCH.x + HATCH.w / 2;
  const hz0 = HATCH.z - HATCH.d / 2, hz1 = HATCH.z + HATCH.d / 2;
  b.span(m.trim, hx0 - 0.07, hx1 + 0.07, H - 0.03, H - 0.01, hz0 - 0.07, hz0);
  b.span(m.trim, hx0 - 0.07, hx1 + 0.07, H - 0.03, H - 0.01, hz1, hz1 + 0.07);
  b.span(m.trim, hx0 - 0.07, hx0, H - 0.03, H - 0.01, hz0, hz1);
  b.span(m.trim, hx1, hx1 + 0.07, H - 0.03, H - 0.01, hz0, hz1);

  // ---- back wall with door opening
  const dw = CORRIDOR.halfW;
  b.span(m.wallUpper, xMin, -dw, 0, H, zBack, zBack + 0.2);
  b.span(m.wallUpper, dw, xMax, 0, H, zBack, zBack + 0.2);
  b.span(m.wallUpper, -dw, dw, DOOR.height, H, zBack, zBack + 0.2); // above the door (sign side faces the corridor)
  b.span(m.wallLower, xMin, -dw - 0.25, 0, RAIL_Y0, zBack - 0.025, zBack);
  b.span(m.wallLower, dw + 0.25, xMax, 0, RAIL_Y0, zBack - 0.025, zBack);
  b.span(m.beigeLight, xMin, -dw - 0.25, RAIL_Y0, RAIL_Y1, zBack - 0.035, zBack);
  b.span(m.beigeLight, dw + 0.25, xMax, RAIL_Y0, RAIL_Y1, zBack - 0.035, zBack);
  // Chunky slab door frame (rounded-over jambs + header).
  const jambW = 0.34;
  for (const s of [-1, 1]) b.rbox(m.beige, jambW, DOOR.height + 0.3, 0.55, 0.09, s * (DOOR.halfW + jambW / 2), (DOOR.height + 0.3) / 2, zBack + 0.1);
  b.rbox(m.beige, DOOR.halfW * 2 + jambW * 2, 0.34, 0.55, 0.09, 0, DOOR.height + 0.17, zBack + 0.1);

  // ---- side walls
  const panelGeom = roundedSlab(1.24, 0.86, 0.11, PANEL_T);
  const bezelGeom = roundedSlab(1.02, 0.72, 0.07, BEZEL_T);
  const crtSlots = [];
  for (const s of [-1, 1]) {
    const xw = s > 0 ? xMax : xMin; // inner face
    const xo = xw + s * 0.2;
    b.span(m.wallUpper, Math.min(xw, xo), Math.max(xw, xo), 0, H, zTop, zBack + 0.2);
    b.span(m.wallLower, Math.min(xw, xw - s * 0.025), Math.max(xw, xw - s * 0.025), 0, RAIL_Y0, 0.5, zBack);
    b.span(m.beigeLight, Math.min(xw, xw - s * 0.035), Math.max(xw, xw - s * 0.035), RAIL_Y0, RAIL_Y1, 0.5, zBack);

    // Raised wall panels, 5 columns x 2 rows, with rounded corners. The middle three columns'
    // panels are wall CRTs (screens are built by wallCrt.js from crtSlots);
    // every other panel carries a grid of blinking status lights.
    const cols = [1.25, 2.65, 4.05, 5.45, 6.85];
    const rows = [1.62, 2.62];
    const rotY = -s * Math.PI / 2; // shape x -> world z, extrusion -> into the room
    cols.forEach((z, ci) => {
      rows.forEach((y, ri) => {
        // CRT columns: the middle three (z 2.65, 4.05, 5.45); the outer columns keep status
        // lights, so each wall is symmetric: lights, CRT, CRT, CRT, lights (user request).
        const isCrt = ci >= 1 && ci <= 3;
        b.add(panelGeom, isCrt ? m.beige : m.panelInset, [xw, y, z], [0, rotY, 0]);
        const face = xw - s * PANEL_T; // the panel's front surface
        if (isCrt) {
          b.add(bezelGeom, m.grille, [face, y, z], [0, rotY, 0]); // dark screen surround
          crtSlots.push({ x: face - s * BEZEL_T, y, z, s });
        } else {
          leds.grid([face - s * 0.001, y, z], [0, 0, 1], [0, 1, 0], [-s, 0, 0], 9, 6, 0.115, 0.11, {
            size: 0.0085,
            group: 'cmd',
            intensity: 1.7,
            color: (r) => (r < 0.6 ? PALETTE.ledWarm : r < 0.78 ? PALETTE.ledAmber : r < 0.93 ? PALETTE.ledGreen : PALETTE.ledRed),
            blink: (r) => (r < 0.55 ? 0.35 + r * 3.5 : 0),
          }, 0.55);
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
  b.span(m.wallLower, -dw, -dw + 0.025, 0, RAIL_Y0, cz0, cz1);
  b.span(m.wallLower, dw - 0.025, dw, 0, RAIL_Y0, cz0, cz1);
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
  group.userData.crtSlots = crtSlots; // where wallCrt.js mounts its screens
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
