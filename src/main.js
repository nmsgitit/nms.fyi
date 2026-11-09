// nms.fyi entry point.
// Stage 1: command room, server room, supercomputer, walking camera.
// Stage 2: overhead monitor (Blender model) dropping from a ceiling hatch during the walk.
// Stage 3: server-room power-up (sequence/reveal.js) on the monitor's clock.
// Stage 4: procedural sound (audio/sound.js). Stage 5: boot screen. Next: OS (stage 6).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

import { createMaterials } from './scene/materials.js';
import { LedField } from './scene/leds.js';
import { buildCommandRoom, buildCommandLights } from './scene/commandRoom.js';
import { buildDesk } from './scene/desk.js';
import { buildServerRoom, populateServerRoom, buildServerLights } from './scene/serverRoom.js';
import { buildSupercomputer, buildCoreLights } from './scene/supercomputer.js';
import { WALK } from './scene/layout.js';
import { MonitorRig, MONITOR } from './scene/monitor.js';
import { Reveal } from './sequence/reveal.js';
import { SoundDesign } from './audio/sound.js';
import { Walk } from './camera/walk.js';
import { createDebug } from './debug.js';

const params = new URLSearchParams(location.search);
const gateEl = document.getElementById('gate');
const gateStatus = document.getElementById('gate-status');
const enterBtn = document.getElementById('gate-enter');

function webgl2Available() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

if (!webgl2Available()) {
  gateStatus.textContent = 'This experience needs WebGL 2, which this browser or device doesn’t provide.';
  throw new Error('WebGL2 unavailable');
}

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
RectAreaLightUniformsLib.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020203);
scene.fog = new THREE.FogExp2(0x030304, 0.012);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.05, 140);

// ---------------------------------------------------------------- world
const m = createMaterials(renderer.capabilities.getMaxAnisotropy());
// Only the glass gets an environment map (captured below). A scene-wide
// environment would light the "dark" server room.
const pmrem = new THREE.PMREMGenerator(renderer);
m.serverFloor.map.repeat.set(32 / 0.6, 27.4 / 0.6);

const leds = new LedField(8000);
scene.add(buildCommandRoom(m, leds));
scene.add(buildDesk(m, leds));

const { builder: serverBuilder } = buildServerRoom(m);
populateServerRoom(serverBuilder, m, leds);
buildSupercomputer(serverBuilder, m, leds);
scene.add(serverBuilder.build({ name: 'serverRoom', castShadow: true, receiveShadow: true }));

scene.add(leds.build());
const commandLights = buildCommandLights();
scene.add(commandLights);
const serverLights = buildServerLights(m);
const coreLights = buildCoreLights(m);
scene.add(serverLights.group, coreLights.group);

// Command room and desk indicators are powered from the start.
leds.forceGroup('cmd', true);
leds.forceGroup('desk', true);
leds.update(0);

// Glass reflections come from the real command room: capture it once into a cube map
// from roughly where the visitor stands, with the server room still dark.
{
  const glassMeshes = [];
  scene.traverse((o) => { if (o.isMesh && o.material === m.glass) glassMeshes.push(o); });
  glassMeshes.forEach((g) => (g.visible = false));
  // Clamp the HDR light panels during capture: PMREM blurs a tiny very bright panel
  // into a hot dot that sits right over the supercomputer.
  const panelColors = [m.lightPanel, m.corridorPanel].map((mat) => mat.color.clone());
  m.lightPanel.color.setScalar(0.85);
  m.corridorPanel.color.setScalar(0.6);
  const cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
  const cubeCam = new THREE.CubeCamera(0.05, 80, cubeRT);
  cubeCam.position.set(0, 1.65, 2.55); // the visitor's final standing position
  scene.add(cubeCam);
  cubeCam.update(renderer, scene);
  m.glass.envMap = pmrem.fromCubemap(cubeRT.texture).texture;
  scene.remove(cubeCam);
  cubeRT.dispose();
  glassMeshes.forEach((g) => (g.visible = true));
  m.lightPanel.color.copy(panelColors[0]);
  m.corridorPanel.color.copy(panelColors[1]);
}

// ---------------------------------------------------------------- overhead monitor
const monitor = new MonitorRig(m);
scene.add(monitor.group);
try {
  await monitor.load('/models/monitor.glb');
} catch (err) {
  console.error('Monitor model failed to load', err);
}
// The descent starts so the monitor arrives as the walk ends.
let monitorTrigger = 0;

