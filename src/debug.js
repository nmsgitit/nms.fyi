// Development helpers. Activated by URL flags; never shown to normal visitors.
//
//   ?debug   free orbit camera (O toggles back to the walk camera) + HUD
//   ?lit     server room fully powered (preview the layout)
//   ?skip    skip the walk; start at the desk
//
// Everything here is dev-build only (user): full.js strips ?debug/?lit from the URL on the live site.
// Dev keys (only in `npm run dev`):
//   L toggle server-room power, O toggle orbit camera, H toggle HUD
//   (R/M/P replays live in full.js under the same check.)
// C: freecam (freecam.js), `npm run dev` only.
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Freecam } from './freecam.js';

export function createDebug({ params, renderer, camera, walk, setLit }) {
  const hud = document.getElementById('debug-hud');
  let orbit = null;
  let orbitOn = false;
  let lit = params.has('lit');
  let frames = 0, acc = 0, fps = 0;
  const lines = [];

  function ensureOrbit() {
    if (orbit) return orbit;
    orbit = new OrbitControls(camera, renderer.domElement);
    orbit.target.set(0, 0, -10);
    orbit.enableDamping = true;
    if (import.meta.env.DEV) window.orbit = orbit; // posing shots from the console (welcome-page stills)
    return orbit;
  }

  if (params.has('debug')) {
    hud.hidden = false;
    ensureOrbit();
    orbitOn = true;
    camera.position.set(0, 6, 12);
  }

  const api = { onFreecam: null };
  let freecam = null;
  if (import.meta.env.DEV) {
    let hudWasHidden = true;
    freecam = new Freecam({
      camera,
      canvas: renderer.domElement,
      // Not while the desktop is up or before the experience has started (loading screen).
      isBlocked: () => document.getElementById('os')?.classList.contains('on') || !document.body.dataset.started,
      onChange: (on) => {
        if (orbit) orbit.enabled = !on && orbitOn;
        if (on) { hudWasHidden = hud.hidden; hud.hidden = false; } else hud.hidden = hudWasHidden;
        api.onFreecam?.(on);
      },
    });
  }

  const devKeys = import.meta.env.DEV; // never on the live site (full.js also strips ?debug/?lit there)
  window.addEventListener('keydown', (e) => {
    if (!devKeys || document.getElementById('os')?.classList.contains('on')) return;
    if (e.target instanceof HTMLInputElement) return;
    const k = e.key.toLowerCase();
    if (k === 'l') { lit = !lit; setLit(lit); }
    if (k === 'o') {
      orbitOn = !orbitOn;
      ensureOrbit().enabled = orbitOn;
    }
    if (k === 'h') hud.hidden = !hud.hidden;
  });

  return Object.assign(api, {
    /** True while a debug camera (orbit or freecam) owns the camera, so the walk must not move it. */
    orbitActive: () => orbitOn || !!freecam?.active,
    log(msg) {
      lines.push(msg);
      if (lines.length > 4) lines.shift();
    },
    update(dt) {
      if (freecam?.active) freecam.update(dt);
      else if (orbitOn && orbit) orbit.update();
      frames++; acc += dt;
      if (acc >= 0.5) { fps = Math.round(frames / acc); frames = 0; acc = 0; }
      if (!hud.hidden) {
        const p = camera.position;
        const info = renderer.info.render;
        hud.textContent = `fps ${fps}  calls ${info.calls}  tris ${(info.triangles / 1000).toFixed(0)}k\n` +
          (freecam?.active ? freecam.status() + '\n'
            : `cam ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)}  walk ${walk.state} ${walk.t.toFixed(1)}/${walk.duration.toFixed(1)}s\n`) +
          lines.join('\n');
      }
    },
  });
}
