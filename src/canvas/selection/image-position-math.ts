// image-position-math.ts — pure geometry for the image Position mode.
//
// CSS places an image of size `img` in a box of size `box` at
//   offset = (box - img) * pct / 100
// for each axis (background-position / object-position percentages). Moving
// the painted image by `d` local px therefore needs
//   pct' = pct - d / (img - box) * 100
// which holds for an image larger than its box (cover / fill: the image is a
// crop window that moves with the pointer) AND smaller (contain / natural:
// the image moves inside the box). Clamping to 0–100 keeps a cover image
// covering the box and a smaller image inside it — the fit/fill model.

export interface Size { width: number; height: number }
export interface Percent { x: number; y: number }

/** Painted image size for a `background-size` (or `object-fit`) value. */
export function renderedImageSize(fit: string, box: Size, natural: Size | null): Size | null {
  const mode = (fit || '').trim().toLowerCase();
  if (!(box.width > 0) || !(box.height > 0)) return null;
  if (mode === 'fill' || mode === '100% 100%') return { ...box };
  if (!natural || !(natural.width > 0) || !(natural.height > 0)) return null;
  const ratio = natural.width / natural.height;
  if (mode === 'cover' || mode === 'contain') {
    const scaleW = box.width / natural.width;
    const scaleH = box.height / natural.height;
    const s = mode === 'cover' ? Math.max(scaleW, scaleH) : Math.min(scaleW, scaleH);
    return { width: natural.width * s, height: natural.height * s };
  }
  if (mode === 'scale-down') {
    const s = Math.min(1, box.width / natural.width, box.height / natural.height);
    return { width: natural.width * s, height: natural.height * s };
  }
  if (mode === '' || mode === 'auto' || mode === 'auto auto' || mode === 'none') return { ...natural };
  // Explicit `<w> [<h>]` in px / % / auto.
  const parts = mode.split(/\s+/);
  const resolve = (v: string | undefined, basis: number): number | null => {
    if (!v || v === 'auto') return null;
    const px = v.match(/^(-?[\d.]+)px$/);
    if (px) return parseFloat(px[1]);
    const pct = v.match(/^(-?[\d.]+)%$/);
    if (pct) return (parseFloat(pct[1]) / 100) * basis;
    return null;
  };
  const w = resolve(parts[0], box.width);
  const h = resolve(parts[1], box.height);
  if (w != null && h != null) return { width: w, height: h };
  if (w != null) return { width: w, height: w / ratio };
  if (h != null) return { width: h * ratio, height: h };
  return { ...natural };
}

/** Parse a CSS two-value position into percentages (keywords, %, center). */
export function parsePositionPercent(raw: string): Percent {
  const trimmed = (raw || '').trim().toLowerCase();
  if (!trimmed || trimmed === 'center') return { x: 50, y: 50 };
  const parts = trimmed.split(/\s+/);
  const one = (s: string | undefined, axis: 'x' | 'y'): number => {
    if (!s || s === 'center') return 50;
    if (axis === 'x' && s === 'left') return 0;
    if (axis === 'x' && s === 'right') return 100;
    if (axis === 'y' && s === 'top') return 0;
    if (axis === 'y' && s === 'bottom') return 100;
    const pct = s.match(/^(-?[\d.]+)%$/);
    return pct ? parseFloat(pct[1]) : 50;
  };
  // A single vertical keyword ("top") is the Y value with X centred.
  if (parts.length === 1 && (parts[0] === 'top' || parts[0] === 'bottom')) return { x: 50, y: one(parts[0], 'y') };
  return { x: one(parts[0], 'x'), y: one(parts[1] ?? 'center', 'y') };
}

/** New position after moving the painted image by `delta` local px. */
export function dragImagePosition(start: Percent, delta: { x: number; y: number }, box: Size, img: Size): Percent {
  const axis = (pct: number, d: number, boxLen: number, imgLen: number): number => {
    const overflow = imgLen - boxLen;
    if (Math.abs(overflow) < 0.5) return pct;
    return Math.max(0, Math.min(100, pct - (d / overflow) * 100));
  };
  return {
    x: axis(start.x, delta.x, box.width, img.width),
    y: axis(start.y, delta.y, box.height, img.height),
  };
}

export function formatPositionPercent(p: Percent): string {
  const f = (n: number) => `${Math.round(n * 100) / 100}%`;
  return `${f(p.x)} ${f(p.y)}`;
}

/** Screen-space pointer delta → the box's LOCAL px, through its painted quad
 *  (camera zoom, and any rotation of the box or its ancestors). */
export function screenDeltaToLocal(
  delta: { x: number; y: number },
  quad: { TL: { x: number; y: number }; TR: { x: number; y: number }; BL: { x: number; y: number } },
  box: Size,
): { x: number; y: number } {
  const ux = { x: (quad.TR.x - quad.TL.x) / box.width, y: (quad.TR.y - quad.TL.y) / box.width };
  const uy = { x: (quad.BL.x - quad.TL.x) / box.height, y: (quad.BL.y - quad.TL.y) / box.height };
  const det = ux.x * uy.y - uy.x * ux.y;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-9) return { x: 0, y: 0 };
  return {
    x: (delta.x * uy.y - uy.x * delta.y) / det,
    y: (ux.x * delta.y - delta.x * ux.y) / det,
  };
}
