import { describe, expect, it } from 'vitest';
import { previewFrameUrl } from './preview-frame-url';

describe('previewFrameUrl', () => {
  it('uses the dedicated Vite Preview port in local dev', () => {
    expect(previewFrameUrl({
      protocol: 'http:',
      hostname: 'localhost',
      port: '3333',
    })).toBe('http://localhost:5175/');
  });

  it('uses the production Preview hostname for field.loew.fi', () => {
    expect(previewFrameUrl({
      protocol: 'https:',
      hostname: 'field.loew.fi',
      port: '',
    })).toBe('https://preview.field.loew.fi/');
  });

  it('uses the isolated Workers Preview host for the same immutable deployment', () => {
    expect(previewFrameUrl({
      protocol: 'https:',
      hostname: 'abc12345.field-preview.loew.fi',
      port: '',
    })).toBe('https://abc12345-field.lrnoliv.workers.dev/');
  });

  it('maps the stable branch URL to the matching Workers Preview alias', () => {
    expect(previewFrameUrl({
      protocol: 'https:',
      hostname: 'field-preview-routing.field-preview.loew.fi',
      port: '',
    })).toBe('https://field-preview-routing-field.lrnoliv.workers.dev/');
  });
});
