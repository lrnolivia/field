// capture-thumbnail.ts — On a `preview:capture-thumbnail` request from the
// parent editor, snapshot the rendered preview page to a small JPEG and post
// the data URL back as `preview:thumbnail`. Runs entirely inside the Preview
// iframe. Dashboard thumbnails intentionally capture only the first viewport:
// that is the useful card preview, and it bounds DOM cloning/raster work.

let capturing = false;

const SETTLE_MS = 2200;
const FONT_READY_TIMEOUT_MS = 1200;
const IDLE_TIMEOUT_MS = 700;
const RASTER_TIMEOUT_MS = 10000;
const CAPTURE_MARGIN = 48;
const THUMB_WIDTH = 900;

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

function whenIdle(): Promise<void> {
  return new Promise((resolve) => {
    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
    }).requestIdleCallback;
    if (ric) ric(() => resolve(), { timeout: IDLE_TIMEOUT_MS });
    else setTimeout(resolve, Math.min(300, IDLE_TIMEOUT_MS));
  });
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
    // Keep zero-size wrappers: they can contain absolutely/fixed-positioned
    // children that are visible inside the first viewport.
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
    // Neither fonts nor idle scheduling may hold a background thumbnail session
    // indefinitely. The iframe session itself is disposable; bounded waits keep
    // the full capture comfortably inside the parent host's 24s watchdog.
    await settleFonts();
    await delay(SETTLE_MS);
    await whenIdle();

    const { toJpeg } = await import('html-to-image');
    const body = document.body;
    const viewport = captureViewportSize(
      document.documentElement.clientWidth || window.innerWidth,
      document.documentElement.clientHeight || window.innerHeight,
    );

    // Capture the FIRST VIEWPORT, not the full scroll height. Dashboard cards
    // show the top of the first Page; cloning an entire long document was both
    // unnecessary and the production hang proven by the r4 trace. skipFonts
    // avoids html-to-image's second font-embedding pass after fonts have already
    // had a bounded settle window.
    const dataUrl = await rasterWithTimeout(toJpeg(body, {
      quality: 0.82,
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
