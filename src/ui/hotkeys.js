// Hotkey menu. A small "TAB  Open Hotkey Menu" button sits at the bottom of the screen
// (keyboard devices, 3D view only). Tab, or clicking that button, shows/hides the menu.
// Entries that don't apply right now are dimmed, and the menu live-refreshes.
// Touch devices have no Tab key: they keep the tap prompt (focus.js) instead.

export class HotkeyPanel {
  /** state(): { canUse, canRaise, canLower, canLook, looking } decides what's active. */
  constructor(state) {
    this.state = state;
    this.touch = matchMedia('(pointer: coarse)').matches;

    const panel = (this.panel = document.createElement('div'));
    panel.id = 'hotkeys';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Hotkeys');
    panel.hidden = true;
    document.body.append(panel);

    const bar = (this.bar = document.createElement('button'));
    bar.id = 'hotkeys-bar';
    bar.type = 'button';
    bar.addEventListener('click', () => this.toggle());
    document.body.append(bar);
    this.updateBar();
  }

  get open() { return !this.panel.hidden; }

  updateBar() {
    this.bar.innerHTML = `<kbd>TAB</kbd>${this.open ? 'Close' : 'Open'} Hotkey Menu`;
    this.bar.setAttribute('aria-expanded', String(this.open));
  }

  /** Show the bottom button (keyboard devices only). Hidden during the gate and inside the desktop. */
  setBarVisible(on) {
    this.bar.classList.toggle('show', on && !this.touch);
    if (!on) this.hide();
  }

  render() {
    const { canUse, canRaise, canLower, canLook, looking } = this.state();
    const row = (keys, label, on) =>
      `<div class="hk-row${on ? '' : ' off'}">${keys.map((k) => `<kbd>${k}</kbd>`).join('')}<span>${label}</span></div>`;
    this.panel.innerHTML =
      '<p class="hk-title">Hotkeys</p>' +
      row(['E'], 'Use the terminal', canUse) +
      row(['Q'], canLower ? 'Lower the terminal' : 'Raise the terminal', canRaise || canLower) +
      row(['F'], looking ? 'Stop looking around' : 'Look around with the mouse', canLook || looking) +
      '<p class="hk-sub">While looking around</p>' +
      row(['Mouse'], 'Turn your head', looking) +
      row(['Click'], 'Capture the mouse (no screen edges)', looking) +
      row(['F', 'Esc'], 'Turn back to the desk', looking) +
      row(['Tab'], 'Close this menu', true) +
      '<p class="hk-note">Inside the terminal, use Exit in the lamp menu to step back.</p>';
  }

  toggle() {
    if (this.open) { this.hide(); return; }
    this.render();
    this.panel.hidden = false;
    this.updateBar();
  }

  hide() {
    this.panel.hidden = true;
    this.updateBar();
  }

  /** Live-update the dimmed/active entries while the menu is open. */
  refresh() { if (this.open) this.render(); }
}
