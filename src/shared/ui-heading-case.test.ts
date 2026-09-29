import { describe, expect, it } from 'vitest';
import {
  DEFAULT_UI_HEADING_CASE,
  formatUiChromeText,
  getUiHeadingRole,
  normalizeUiHeadingCase,
} from './ui-heading-case';

describe('UI case policy', () => {
  it('defaults to Brand and migrates the retired lowercase mode to Brand', () => {
    expect(DEFAULT_UI_HEADING_CASE).toBe('brand');
    expect(normalizeUiHeadingCase(undefined)).toBe('brand');
    expect(normalizeUiHeadingCase('lowercase')).toBe('brand');
    expect(normalizeUiHeadingCase('original')).toBe('original');
  });

  it('lowercases editorial chrome while preserving technical tokens in Brand', () => {
    expect(formatUiChromeText('New project', 'brand')).toBe('new project');
    expect(formatUiChromeText('AI Assistant', 'brand')).toBe('AI assistant');
    expect(formatUiChromeText('SEO Settings', 'brand')).toBe('SEO settings');
    expect(formatUiChromeText('CMS Page', 'brand')).toBe('CMS page');
    expect(formatUiChromeText('A/B Tests', 'brand')).toBe('A/B tests');
    expect(formatUiChromeText('field.RUNTIME Diagnostics', 'brand')).toBe('field.RUNTIME diagnostics');
  });

  it('keeps authored casing in Original', () => {
    expect(formatUiChromeText('New Project', 'original')).toBe('New Project');
    expect(formatUiChromeText('AI Assistant', 'original')).toBe('AI Assistant');
  });

  it('keeps heading roles for existing CSS-only opt-ins', () => {
    expect(getUiHeadingRole('General')).toBe('brand');
    expect(getUiHeadingRole('Appearance')).toBe('brand');
    expect(getUiHeadingRole('SEO')).toBe('standard');
    expect(getUiHeadingRole('A/B Tests')).toBe('standard');
    expect(getUiHeadingRole('field.ENGINE')).toBe('standard');
  });
});
