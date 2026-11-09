// Opening sequence: the visitor starts in the corridor facing the closed hydraulic door.
// After the Enter click: three locking bolts release, the status bar blinks amber then turns
// green, a pressure hiss, and the heavy leaves slide apart. The walk starts as they finish
// opening; once the visitor is just past the doorway, the door closes and slams behind them
// (heard, not seen). The rest of the sequence (monitor, power-up) continues from the walk.
const easeInOutCubic = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

export const DOOR_TIMING = {
  bolts: [0.0, 0.2, 0.4], // locking bolts release
  statusGreen: 0.62, // status bar: blinking amber -> green
  hiss: 0.6, // pressure-release hiss
  openStart: 0.75, openDur: 1.6, // leaves slide apart
  walkStart: 1.75, // the visitor starts walking as the leaves finish opening
  closeAfterDist: 3.35, // walk distance (m) at which the door starts closing: ~0.25 m past the doorway
  closeDur: 0.6, // leaves slide shut, then the slam
};

/** Heavy door motion: a brief hesitation as the seals break, then a smooth slide. */
const heavy = (k) => (k < 0.08 ? k * 0.25 : 0.02 + 0.98 * easeInOutCubic((k - 0.08) / 0.92));

export class DoorIntro {
  constructor({ door, walk, sound }) {
    Object.assign(this, { door, walk, sound });
    this.state = 'idle'; // idle | opening | open | closing | closed
    this.t = 0;
  }

  start() {
    this.state = 'opening';
    this.t = 0;
    this.walkStarted = false;
    this.door.setOpen(0);
    this.door.setStatus('unlocking');
    if (this.sound?.ready) this.sound.doorOpen(DOOR_TIMING);
  }

  reset() {
    this.state = 'idle';
    this.door.setOpen(0);
    this.door.setStatus('locked');
  }

  update(dt, time) {
    const D = DOOR_TIMING;
    if (this.state === 'opening' || this.state === 'open') {
      this.t += dt;
      if (this.t < D.statusGreen) this.door.blink(time);
      else if (this.door.status !== 'open') this.door.setStatus('open');
      const k = clamp01((this.t - D.openStart) / D.openDur);
      this.door.setOpen(heavy(k));
      if (k >= 1) this.state = 'open';
      if (!this.walkStarted && this.t >= D.walkStart) {
        this.walkStarted = true;
        this.walk.begin();
      }
      if (this.walkStarted && this.walk.distanceAt(this.walk.t) >= D.closeAfterDist) {
        this.state = 'closing';
        this.t = 0;
        this.door.setStatus('locked');
        if (this.sound?.ready) this.sound.doorClose(D);
      }
    } else if (this.state === 'closing') {
      this.t += dt;
      const k = clamp01(this.t / D.closeDur);
      this.door.setOpen(1 - easeInOutCubic(k));
      if (k >= 1) this.state = 'closed';
    }
  }
}
