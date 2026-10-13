import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  isExternalImageDrag,
  extractImageUrlFromDataTransfer,
  filenameFromUrl,
  isPointInsideCanvasRect,
  canvasMediaDropLabel,
} from './CanvasFileDrop';
// `fitFrameBox` moved to the shared image-dims module (also used by the
// clipboard-paste path); the cases below still pin the drop behaviour.
import { fitFrameBox } from './image-dims';

/** Minimal DataTransfer stand-in: only `getData` is read by the helper. */
function mockDT(data: Record<string, string>): DataTransfer {
  return { getData: (type: string) => data[type] ?? '' } as unknown as DataTransfer;
}

describe('isExternalImageDrag', () => {
  test('accepts OS file drags', () => {
    expect(isExternalImageDrag(['Files'])).toBe(true);
  });
  test('accepts browser image-URL drags (uri-list / DownloadURL)', () => {
    expect(isExternalImageDrag(['text/uri-list', 'text/html', 'text/plain'])).toBe(true);
    expect(isExternalImageDrag(['DownloadURL'])).toBe(true);
  });
  test('ignores internal / plain-text-only drags', () => {
    expect(isExternalImageDrag(['text/plain'])).toBe(false);
    expect(isExternalImageDrag(['application/x-revyme-node'])).toBe(false);
    expect(isExternalImageDrag([])).toBe(false);
  });
});

describe('extractImageUrlFromDataTransfer', () => {
  test('parses a Chrome DownloadURL (mime:name:url), keeping colons in the URL', () => {
    const dt = mockDT({ DownloadURL: 'image/png:Dashboard@2x.png:https://cdn.example.com/a/b.png?v=1' });
    expect(extractImageUrlFromDataTransfer(dt)).toEqual({
      url: 'https://cdn.example.com/a/b.png?v=1',
      name: 'Dashboard@2x.png',
    });
  });

  test('rejects a non-image DownloadURL', () => {
    const dt = mockDT({ DownloadURL: 'application/pdf:Invoice.pdf:https://x.com/i.pdf' });
    expect(extractImageUrlFromDataTransfer(dt)).toBeNull();
  });

  test('extracts the first <img src> from text/html', () => {
    const dt = mockDT({ 'text/html': '<meta><img alt="" src="https://x.com/pic.jpg" width="40">' });
    expect(extractImageUrlFromDataTransfer(dt)).toEqual({ url: 'https://x.com/pic.jpg' });
  });

  test('takes the first non-comment line of text/uri-list', () => {
    const dt = mockDT({ 'text/uri-list': '# a comment\r\nhttps://x.com/p.webp\r\nhttps://x.com/other' });
    expect(extractImageUrlFromDataTransfer(dt)).toEqual({ url: 'https://x.com/p.webp' });
  });

  test('falls back to a bare image/data/blob URL in text/plain', () => {
    expect(extractImageUrlFromDataTransfer(mockDT({ 'text/plain': 'https://x.com/p.png' })))
      .toEqual({ url: 'https://x.com/p.png' });
    expect(extractImageUrlFromDataTransfer(mockDT({ 'text/plain': 'data:image/png;base64,AAA' })))
      .toEqual({ url: 'data:image/png;base64,AAA' });
  });

  test('ignores non-URL plain text (a dragged text selection)', () => {
    expect(extractImageUrlFromDataTransfer(mockDT({ 'text/plain': 'just some words' }))).toBeNull();
  });

  test('precedence: DownloadURL beats html beats uri-list', () => {
    const dt = mockDT({
      DownloadURL: 'image/png:a.png:https://dl/a.png',
      'text/html': '<img src="https://html/b.png">',
      'text/uri-list': 'https://uri/c.png',
    });
    expect(extractImageUrlFromDataTransfer(dt)?.url).toBe('https://dl/a.png');
  });
});

describe('fitFrameBox', () => {
  test('caps the longest side at 400 while preserving aspect ratio', () => {
    expect(fitFrameBox({ w: 1600, h: 800 })).toEqual({ width: 400, height: 200 });
    expect(fitFrameBox({ w: 800, h: 1600 })).toEqual({ width: 200, height: 400 });
  });
  test('never upscales a small image', () => {
    expect(fitFrameBox({ w: 120, h: 90 })).toEqual({ width: 120, height: 90 });
  });
  test('uses the default box for missing / degenerate dims', () => {
    expect(fitFrameBox(null)).toEqual({ width: 320, height: 200 });
    expect(fitFrameBox({ w: 0, h: 0 })).toEqual({ width: 320, height: 200 });
  });
});

describe('filenameFromUrl', () => {
  test('pulls the decoded basename when it has an extension', () => {
    expect(filenameFromUrl('https://x.com/a/My%20Pic.png?q=1')).toBe('My Pic.png');
  });
  test('returns null for extensionless paths and data URLs', () => {
    expect(filenameFromUrl('https://x.com/a/b')).toBeNull();
    expect(filenameFromUrl('data:image/png;base64,AAA')).toBeNull();
  });
});


describe('canvas Media drop targeting', () => {
  const rect = { left: 100, top: 50, right: 900, bottom: 650 } as DOMRect;

  test('accepts only points inside the actual canvas rect', () => {
    expect(isPointInsideCanvasRect(100, 50, rect)).toBe(true);
    expect(isPointInsideCanvasRect(500, 300, rect)).toBe(true);
    expect(isPointInsideCanvasRect(900, 650, rect)).toBe(true);
    expect(isPointInsideCanvasRect(99, 300, rect)).toBe(false);
    expect(isPointInsideCanvasRect(500, 651, rect)).toBe(false);
  });

  test('uses contextual copy for images, SVG sets, and mixed media', () => {
    expect(canvasMediaDropLabel(1, 0)).toBe('Place image');
    expect(canvasMediaDropLabel(3, 0)).toBe('Place 3 images');
    expect(canvasMediaDropLabel(0, 1)).toBe('Create vector set');
    expect(canvasMediaDropLabel(0, 4)).toBe('Create vector set · 4 SVGs');
    expect(canvasMediaDropLabel(2, 1)).toBe('Add media');
    expect(canvasMediaDropLabel(0, 0)).toBe('Place media');
  });

  test('renders restrained canvas-local feedback instead of a fullscreen drop veil', () => {
    const source = readFileSync('src/canvas/CanvasFileDrop.tsx', 'utf8');
    expect(source).toContain('data-canvas-media-drop-target');
    expect(source).toContain("getContentRootRect()");
    expect(source).toContain("background: 'color-mix(in srgb, var(--accent) 5%, transparent)'");
    expect(source).toContain("canvas-file-drop:ignored-outside-canvas");
    expect(source).not.toContain('fixed inset-0');
    expect(source).not.toContain('border-dashed');
  });
});
