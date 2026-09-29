import { describe, expect, it } from 'vitest';
import {
  DEFAULT_UI_HEADING_CASE,
  getUiHeadingRole,
  normalizeUiHeadingCase,
} from './ui-heading-case';

describe('UI heading case policy', () => {
  it('defaults to Brand mode', () => {
    expect(DEFAULT_UI_HEADING_CASE).toBe('brand');
    expect(normalizeUiHeadingCase(undefined)).toBe('brand');
  });

  it('treats human/editorial headings as brand-lowercase eligible', () => {
    expect(getUiHeadingRole('General')).toBe('brand');
    expect(getUiHeadingRole('Appearance')).toBe('brand');
    expect(getUiHeadingRole('Site metadata')).toBe('brand');
    expect(getUiHeadingRole('Open Graph')).toBe('brand');
  });

  it('preserves functional or technical casing in Brand mode', () => {
    expect(getUiHeadingRole('SEO')).toBe('standard');
    expect(getUiHeadingRole('AI')).toBe('standard');
    expect(getUiHeadingRole('A/B Tests')).toBe('standard');
    expect(getUiHeadingRole('X / Twitter')).toBe('standard');
    expect(getUiHeadingRole('field.ENGINE')).toBe('standard');
  });

  it('accepts only supported preference values', () => {
    expect(normalizeUiHeadingCase('original')).toBe('original');
    expect(normalizeUiHeadingCase('lowercase')).toBe('lowercase');
    expect(normalizeUiHeadingCase('uppercase')).toBe('brand');
  });
});
