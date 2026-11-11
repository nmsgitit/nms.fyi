// Development helpers. Activated by URL flags; never shown to normal visitors.
//
//   ?debug   free orbit camera (O toggles back to the walk camera) + HUD
//   ?lit     server room fully powered (preview the layout)
//   ?skip    skip the walk; start at the desk
//
// Dev keys (only in `npm run dev` or with ?debug; never for normal visitors):
//   L toggle server-room power, O toggle orbit camera, H toggle HUD
//   (R/M/P replays live in main.js under the same gate.)
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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

  const devKeys = params.has('debug') || import.meta.env.DEV;
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

  return {
    orbitActive: () => orbitOn,
    log(msg) {
      lines.push(msg);
      if (lines.length > 4) lines.shift();
    },
    update(dt) {
      if (orbitOn && orbit) orbit.update();
      frames++; acc += dt;
      if (acc >= 0.5) { fps = Math.round(frames / acc); frames = 0; acc = 0; }
      if (!hud.hidden) {
        const p = camera.position;
        const info = renderer.info.render;
        hud.textContent = `fps ${fps}  calls ${info.calls}  tris ${(info.triangles / 1000).toFixed(0)}k\n` +
          `cam ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)}  walk ${walk.state} ${walk.t.toFixed(1)}/${walk.duration.toFixed(1)}s\n` +
          lines.join('\n');
      }
    },
  };
}
