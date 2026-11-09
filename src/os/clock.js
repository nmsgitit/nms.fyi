// Taskbar clock text. Lives here (not in scene/) so the light/mobile desktop never imports three.js.
export function clockText(d = new Date()) {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
