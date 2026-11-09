// nms.fyi entry point.
// Stage 1: command room + server room + supercomputer rough version, with the walking
// camera. Stage 2 adds the monitor drop, the timed reveal, and sound.
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
scene.add(buildCommandLights());
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

// ---------------------------------------------------------------- server-room power levels
// Stage 2 will animate these on a timeline. Stage 1 exposes them for preview.
const power = { core: 0, room: 0 };
function applyPower() {
  for (const { light, max } of coreLights.lights) light.intensity = max * power.core;
  for (const { mat, max } of coreLights.emissives) mat.color.copy(max).multiplyScalar(power.core);
  for (const { light, max } of serverLights.room) light.intensity = max * power.room;
  for (const { mat, max } of serverLights.fixtures) mat.color.copy(max).multiplyScalar(power.room);
}
function setLit(on) {
  power.core = power.room = on ? 1 : 0;
  ['core', 'banks', 'racks'].forEach((g) => leds.forceGroup(g, on));
  applyPower();
}
applyPower();

// ---------------------------------------------------------------- post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.38, 0.5, 0.95);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------- camera walk
const walk = new Walk(camera, WALK);
walk.placeAtStart();
walk.on('step', (e) => debug?.log?.(`step ${e.index} ${e.foot}`));
walk.on('arrive', () => debug?.log?.('arrived'));

const debug = createDebug({ params, renderer, scene, camera, walk, setLit, power, leds });

if (params.has('lit')) setLit(true);
if (params.has('skip')) walk.jumpToEnd();

// ---------------------------------------------------------------- gate
function enter() {
  gateEl.classList.add('hidden');
  enterBtn.blur();
  if (!params.has('skip')) walk.begin();
}
enterBtn.addEventListener('click', enter);
gateStatus.textContent = 'Ready';
enterBtn.disabled = false;
if (params.has('skip') || params.has('debug')) gateEl.classList.add('hidden');

// ---------------------------------------------------------------- loop
const timer = new THREE.Timer();
let elapsed = 0;
function frame() {
  timer.update();
  const dt = Math.min(timer.getDelta(), 1 / 20);
  elapsed += dt;
  if (!debug.orbitActive()) walk.update(dt);
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
if (import.meta.env.DEV) Object.assign(window, { THREE, scene, camera, renderer, walk, setLit, power, applyPower, leds });
