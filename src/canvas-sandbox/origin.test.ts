import { describe, expect, it } from 'vitest';
import { resolveSandboxOrigin } from './origin';

describe('resolveSandboxOrigin', () => {
  it('keeps local development on the dedicated sandbox port', () => {
    expect(resolveSandboxOrigin({
      protocol: 'http:',
      hostname: 'localhost',
      port: '3333',
    })).toBe('http://localhost:5174');
  });

  it('maps the production editor to the production Canvas host', () => {
    expect(resolveSandboxOrigin({
      protocol: 'https:',
      hostname: 'field.loew.fi',
      port: '',
    })).toBe('https://canvas.field.loew.fi');
  });

  it('maps a branch editor Preview to the single-level Canvas Preview domain', () => {
    expect(resolveSandboxOrigin({
      protocol: 'https:',
      hostname: 'field-field-motion-semantic-controls.field-preview.loew.fi',
      port: '',
    })).toBe('https://field-field-motion-semantic-controls.canvas-preview.loew.fi');
  });

  it('maps the Gallery worker branch Preview to its matching Canvas Preview host', () => {
    expect(resolveSandboxOrigin({
      protocol: 'https:',
      hostname: 'field-native-gallery-qol-creation-flow.field-preview.loew.fi',
      port: '',
    })).toBe('https://field-native-gallery-qol-creation-flow.canvas-preview.loew.fi');
  });

  it('maps an immutable editor Preview to its matching immutable Canvas Preview', () => {
    expect(resolveSandboxOrigin({
      protocol: 'https:',
      hostname: '7ac76031.field-preview.loew.fi',
      port: '',
    })).toBe('https://7ac76031.canvas-preview.loew.fi');
  });

  it('preserves an already-resolved branch Canvas Preview origin', () => {
    expect(resolveSandboxOrigin({
      protocol: 'https:',
      hostname: 'field-field-motion-semantic-controls.canvas-preview.loew.fi',
      port: '',
    })).toBe('https://field-field-motion-semantic-controls.canvas-preview.loew.fi');
  });

  it('preserves production Canvas when protocol code runs inside the sandbox', () => {
    expect(resolveSandboxOrigin({
      protocol: 'https:',
      hostname: 'canvas.field.loew.fi',
      port: '',
    })).toBe('https://canvas.field.loew.fi');
  });
});
