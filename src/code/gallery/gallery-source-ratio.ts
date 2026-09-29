const DEFAULT_GALLERY_RATIO_TIMEOUT_MS = 8000;

/**
 * Measure an image's intrinsic ratio exactly once.
 *
 * Used by every Gallery creation/add/replace path so cached images, load
 * failures, timeouts, and cleanup all resolve with identical semantics.
 */
export function measureGallerySourceRatio(
  src: string,
  timeoutMs = DEFAULT_GALLERY_RATIO_TIMEOUT_MS,
): Promise<number | null> {
  if (!src || typeof Image === 'undefined') return Promise.resolve(null);

  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    let timeout: ReturnType<typeof globalThis.setTimeout> | undefined;

    const finish = (ratio: number | null) => {
      if (settled) return;
      settled = true;
      if (timeout !== undefined) globalThis.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      resolve(ratio);
    };

    const read = () => finish(
      image.naturalWidth > 0 && image.naturalHeight > 0
        ? image.naturalWidth / image.naturalHeight
        : null,
    );

    timeout = globalThis.setTimeout(() => {
      image.src = '';
      finish(null);
    }, timeoutMs);

    image.onload = read;
    image.onerror = () => finish(null);
    image.src = src;

    // Cached/data URL images can already be complete before handlers observe
    // another load event. Resolve synchronously when dimensions are present.
    if (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) read();
  });
}
