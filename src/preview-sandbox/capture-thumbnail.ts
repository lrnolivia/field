// capture-thumbnail.ts — bounded first-viewport snapshot for dashboard cards.
//
// The warm thumbnail runtime keeps Preview compiled between edits, so capture can
// stay tiny: no idle wait, no full-page raster, no font re-embedding. The existing
// cached dashboard card remains visible until this replacement uploads.

let capturing = false;

const SETTLE_MS = 120;
const FONT_READY_TIMEOUT_MS = 100;
const RASTER_TIMEOUT_MS = 2500;
const CAPTURE_MARGIN = 32;
const THUMB_WIDTH = 640;

function opaqueBackground(): string {
  const bg = getComputedStyle(document.body).backgroundColor;
  if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') return bg;
  const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
  if (htmlBg && htmlBg !== 'transparent' && htmlBg !== 'rgba(0, 0, 0, 0)') return htmlBg;
  return '#ffffff';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function settleFonts(): Promise<void> {
  if (!document.fonts?.ready) return;
  await Promise.race([
    document.fonts.ready.then(() => undefined).catch(() => undefined),
    delay(FONT_READY_TIMEOUT_MS),
  ]);
}

export function captureScale(width: number): number {
  if (!width || width <= 0) return 1;
  return Math.min(1, THUMB_WIDTH / width);
}

export function captureViewportSize(width: number, height: number): { width: number; height: number } {
  return {
    width: width > 0 ? Math.round(width) : 1440,
    height: height > 0 ? Math.round(height) : 900,
  };
}

function captureFilter(viewportWidth: number, viewportHeight: number): (node: HTMLElement) => boolean {
  return (node) => {
    if (!(node instanceof Element)) return true;
    if (node === document.body || node === document.documentElement) return true;
    if (node.tagName === 'SCRIPT' || node.tagName === 'NOSCRIPT') return false;

    const rect = node.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return true;
    return (
      rect.bottom >= -CAPTURE_MARGIN &&
      rect.top <= viewportHeight + CAPTURE_MARGIN &&
      rect.right >= -CAPTURE_MARGIN &&
      rect.left <= viewportWidth + CAPTURE_MARGIN
    );
  };
}

async function rasterWithTimeout(promise: Promise<string>): Promise<string> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<string>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error('thumbnail raster timed out')), RASTER_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
}

export async function captureThumbnail(requestId?: string): Promise<void> {
  if (capturing) return;
  capturing = true;
  try {
    await settleFonts();
    await delay(SETTLE_MS);

    const { toJpeg } = await import('html-to-image');
    const viewport = captureViewportSize(
      document.documentElement.clientWidth || window.innerWidth,
      document.documentElement.clientHeight || window.innerHeight,
    );
    const root = document.getElementById('root') ?? document.body;

    const dataUrl = await rasterWithTimeout(toJpeg(root, {
      quality: 0.78,
      pixelRatio: captureScale(viewport.width),
      width: viewport.width,
      height: viewport.height,
      backgroundColor: opaqueBackground(),
      skipFonts: true,
      filter: captureFilter(viewport.width, viewport.height),
    }));
    parent.postMessage({ type: 'preview:thumbnail', dataUrl, requestId }, '*');
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.warn('[preview] thumbnail capture failed', err);
    parent.postMessage({ type: 'preview:thumbnail-error', requestId, error }, '*');
  } finally {
    capturing = false;
  }
}
