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

  it('preserves technical and product casing while lowering surrounding copy', () => {
    expect(formatUiChrome('SEO Settings', true)).toBe('SEO settings');
    expect(formatUiChrome('GitHub Integration', true)).toBe('GitHub integration');
    expect(formatUiChrome('YouTube Embeds', true)).toBe('YouTube embeds');
    expect(formatUiChrome('Open Graph', true)).toBe('Open Graph');
    expect(formatUiChrome('field.RUNTIME Diagnostics', true)).toBe('field.RUNTIME diagnostics');
    expect(formatUiChrome('A/B Tests', true)).toBe('A/B tests');
    expect(formatUiChrome('UI Settings', true)).toBe('UI settings');
    expect(formatUiChrome('AI Assistant', true)).toBe('AI assistant');
  });
});
