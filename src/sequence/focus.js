// Terminal focus: once the monitor shows the desktop, pressing E (or clicking the monitor,
// or tapping the prompt) glides the camera into the screen until it fills the view, then
// the HTML desktop fades in over it and 3D rendering pauses. Exit (in the lamp launcher)
// fades the desktop out and glides the camera back to the desk.
import * as THREE from 'three';

const SCREEN_W = 0.44, SCREEN_H = 0.335; // the monitor's screen glass (tools/blender/monitor.py)
const easeInOutCubic = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export class TerminalFocus {
  constructor({ camera, walk, monitor, os, sound, canvas }) {
    Object.assign(this, { camera, walk, monitor, os, sound, canvas });
    this.state = 'unavailable'; // unavailable | ready | zoomingIn | open | zoomingOut
    this.t = 0;
    this.dur = 1.15;
    this.from = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
    this.to = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
    this.raycaster = new THREE.Raycaster();

    this.touch = matchMedia('(pointer: coarse)').matches;
    this.onLowerRequest = null; // set by main.js: lower the stowed monitor again
    const prompt = (this.prompt = document.createElement('button'));
    prompt.id = 'terminal-prompt';
    prompt.type = 'button';
    this.setPromptMode('ready');
    prompt.addEventListener('click', () => (this.promptMode === 'stowed' ? this.onLowerRequest?.() : this.focusIn()));
    document.body.append(prompt);

    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'e' && !e.repeat && !this.os.isOpen && !(e.target instanceof HTMLInputElement)) this.focusIn();
    });
    canvas.addEventListener('click', (e) => {
      if (this.state !== 'ready' || this.isLooking?.()) return; // while looking around, clicks don't focus
      const r = canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(ndc, camera);
      if (this.raycaster.intersectObject(monitor.holder, true).length) this.focusIn();
    });
  }

  get paused3D() { return this.state === 'open'; }

  /** 'ready': use it (and raise it, on keyboards); 'stowed': lower it again (F). */
  setPromptMode(mode) {
    this.promptMode = mode;
    if (mode === 'stowed') this.prompt.innerHTML = '<kbd>F</kbd>Lower the terminal';
    else this.prompt.innerHTML = this.touch
      ? 'Tap to use the terminal'
      : '<kbd>E</kbd>Use the terminal<span class="prompt-sep"></span><kbd>F</kbd>Raise it';
  }

  /** Show the on-screen prompt. Touch devices only: keyboards use the Tab controls panel instead. */
  showPrompt() {
    if (this.touch && this.promptMode === 'ready') this.prompt.classList.add('show');
  }

  /** The monitor is back in the ceiling (keyboards only reach this: there's no F on touch). */
  showLowerPrompt() {
    this.setPromptMode('stowed');
  }

  /** The desktop is up on the monitor: allow focusing, and show the prompt after a beat. */
  enable() {
    if (this.state !== 'unavailable') return;
    this.state = 'ready';
    this.setPromptMode('ready');
    clearTimeout(this._promptTimer);
    this._promptTimer = setTimeout(() => { if (this.state === 'ready') this.showPrompt(); }, 900);
  }

  disable() {
    this.state = 'unavailable';
    this.prompt.classList.remove('show');
    clearTimeout(this._promptTimer);
  }

  /** Camera pose that frames the monitor's screen edge to edge. */
  computeScreenPose(out) {
    const tilt = this.monitor.tiltNode || this.monitor.holder;
    const screen = this.monitor.screenMesh;
    this.monitor.group.updateMatrixWorld(true);
    const center = new THREE.Vector3();
    if (screen) new THREE.Box3().setFromObject(screen).getCenter(center);
    else this.monitor.holder.getWorldPosition(center);
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(tilt.matrixWorld).normalize();
    const cam = this.camera;
    const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    // Fit height on wide screens, width on narrow (phone) screens.
    const dist = Math.max((SCREEN_H / 2) / tanV, (SCREEN_W / 2) / (tanV * cam.aspect)) * 1.02;
    out.p.copy(center).addScaledVector(normal, dist);
    const m = new THREE.Matrix4().lookAt(out.p, center, new THREE.Vector3(0, 1, 0));
    out.q.setFromRotationMatrix(m);
  }

  focusIn() {
    if (this.state !== 'ready') return;
    this.prompt.classList.remove('show');
    this.walk.state = 'idle'; // we drive the camera now
    this.from.p.copy(this.camera.position);
    this.from.q.copy(this.camera.quaternion);
    this.computeScreenPose(this.to);
    this.state = 'zoomingIn';
    this.t = 0;
    this.sound?.ready && this.sound.duck(true);
  }

  exit() {
    if (this.state !== 'open') return;
    this.os.hide();
    // Back to the standing pose at the desk.
    this.from.p.copy(this.camera.position);
    this.from.q.copy(this.camera.quaternion);
    this.walk.apply(this.walk.duration);
    this.to.p.copy(this.camera.position);
    this.to.q.copy(this.camera.quaternion);
    this.camera.position.copy(this.from.p);
    this.camera.quaternion.copy(this.from.q);
    this.state = 'zoomingOut';
    this.t = 0;
    this.sound?.ready && this.sound.duck(false);
  }

  update(dt) {
    if (this.state !== 'zoomingIn' && this.state !== 'zoomingOut') return;
    this.t += dt;
    const k = easeInOutCubic(Math.min(1, this.t / this.dur));
    this.camera.position.lerpVectors(this.from.p, this.to.p, k);
    this.camera.quaternion.slerpQuaternions(this.from.q, this.to.q, k);
    if (this.t >= this.dur) {
      if (this.state === 'zoomingIn') {
        this.state = 'open';
        this.os.show();
      } else {
        this.state = 'ready';
        this.walk.state = 'arrived';
        this.showPrompt();
      }
    }
  }

  /** Re-frame after a resize while the desktop is open, so returning starts from the right spot. */
  onResize() {
    if (this.state === 'open') {
      this.computeScreenPose(this.to);
      this.camera.position.copy(this.to.p);
      this.camera.quaternion.copy(this.to.q);
    }
  }
}
