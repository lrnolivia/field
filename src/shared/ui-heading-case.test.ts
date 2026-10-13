import { describe, expect, it } from 'vitest';
import { formatUiChrome, formatUiHeading } from './ui-heading-case';

describe('field case management', () => {
  it('leaves authored casing untouched when off', () => {
    expect(formatUiHeading('Components', false)).toBe('Components');
    expect(formatUiChrome('Page Settings', false)).toBe('Page Settings');
    expect(formatUiChrome('custom code', false)).toBe('custom code');
  });

  it('applies lowercase presentation when on', () => {
    expect(formatUiHeading('Components', true)).toBe('components');
    expect(formatUiChrome('Page Settings', true)).toBe('page settings');
    expect(formatUiChrome('Custom Code', true)).toBe('custom code');
  });

  it('lowercases built-in technical and brand labels in branded mode', () => {
    expect(formatUiChrome('SEO Settings', true)).toBe('seo settings');
    expect(formatUiChrome('GitHub Integration', true)).toBe('github integration');
    expect(formatUiChrome('YouTube Embeds', true)).toBe('youtube embeds');
    expect(formatUiChrome('Open Graph', true)).toBe('open graph');
    expect(formatUiChrome('field.RUNTIME Diagnostics', true)).toBe('field.runtime diagnostics');
    expect(formatUiChrome('A/B Tests', true)).toBe('a/b tests');
    expect(formatUiChrome('UI Settings', true)).toBe('ui settings');
    expect(formatUiChrome('AI Assistant', true)).toBe('ai assistant');
  });
});
