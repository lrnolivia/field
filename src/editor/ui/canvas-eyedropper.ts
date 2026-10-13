import { getCanvasBridge } from '@/canvas/canvas-bridge';

type ViewportCaptureBridge = { captureCanvasViewport?: () => Promise<string | null> };

function pixelHex(data: Uint8ClampedArray): string {
  return `#${[data[0], data[1], data[2]].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/** Pick a rendered canvas pixel with the same loupe on every browser. */
export async function pickCanvasPixel(): Promise<string | null> {
  const iframe = document.querySelector<HTMLIFrameElement>('[data-canvas-iframe]');
  const capture = (getCanvasBridge() as ViewportCaptureBridge).captureCanvasViewport;
  if (!iframe || !capture) throw new Error('The canvas is not ready to sample.');

  const snapshot = await capture.call(getCanvasBridge());
  if (!snapshot) throw new Error('The canvas could not be captured for color sampling.');
  const image = new Image();
  image.src = snapshot;
  await image.decode();

  const source = document.createElement('canvas');
  source.width = image.naturalWidth;
  source.height = image.naturalHeight;
  const sourceContext = source.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) throw new Error('Pixel sampling is unavailable.');
  sourceContext.drawImage(image, 0, 0);

  const rect = iframe.getBoundingClientRect();
  const target = document.createElement('div');
  target.setAttribute('role', 'button');
  target.setAttribute('aria-label', 'Pick a pixel from the canvas. Press Escape to cancel.');
  Object.assign(target.style, {
    position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`,
    width: `${rect.width}px`, height: `${rect.height}px`,
    zIndex: '2000000', cursor: 'crosshair', background: 'transparent',
  });

  const loupe = document.createElement('div');
  Object.assign(loupe.style, {
    position: 'fixed', zIndex: '2000001', pointerEvents: 'none',
    padding: '7px', borderRadius: '70px', background: 'rgba(28,28,30,.94)',
    border: '1px solid rgba(255,255,255,.35)',
    boxShadow: '0 10px 30px #0008, 0 0 0 4px rgba(255,255,255,.12)',
    color: '#fff', font: '12px ui-monospace, SFMono-Regular, monospace',
    textAlign: 'center', opacity: '0', transform: 'scale(.84)',
    transition: 'opacity 130ms ease-out, transform 180ms cubic-bezier(.2,1.35,.25,1)',
  });
  const magnifier = document.createElement('canvas');
  magnifier.width = 121;
  magnifier.height = 121;
  magnifier.style.cssText = 'display:block;width:121px;height:121px;border-radius:50%;image-rendering:pixelated;border:2px solid rgba(255,255,255,.7);box-shadow:inset 0 0 16px #0008';
  const label = document.createElement('div');
  label.style.cssText = 'position:absolute;left:18px;right:18px;bottom:-23px;padding:4px 3px;border-radius:7px;background:#242424;border:1px solid #666;letter-spacing:.03em;box-shadow:0 3px 8px #0005';
  loupe.append(magnifier, label);
  document.body.append(target, loupe);
  const loupeContext = magnifier.getContext('2d');
  if (!loupeContext) { target.remove(); loupe.remove(); throw new Error('The color loupe is unavailable.'); }
  loupeContext.imageSmoothingEnabled = false;

  return new Promise<string | null>((resolve) => {
    let currentColor: string | null = null;
    const finish = (color: string | null) => {
      target.remove();
      loupe.remove();
      window.removeEventListener('keydown', onKeyDown, true);
      resolve(color);
    };
    const sample = (event: PointerEvent) => {
      const x = Math.max(0, Math.min(source.width - 1, Math.floor((event.clientX - rect.left) * source.width / rect.width)));
      const y = Math.max(0, Math.min(source.height - 1, Math.floor((event.clientY - rect.top) * source.height / rect.height)));
      const pixel = sourceContext.getImageData(x, y, 1, 1).data;
      currentColor = pixelHex(pixel);
      loupeContext.clearRect(0, 0, 121, 121);
      loupeContext.drawImage(source, x - 5, y - 5, 11, 11, 0, 0, 121, 121);
      loupeContext.strokeStyle = '#fff';
      loupeContext.lineWidth = 2;
      loupeContext.strokeRect(55, 55, 11, 11);
      loupeContext.strokeStyle = '#000';
      loupeContext.lineWidth = 1;
      loupeContext.strokeRect(54, 54, 13, 13);
      label.textContent = currentColor.toUpperCase();
      loupe.style.left = `${Math.min(window.innerWidth - 150, event.clientX + 18)}px`;
      loupe.style.top = `${Math.max(8, Math.min(window.innerHeight - 184, event.clientY - 165))}px`;
      loupe.style.opacity = '1';
      loupe.style.transform = 'scale(1)';
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      finish(null);
    };
    target.addEventListener('pointermove', sample);
    target.addEventListener('pointerdown', (event) => {
      sample(event);
      finish(currentColor);
    }, { once: true });
    window.addEventListener('keydown', onKeyDown, true);
  });
}
