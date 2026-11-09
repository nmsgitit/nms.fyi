// Controls panel: Tab shows/hides the list of hotkeys (user request: cleaner than prompts at
// the bottom of the screen). Entries that don't apply right now are dimmed. A small
// "Tab for controls" hint fades in once, the first time the terminal becomes usable.
// Keyboard devices only; touch devices keep the tap prompt (focus.js).

export class HotkeyPanel {
  /** state(): { canUse, canRaise, canLower } decides which entries are active. */
  constructor(state) {
    this.state = state;
    this.touch = matchMedia('(pointer: coarse)').matches;

    const panel = (this.panel = document.createElement('div'));
    panel.id = 'hotkeys';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Controls');
    panel.hidden = true;
    document.body.append(panel);

    const hint = (this.hint = document.createElement('div'));
    hint.id = 'hotkeys-hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.innerHTML = '<kbd>Tab</kbd>Controls';
    document.body.append(hint);
    this.hinted = false;
  }

  get open() { return !this.panel.hidden; }

  render() {
    const { canUse, canRaise, canLower } = this.state();
    const rows = [
      ['E', 'Use the terminal', canUse],
      ['F', canLower ? 'Lower the terminal' : 'Raise the terminal', canRaise || canLower],
      ['Tab', 'Show / hide controls', true],
    ];
    this.panel.innerHTML = '<p class="hk-title">Controls</p>' + rows.map(([k, label, on]) =>
      `<div class="hk-row${on ? '' : ' off'}"><kbd>${k}</kbd><span>${label}</span></div>`).join('') +
      '<p class="hk-note">Inside the terminal, use Exit in the lamp menu to step back.</p>';
  }

  toggle() {
    if (this.open) { this.hide(); return; }
    this.render();
    this.panel.hidden = false;
    this.hint.classList.remove('show');
  }

  hide() { this.panel.hidden = true; }

  /** Live-update the dimmed/active entries while the panel is open (e.g. while the monitor moves). */
  refresh() { if (this.open) this.render(); }

  /** One-time "Tab for controls" note, the first time the terminal becomes usable. */
  hintOnce() {
    if (this.hinted || this.touch) return;
    this.hinted = true;
    setTimeout(() => this.hint.classList.add('show'), 1000);
    setTimeout(() => this.hint.classList.remove('show'), 6000);
  }
}
