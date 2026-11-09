// Opening sequence: the visitor starts in the corridor facing the closed door (door.js).
// After the Enter click the door's green light flashes with three affirmative chirps, then a
// brief hiss as the panel slides up. The walk starts as it opens; once the visitor is just
// past the doorway it slides back down behind them with a hiss and a soft thud (heard, not
// seen). The rest of the sequence (monitor, power-up) continues from the walk.
const easeInOutCubic = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

export const DOOR_TIMING = {
  chirps: [0.15, 0.32, 0.49], // three affirmative chirps; the green LED flashes with each
  flashLen: 0.1,
  statusGreen: 0.62, // green steady
  hiss: 0.64, // brief hiss as it opens
  openStart: 0.66, openDur: 0.55, // panel slides up
  walkStart: 0.95,
  closeAfterDist: 3.35, // walk distance (m) when it closes: ~0.25 m past the doorway
  closeDur: 0.5, // slides down, then a soft thud
};

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

  update(dt) {
    const D = DOOR_TIMING;
    if (this.state === 'opening' || this.state === 'open') {
      this.t += dt;
      if (this.t < D.statusGreen) {
        this.door.flash(D.chirps.some((c) => this.t >= c && this.t < c + D.flashLen));
      } else if (this.door.status !== 'open') {
        this.door.setStatus('open');
      }
      const k = clamp01((this.t - D.openStart) / D.openDur);
      this.door.setOpen(easeInOutCubic(k));
      if (k >= 1) this.state = 'open';
      if (!this.walkStarted && this.t >= D.walkStart) {
        this.walkStarted = true;
        this.walk.begin();
      }
      if (this.walkStarted && this.walk.distanceAt(this.walk.t) >= D.closeAfterDist) {
        this.state = 'closing';
        this.t = 0;
        if (this.sound?.ready) this.sound.doorClose(D);
      }
    } else if (this.state === 'closing') {
      this.t += dt;
      const k = clamp01(this.t / D.closeDur);
      this.door.setOpen(1 - easeInOutCubic(k));
      if (k >= 1) {
        this.state = 'closed';
        this.door.setStatus('locked');
      }
    }
  }
}
