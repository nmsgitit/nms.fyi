// The full experience: the 3D command room, server room, walk-in, monitor, sound and the
// desktop on the monitor. Loaded on demand by main.js (a separate chunk) only after the visitor
// picks "Full experience", so the chooser and the light/mobile desktop never download three.js.
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
import { buildServerRoom, populateServerRoom, buildServerLights, addCatwalkDoors } from './scene/serverRoom.js';
import { buildSupercomputer, buildCoreLights } from './scene/supercomputer.js';
import { WALK } from './scene/layout.js';
import { MonitorRig, MONITOR, RAISE } from './scene/monitor.js';
import { WallCRTs } from './scene/wallCrt.js';
import { DesktopOS } from './os/os.js';
import { TerminalFocus } from './sequence/focus.js';
import { HotkeyPanel } from './ui/hotkeys.js';
import { LookAround } from './sequence/lookAround.js';
import { buildDeskNote } from './scene/deskNote.js';
import { HydraulicDoor } from './scene/door.js';
import { DoorIntro } from './sequence/intro.js';
import { CctvSystem } from './scene/cctv.js';
import { CameraApp } from './apps/cameras.js';
import './os/os.css';
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
scene.fog = new THREE.FogExp2(0x030304, 0.009); // lighter: the supercomputer is now ~43 m from the desk

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.05, 140);

// ---------------------------------------------------------------- world
const m = createMaterials(renderer.capabilities.getMaxAnisotropy());
// Only the glass gets an environment map (captured below). A scene-wide
// environment would light the "dark" server room.
const pmrem = new THREE.PMREMGenerator(renderer);
m.serverFloor.map.repeat.set(32 / 0.6, 43.4 / 0.6); // hall + half-circle bay (floor plane spans z -44..-0.6)

const leds = new LedField(8000);
const commandRoom = buildCommandRoom(m, leds);
scene.add(commandRoom);
const wallCrts = new WallCRTs(commandRoom.userData.crtSlots, { cctv: null }); // side-wall CRTs (cctv attached below)
const door = new HydraulicDoor(m); // entrance door + "Command Room" sign
scene.add(door.group);
scene.add(wallCrts.group);
scene.add(buildDesk(m, leds));

const { builder: serverBuilder } = buildServerRoom(m);
populateServerRoom(serverBuilder, m, leds);
buildSupercomputer(serverBuilder, m, leds);
for (const d of addCatwalkDoors(m, serverBuilder, HydraulicDoor)) scene.add(d.group); // catwalk access doors
scene.add(serverBuilder.build({ name: 'serverRoom', castShadow: true, receiveShadow: true }));

scene.add(leds.build());
const cctv = new CctvSystem(); // security cameras in the server room's four upper corners
scene.add(cctv.group);
wallCrts.cctv = cctv;
scene.add(buildDeskNote()); // handwritten operator note next to the keyboard: "press Q" 
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
// The terminal no longer drops during the walk-in (user request): the visitor watches the
// power-up through the window, then lowers it themselves with Q (the note on the desk says so).

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
muteBtn.hidden = false;
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
// The power-up runs on its original clock (user: everything comes online a couple of steps
// before the visitor stops): it starts MONITOR.total before the walk ends (breaker 1 at walk 7.4 s,
// breaker 2 at 8.5 s, walk ends 9.9 s). The terminal then descends ON ITS OWN 2 s after the
// server room is fully powered (reveal 'lit', 4 s after breaker 2), so nobody has to know about Q.
const revealTrigger = Math.max(0, walk.duration - MONITOR.total);
const AUTO_DESCEND_AFTER_LIT = 2.0;
let autoDescendAt = 0, autoDescended = false;
walk.on('arrive', () => debug?.log?.('arrived'));
reveal.on('lit', () => { if (!autoDescended) autoDescendAt = elapsed + AUTO_DESCEND_AFTER_LIT; });
const intro = new DoorIntro({ door, walk, sound }); // corridor door opening sequence

const debug = createDebug({ params, renderer, scene, camera, walk, setLit, leds });

// ---------------------------------------------------------------- LAMPLIGHT OS (stage 6)
// The HTML desktop, and the camera glide into the monitor that reveals it.
const cameraApp = new CameraApp({ renderer, scene, cctv, sound });
const os = new DesktopOS({
  mode: 'full',
  onExit: () => focus.exit(),
  onClick: (kind) => sound.ready && sound.uiClick(kind),
  apps: { cameras: cameraApp },
});
const focus = new TerminalFocus({ camera, walk, monitor, os, sound, canvas });
// F: look around from the desk with the mouse (sequence/lookAround.js).
const look = new LookAround({
  camera, canvas, walk,
  isBlocked: () => os.isOpen || ['zoomingIn', 'zoomingOut', 'open'].includes(focus.state),
});
focus.isLooking = () => look.active;
const _focusIn = focus.focusIn.bind(focus);
focus.focusIn = () => {
  if (focus.state !== 'ready') return;
  look.cancel(); // E while looking around glides into the screen from the current view
  hotkeys.setBarVisible(false);
  _focusIn();
};
const _focusExit = focus.exit.bind(focus);
focus.exit = () => { _focusExit(); hotkeys.setBarVisible(true); };
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() !== 'f' || e.repeat || os.isOpen || !gateEl.classList.contains('hidden')) return;
  if (look.active) look.exit();
  else look.enter();
});
monitor.on('desktop', () => {
  focus.enable();
  wallCrts.goLive(); // the wall CRTs finish booting with it, then show feeds and readouts
  if (sound.ready) sound.startupChime();
});
monitor.on('screenOn', () => wallCrts.wake()); // they wake from sleep and boot alongside the terminal
monitor.on('raise', () => wallCrts.sleep()); // and go back to sleep when it's put away

