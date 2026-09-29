import { describe, expect, it } from 'vitest';
import { previewFrameUrl } from './preview-frame-url';

describe('previewFrameUrl', () => {
  it('uses the dedicated Vite Preview port in local dev', () => {
    expect(previewFrameUrl({
      protocol: 'http:',
      hostname: 'localhost',
      port: '3333',
      origin: 'http://localhost:3333',
    })).toBe('http://localhost:5175/');
  });

  it('uses the production Preview hostname for field.loew.fi', () => {
    expect(previewFrameUrl({
      protocol: 'https:',
      hostname: 'field.loew.fi',
      port: '',
      origin: 'https://field.loew.fi',
    })).toBe('https://preview.field.loew.fi/');
  });

  it('keeps immutable branch Preview on its certified deployment hostname', () => {
    expect(previewFrameUrl({
      protocol: 'https:',
      hostname: 'abc123.field-preview.loew.fi',
      port: '',
      origin: 'https://abc123.field-preview.loew.fi',
    })).toBe('https://abc123.field-preview.loew.fi/preview-sandbox/index.html');
  });

  it('never creates the malformed preview.<deployment>.field-preview hostname', () => {
    const url = previewFrameUrl({
      protocol: 'https:',
      hostname: 'deploy-456.field-preview.loew.fi',
      port: '',
      origin: 'https://deploy-456.field-preview.loew.fi',
    });
    expect(url).not.toContain('preview.deploy-456.field-preview.loew.fi');
  });
});
