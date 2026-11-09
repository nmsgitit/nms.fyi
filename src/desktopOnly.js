// Light version and mobile spin: LAMPLIGHT OS on its own, with no 3D scene behind it.
// Nothing here imports three.js. Apps that need the 3D world (the security cameras) and
// controls for it (Exit back to the command room, hotkeys) are left out by DesktopOS.
import './os/os.css';
import { DesktopOS } from './os/os.js';

export function startDesktopOnly(mode) {
  document.documentElement.classList.add('desktop-only');
  const os = new DesktopOS({ mode });
  os.show();
  if (import.meta.env.DEV) window.os = os;
}
