// LAMPLIGHT OS: the single source of truth for what's on the desktop. Both the HTML desktop
// (os.js) and the drawing of it on the 3D monitor (screen.js) read from here, so the two
// always match.
//
// PLACEHOLDER CONTENT: the user still has to decide the real apps and their contents.

export const OS_NAME = 'LAMPLIGHT OS';
// A mature late-80s system running a whole facility wouldn't still be on 1.0 (user: estimate it).
export const OS_VERSION = 'Version 3.2';
export const OS_EDITION = 'Server Edition';
export const OS_BUILD = 'Build 1987.4127';
export const USER_NAME = 'USER'; // generic: whoever is using the terminal (user request)
export const USER_TAGLINE = 'Welcome. Pick something to open.';

/**
 * Desktop apps, in icon order (top to bottom, then the next column).
 * icon: one of the pixel icons in art.js. kind: how the window body renders.
 * requires3D: only in the full experience (it shows or drives the 3D world).
 */
export const APPS = [
  {
    id: 'about', title: 'About Me', icon: 'computer', kind: 'document',
    body: '<h1>About Me</h1><p class="placeholder">Placeholder. Tell Claude what goes here: who you are, what you do, where you are based.</p>',
  },
  {
    id: 'projects', title: 'Projects', icon: 'folder', kind: 'folder',
    items: [
      { title: 'Project One', icon: 'document' },
      { title: 'Project Two', icon: 'document' },
      { title: 'Project Three', icon: 'document' },
    ],
    body: '<p class="placeholder">Placeholder folder. Each project can open its own window with images and write-ups.</p>',
  },
  {
    id: 'resume', title: 'Résumé', icon: 'document', kind: 'document',
    body: '<h1>Résumé</h1><p class="placeholder">Placeholder. This could be a readable résumé page with a PDF download.</p>',
  },
  {
    id: 'contact', title: 'Contact', icon: 'mail', kind: 'document',
    body: '<h1>Contact</h1><p class="placeholder">Placeholder. Email address, links, or a contact form (a form needs a small server endpoint on the Node app).</p>',
  },
  {
    // Live views of the server room from four CCTV cameras (apps/cameras.js). Full experience only.
    id: 'cameras', title: 'Security Cameras', icon: 'camera', kind: 'cameras', requires3D: true,
  },
  {
    id: 'bin', title: 'Recycle Bin', icon: 'bin', kind: 'document',
    body: '<p class="placeholder">The Recycle Bin is empty.</p>',
  },
];