// ---------------------------------------------------------------- server-room power-up
// Built after the glass capture (which briefly changes the panel colors).
const reveal = new Reveal({ coreLights, serverLights, commandLights, panelMats: [m.lightPanel, m.corridorPanel], leds });
reveal.on('breaker', (e) => debug?.log?.(`breaker ${e.index}`));
const setLit = (on) => (on ? reveal.finish() : reveal.reset()); // debug L key, ?lit

// ---------------------------------------------------------------- sound (stage 4)
// The AudioContext can only start from a user gesture: the Enter click (or, with ?skip,
// the first click anywhere). Every hook is a no-op until then.
const sound = new SoundDesign();
reveal.on('breaker', (e) => sound.ready && sound.breaker(e.strength));
reveal.on('row', (e) => sound.ready && sound.tubeStrike(e.row));
reveal.on('fans', () => sound.ready && sound.fans());
monitor.on('start', () => sound.ready && sound.monitorSequence(MONITOR));

const muteBtn = document.getElementById('mute');
function applyMute(muted) {
  sound.setMuted(muted);
  muteBtn.setAttribute('aria-pressed', String(muted));
  muteBtn.textContent = muted ? 'Sound off' : 'Sound on';
  try { localStorage.setItem('nms-muted', muted ? '1' : '0'); } catch { /* storage unavailable */ }
}
let startMuted = false;
try { startMuted = localStorage.getItem('nms-muted') === '1'; } catch { /* storage unavailable */ }
applyMute(startMuted);
muteBtn.addEventListener('click', () => applyMute(!sound.muted));
async function startSound() {
  await sound.start();
  sound.ambience();
  if (reveal.state === 'lit') sound.serverAmbience();
}

// ---------------------------------------------------------------- post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.38, 0.5, 0.95);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------- camera walk
const walk = new Walk(camera, WALK);
walk.placeAtStart();
walk.on('step', (e) => {
  debug?.log?.(`step ${e.index} ${e.foot}`);
  if (sound.ready) sound.footstep(e);
});
walk.on('arrive', () => debug?.log?.('arrived'));

const debug = createDebug({ params, renderer, scene, camera, walk, setLit, leds });

if (params.has('lit')) setLit(true);
monitorTrigger = Math.max(0, walk.duration - MONITOR.total);
// ?skip = skip the intro: at the desk, monitor down, room powered (?dark keeps it unpowered).
if (params.has('skip')) {
  walk.jumpToEnd();
  monitor.setDown();
  if (!params.has('dark')) reveal.finish();
}
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  // M: replay the monitor drop together with the power-up (they share a clock).
  if (k === 'm') { sound.resetMonitor(); sound.resetServer(); monitor.reset(); monitor.start(); reveal.start(elapsed); }
  if (k === 'p') { sound.resetServer(); reveal.start(elapsed); } // replay just the power-up
  if (k === 'r') { sound.resetMonitor(); sound.resetServer(); monitor.reset(); reveal.reset(); } // walk restart re-triggers
});

// ---------------------------------------------------------------- gate
function enter() {
  gateEl.classList.add('hidden');
  enterBtn.blur();
  startSound(); // inside the click: browsers allow audio to start here
  if (!params.has('skip')) walk.begin();
}
enterBtn.addEventListener('click', enter);
gateStatus.textContent = 'Ready';
enterBtn.disabled = false;
if (params.has('skip') || params.has('debug')) {
  gateEl.classList.add('hidden');
  // No gate click in these modes, so the first click or key anywhere unlocks sound.
  const unlock = () => startSound();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

// ---------------------------------------------------------------- loop
const timer = new THREE.Timer();
let elapsed = 0;
function frame() {
  timer.update();
  // Clamp only big gaps (tab switches). A tighter clamp would play the intro in slow
  // motion on devices below that frame rate.
  const dt = Math.min(timer.getDelta(), 0.1);
  elapsed += dt;
  if (!debug.orbitActive()) walk.update(dt);
  if (monitor.state === 'stowed' && walk.state === 'walking' && walk.t >= monitorTrigger) {
    monitor.start();
    reveal.start(elapsed);
  }
  monitor.update(dt);
  reveal.update(elapsed);
  leds.update(elapsed);
  debug.update(dt);
  composer.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.setSize(w, h);
});

// Expose for console debugging in development.
if (import.meta.env.DEV) Object.assign(window, { THREE, scene, camera, renderer, walk, setLit, leds, monitor, reveal, sound });
