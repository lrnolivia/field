// main.tsx — Sandbox entry point.
// Mounts content root + canvas-dnd overlay + Comlink endpoint.

import { initSandbox } from './bridge-sandbox';
import { initSandboxDnd } from './sandbox-dnd-host';

const root = document.getElementById('sandbox-root')!;

// Render the hover cue on the real canvas element. A parent-frame text copy
// cannot reproduce JSX, SVG, images, clipping, or the current zoom correctly.
const hoverStyle = document.createElement('style');
hoverStyle.textContent = `
  [data-field-hover-gloss="true"] {
    animation: field-hover-gloss 1.4s ease-in-out both;
  }
  @keyframes field-hover-gloss {
    0%, 100% { filter: brightness(1); }
    40% { filter: brightness(1.35); }
    65% { filter: brightness(1.08); }
  }
  @media (prefers-reduced-motion: reduce) {
    [data-field-hover-gloss="true"] { animation: none; outline: 1px solid currentColor; }
  }
`;
document.head.appendChild(hoverStyle);

// Content root — receives the user's rendered DOM (canvas-dnd reads from here)
const contentRoot = document.createElement('div');
contentRoot.setAttribute('data-content-root', '');
contentRoot.id = 'content-root';
contentRoot.style.position = 'absolute';
contentRoot.style.transform = 'translateZ(0)';
contentRoot.style.backfaceVisibility = 'hidden';
root.appendChild(contentRoot);

// Overlay layer — canvas-dnd selection/handles/drop indicators paint here.
// Sits OUTSIDE the transformed content so overlays render at natural scale.
const overlayEl = document.createElement('div');
overlayEl.id = 'dnd-overlay';
Object.assign(overlayEl.style, {
  position: 'fixed',
  inset: '0',
  pointerEvents: 'none',
  zIndex: '100',
  overflow: 'visible',
});
root.appendChild(overlayEl);

// Expose the SandboxApi via Comlink + emit sandboxReady
initSandbox(root, contentRoot);

// Boot canvas-dnd inside the iframe. Drag/select/hover events are emitted
// to the parent via raw postMessage (handled by bridge-host).
initSandboxDnd(contentRoot, overlayEl);