// Tab: show/hide the controls list (3D view only; inside the desktop Tab moves keyboard focus).
const hotkeys = new HotkeyPanel(() => ({
  canUse: focus.state === 'ready',
  canRaise: focus.state === 'ready' && monitor.state === 'down',
  canLower: monitor.state === 'stowed' && (walk.state === 'arrived' || look.active) && focus.state === 'unavailable',
  canLook: look.canEnter(),
  looking: look.active,
}));
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab' || os.isOpen || !gateEl.classList.contains('hidden')) return;
  e.preventDefault();
  hotkeys.toggle();
});
for (const evt of ['desktop', 'raise', 'stowed', 'start']) monitor.on(evt, () => hotkeys.refresh());
look.on('change', () => hotkeys.refresh());

// Q: raise the monitor back into the ceiling, only once the visitor has exited the desktop
// (they're at the desk, desktop closed). Pressing Q again lowers it and boots it back up.
function lowerMonitor() {
  if (monitor.state !== 'stowed' || !(walk.state === 'arrived' || look.active) || focus.state !== 'unavailable') return;
  focus.prompt.classList.remove('show');
  monitor.start(); // full descent + boot; its 'desktop' event re-enables focusing
}
focus.onLowerRequest = lowerMonitor;
monitor.on('raise', () => sound.ready && sound.monitorRaise(RAISE));
monitor.on('stowed', () => { focus.showLowerPrompt(); hotkeys.refresh(); });
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() !== 'q' || e.repeat || os.isOpen) return;
  if (focus.state === 'ready' && monitor.state === 'down') {
    focus.disable();
    monitor.raise();
  } else if (monitor.state === 'stowed') {
    lowerMonitor();
  }
});

if (params.has('lit')) setLit(true);
// ?skip = skip the intro: the end state (at the desk, room powered, terminal down and booted,
// wall CRTs live). ?skip&up keeps the terminal in the ceiling; ?dark keeps the room unpowered
// (and the terminal up). ?os = straight into the desktop.
if (params.has('skip') || params.has('os')) {
  walk.jumpToEnd();
  autoDescended = true;
  if (!params.has('dark')) reveal.finish();
  if (params.has('os') || !(params.has('up') || params.has('dark'))) {
    monitor.setDown();
    wallCrts.setLiveNow();
    focus.enable();
  }
  if (params.has('os')) { focus.focusIn(); focus.t = focus.dur; }
}
// Dev replay keys: only in `npm run dev` or with ?debug (never for normal visitors).
const devKeys = params.has('debug') || import.meta.env.DEV;
window.addEventListener('keydown', (e) => {
  if (!devKeys || os.isOpen) return; // the desktop has the keyboard
  const k = e.key.toLowerCase();
  if (k === 'm' || k === 'r') focus.disable();
  // M: replay the terminal drop + boot (and the wall CRTs waking).
  if (k === 'm') { sound.resetMonitor(); monitor.reset(); wallCrts.sleepNow(); monitor.start(); }
  if (k === 'p') { sound.resetServer(); reveal.start(elapsed); } // replay the power-up
  if (k === 'r') { // replay the whole intro from the corridor
    look.cancel(); sound.resetMonitor(); sound.resetServer(); monitor.reset(); reveal.reset(); wallCrts.sleepNow();
    autoDescendAt = 0; autoDescended = false;
    walk.placeAtStart(); intro.reset(); intro.start();
  }
});

// ---------------------------------------------------------------- gate
function enter() {
  gateEl.classList.add('hidden');
  enterBtn.blur();
  startSound(); // inside the click: browsers allow audio to start here
  hotkeys.setBarVisible(true);
  if (!params.has('skip')) intro.start(); // door opens, then the walk begins (intro.js)
}
enterBtn.addEventListener('click', enter);
gateStatus.textContent = 'Ready';
enterBtn.disabled = false;
if (params.has('skip') || params.has('debug') || params.has('os')) {
  gateEl.classList.add('hidden');
  // No gate click in these modes, so the first click or key anywhere unlocks sound.
  const unlock = () => startSound();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  if (!['zoomingIn', 'open'].includes(focus.state)) hotkeys.setBarVisible(true);
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
  focus.update(dt);
  if (focus.paused3D) {
    // The desktop covers the screen: skip 3D work, except the security-camera feed when it's open.
    if (cameraApp.wantsFrame) {
      reveal.update(elapsed);
      leds.update(elapsed);
      cameraApp.render(dt, cctv.update(dt));
    }
    requestAnimationFrame(frame);
    return;
  }
  cctv.update(dt);
  look.update(dt);
  intro.update(dt);
  if (!debug.orbitActive()) walk.update(dt);
  if (autoDescendAt && elapsed >= autoDescendAt) {
    autoDescendAt = 0;
    autoDescended = true;
    lowerMonitor(); // same as pressing Q (no-op if the visitor already lowered it)
  }
  if (reveal.state === 'dark' && walk.state === 'walking' && walk.t >= revealTrigger) reveal.start(elapsed);
  monitor.update(dt);
  wallCrts.update(dt);
  wallCrts.renderFeeds(renderer, scene); // CCTV feeds for the wall CRTs that show one
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
  focus.onResize();
});

// Expose for console debugging in development.
if (import.meta.env.DEV) Object.assign(window, { THREE, scene, camera, renderer, walk, setLit, leds, monitor, reveal, sound, wallCrts, os, focus, cctv, cameraApp, look, hotkeys, canvas, door, intro });
