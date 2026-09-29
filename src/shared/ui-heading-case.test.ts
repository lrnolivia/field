import { describe, expect, it } from 'vitest';
import { formatUiHeading } from './ui-heading-case';

describe('UI heading grammar', () => {
  it('reconstructs normal sentence case when lowercase headings are off', () => {
    expect(formatUiHeading('components', false)).toBe('Components');
    expect(formatUiHeading('Page Settings', false)).toBe('Page settings');
    expect(formatUiHeading('custom code', false)).toBe('Custom code');
  });

  it('applies lowercase presentation when enabled', () => {
    expect(formatUiHeading('Components', true)).toBe('components');
    expect(formatUiHeading('Page settings', true)).toBe('page settings');
    expect(formatUiHeading('Custom Code', true)).toBe('custom code');
  });

  it('preserves intentional casing in both modes', () => {
    expect(formatUiHeading('seo settings', false)).toBe('SEO settings');
    expect(formatUiHeading('seo settings', true)).toBe('SEO settings');
    expect(formatUiHeading('github integration', false)).toBe('GitHub integration');
    expect(formatUiHeading('github integration', true)).toBe('GitHub integration');
    expect(formatUiHeading('youtube embeds', false)).toBe('YouTube embeds');
    expect(formatUiHeading('youtube embeds', true)).toBe('YouTube embeds');
    expect(formatUiHeading('open graph', false)).toBe('Open Graph');
    expect(formatUiHeading('open graph', true)).toBe('Open Graph');
    expect(formatUiHeading('field.engine', false)).toBe('field.ENGINE');
    expect(formatUiHeading('field.engine', true)).toBe('field.ENGINE');
    expect(formatUiHeading('a/b tests', false)).toBe('A/B tests');
    expect(formatUiHeading('a/b tests', true)).toBe('A/B tests');
    expect(formatUiHeading('ui settings', false)).toBe('UI settings');
    expect(formatUiHeading('ui settings', true)).toBe('UI settings');
  });
});
