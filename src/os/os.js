// NMS FYI OS: the HTML desktop that takes over the screen when the visitor focuses the
// terminal (E / click / tap). XP-reminiscent but original: blue taskbar, oil-lamp launcher
// with an app menu and the Exit button, desktop icons, draggable windows.
// Content comes from desktopModel.js (placeholders for now).
import { APPS, USER_NAME, USER_TAGLINE } from './desktopModel.js';
import { iconURL, wallpaperURL } from './art.js';
import { clockText } from '../scene/screen.js';

const el = (tag, cls, attrs = {}) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v);
  }
  return e;
};

export class DesktopOS {
  /** onExit: called when the visitor picks Exit in the launcher menu. */
  constructor({ onExit }) {
    this.onExit = onExit;
    this.windows = new Map(); // id -> { win, task, app, minimized }
    this.zoom = 1;
    window.addEventListener("resize", () => { if (this.isOpen) this.applyScale(); });
    this.z = 10;
    this.isOpen = false;
    this.build();
  }

  build() {
    const root = (this.root = el('div', 'os', { id: 'os', role: 'application', 'aria-label': 'NMS FYI OS desktop' }));
    root.hidden = true;

    const desk = (this.desk = el('div', 'os-desktop'));
    desk.style.backgroundImage = `url(${wallpaperURL()})`;
    const icons = el('ul', 'os-icons', { 'aria-label': 'Desktop' });
    for (const app of APPS) {
      const li = el('li');
      const b = el('button', 'os-icon', { type: 'button', 'data-app': app.id, title: `Open ${app.title}` });
      b.append(el('img', '', { src: iconURL(app.icon), alt: '', width: 48, height: 48 }), el('span', '', { text: app.title }));
      // Double-click with a mouse (like a real desktop); a single tap on touch screens.
      b.addEventListener('dblclick', () => this.open(app.id));
      b.addEventListener('click', (e) => {
        icons.querySelectorAll('.os-icon').forEach((x) => x.classList.toggle('selected', x === b));
        if (e.pointerType === 'touch' || e.detail === 0) this.open(app.id); // touch or keyboard Enter
      });
      li.append(b);
      icons.append(li);
    }
    desk.addEventListener('pointerdown', (e) => {
      if (e.target === desk) icons.querySelectorAll('.os-icon').forEach((x) => x.classList.remove('selected'));
    });
    this.layer = el('div', 'os-windows');
    desk.append(icons, this.layer);

    // Taskbar: lamp launcher, open windows, clock.
    const bar = el('div', 'os-taskbar');
    const launch = (this.launchBtn = el('button', 'os-launch', {
      type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-label': 'Application Launcher',
    }));
    launch.append(el('img', '', { src: iconURL('lamp'), alt: '', width: 36, height: 36 }));
    launch.addEventListener('click', () => this.toggleMenu());
    this.tasks = el('div', 'os-tasks');
    this.clock = el('div', 'os-tray', { 'aria-label': 'Clock' });
    bar.append(launch, this.tasks, this.clock);

    // Launcher menu.
    const menu = (this.menu = el('div', 'os-menu', { role: 'menu', 'aria-label': 'Applications' }));
    menu.hidden = true;
    const head = el('div', 'os-menu-head');
    head.append(el('img', '', { src: iconURL('lamp'), alt: '', width: 48, height: 48 }),
      el('div', 'os-menu-user', { html: `<strong>${USER_NAME}</strong><span>${USER_TAGLINE}</span>` }));
    const list = el('div', 'os-menu-list');
    for (const app of APPS) {
      const item = el('button', 'os-menu-item', { type: 'button', role: 'menuitem' });
      item.append(el('img', '', { src: iconURL(app.icon), alt: '', width: 32, height: 32 }), el('span', '', { text: app.title }));
      item.addEventListener('click', () => { this.closeMenu(); this.open(app.id); });
      list.append(item);
    }
    const foot = el('div', 'os-menu-foot');
    const exit = el('button', 'os-exit', { type: 'button', role: 'menuitem' });
    exit.append(el('span', 'os-exit-icon', { 'aria-hidden': 'true', text: '⏻' }), el('span', '', { text: 'Exit' }));
    exit.addEventListener('click', () => { this.closeMenu(); this.onExit?.(); });
    foot.append(exit);
    menu.append(head, list, foot);

    root.append(desk, bar, menu, el('div', 'os-crt', { 'aria-hidden': 'true' }));
    document.body.append(root);

    document.addEventListener('pointerdown', (e) => {
      if (!this.menu.hidden && !this.menu.contains(e.target) && !this.launchBtn.contains(e.target)) this.closeMenu();
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!this.menu.hidden) this.closeMenu();
        else this.active()?.querySelector('.win-close')?.click();
      }
    });
  }

  // ------------------------------------------------------------------ open / close the OS
  /**
   * Scale the whole desktop with screen height (768 px reference, like a 1024x768 XP screen),
   * so it looks the same on a laptop and a 1440p monitor, and matches the drawing of it
   * on the 3D monitor.
   */
  applyScale() {
    this.zoom = Math.min(2, Math.max(1, window.innerHeight / 768));
    this.root.style.zoom = String(this.zoom);
  }

  show() {
    this.isOpen = true;
    this.applyScale();
    this.root.hidden = false;
    this.tickClock();
    this._clockTimer = setInterval(() => this.tickClock(), 15000);
    requestAnimationFrame(() => this.root.classList.add('on'));
    setTimeout(() => this.launchBtn.focus(), 300);
  }

  hide() {
    this.isOpen = false;
    this.closeMenu();
    this.root.classList.remove('on');
    clearInterval(this._clockTimer);
    setTimeout(() => { if (!this.isOpen) this.root.hidden = true; }, 400);
  }

  tickClock() { this.clock.textContent = clockText(); }

  // ------------------------------------------------------------------ launcher menu
  toggleMenu() { this.menu.hidden ? this.openMenu() : this.closeMenu(); }
  openMenu() {
    this.menu.hidden = false;
    this.launchBtn.setAttribute('aria-expanded', 'true');
    this.menu.querySelector('.os-menu-item')?.focus();
  }
  closeMenu() {
    if (this.menu.hidden) return;
    this.menu.hidden = true;
    this.launchBtn.setAttribute('aria-expanded', 'false');
  }

  // ------------------------------------------------------------------ windows
  active() {
    let top = null;
    for (const { win, minimized } of this.windows.values()) {
      if (!minimized && (!top || +win.style.zIndex > +top.style.zIndex)) top = win;
    }
    return top;
  }

  open(id, override) {
    const app = override || APPS.find((a) => a.id === id);
    if (!app) return;
    const existing = this.windows.get(app.id);
    if (existing) { this.restore(app.id); return; }

    const n = this.windows.size;
    const win = el('section', 'win', { role: 'dialog', 'aria-label': app.title, tabindex: '-1' });
    win.style.left = `${140 + n * 28}px`;
    win.style.top = `${40 + n * 24}px`;
    const bar = el('header', 'win-bar');
    bar.append(el('img', '', { src: iconURL(app.icon), alt: '', width: 16, height: 16 }), el('span', 'win-title', { text: app.title }));
    const btns = el('div', 'win-btns');
    const mk = (cls, label, glyph, fn) => {
      const b = el('button', `win-btn ${cls}`, { type: 'button', 'aria-label': label, text: glyph });
      b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      return b;
    };
    btns.append(
      mk('win-min', 'Minimize', '_', () => this.minimize(app.id)),
      mk('win-max', 'Maximize', '□', () => win.classList.toggle('max')),
      mk('win-close', 'Close', '×', () => this.close(app.id)),
    );
    bar.append(btns);
    bar.addEventListener('dblclick', (e) => { if (!e.target.closest('.win-btn')) win.classList.toggle('max'); });
    const body = el('div', `win-body win-${app.kind}`);
    body.innerHTML = app.body || '';
    if (app.kind === 'folder') {
      const grid = el('div', 'folder-grid');
      for (const item of app.items || []) {
        const b = el('button', 'os-icon dark', { type: 'button' });
        b.append(el('img', '', { src: iconURL(item.icon), alt: '', width: 48, height: 48 }), el('span', '', { text: item.title }));
        const openItem = () => this.open(null, {
          id: `${app.id}:${item.title}`, title: item.title, icon: item.icon, kind: 'document',
          body: `<h1>${item.title}</h1><p class="placeholder">Placeholder project page.</p>`,
        });
        b.addEventListener('dblclick', openItem);
        b.addEventListener('click', (e) => { if (e.pointerType === 'touch' || e.detail === 0) openItem(); });
        grid.append(b);
      }
      body.prepend(grid);
    }
    win.append(bar, body);
    win.addEventListener('pointerdown', () => this.focus(app.id));
    this.makeDraggable(win, bar);
    this.layer.append(win);

    const task = el('button', 'os-task', { type: 'button' });
    task.append(el('img', '', { src: iconURL(app.icon), alt: '', width: 16, height: 16 }), el('span', '', { text: app.title }));
    task.addEventListener('click', () => {
      const w = this.windows.get(app.id);
      if (w.minimized) this.restore(app.id);
      else if (this.active() === w.win) this.minimize(app.id);
      else this.focus(app.id);
    });
    this.tasks.append(task);
    this.windows.set(app.id, { win, task, app, minimized: false });
    this.focus(app.id);
  }

  focus(id) {
    const w = this.windows.get(id);
    if (!w) return;
    w.win.style.zIndex = ++this.z;
    for (const [k, v] of this.windows) {
      v.win.classList.toggle('active', k === id);
      v.task.classList.toggle('active', k === id && !v.minimized);
    }
    w.win.focus({ preventScroll: true });
  }

  minimize(id) {
    const w = this.windows.get(id);
    w.minimized = true;
    w.win.hidden = true;
    w.task.classList.remove('active');
  }

  restore(id) {
    const w = this.windows.get(id);
    w.minimized = false;
    w.win.hidden = false;
    this.focus(id);
  }

  close(id) {
    const w = this.windows.get(id);
    if (!w) return;
    w.win.remove();
    w.task.remove();
    this.windows.delete(id);
    const next = this.active();
    if (next) next.focus({ preventScroll: true });
  }

  makeDraggable(win, handle) {
    let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.win-btn') || win.classList.contains('max') || window.innerWidth / this.zoom < 700) return;
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      ox = win.offsetLeft; oy = win.offsetTop;
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const maxX = this.desk.clientWidth - 80, maxY = this.desk.clientHeight - 40;
      // Pointer deltas are in screen pixels; the desktop is zoomed, so convert to its units.
      const dx = (e.clientX - sx) / this.zoom, dy = (e.clientY - sy) / this.zoom;
      win.style.left = `${Math.min(maxX, Math.max(-win.offsetWidth + 80, ox + dx))}px`;
      win.style.top = `${Math.min(maxY, Math.max(0, oy + dy))}px`;
    });
    const end = () => { dragging = false; };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }
}
