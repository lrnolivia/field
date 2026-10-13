import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');

describe('functional effect previews', () => {
  it('replaces the decorative illustration primitive with a legible preview frame', () => {
    const options = read('src/editor/ui/OptionsPanel.tsx');
    expect(options).toContain('export function EffectPreviewFrame');
    expect(options).toContain('data-effect-live-preview');
    expect(options).not.toContain('EffectIllustrationKind');
    expect(options).not.toContain('data-effect-illustration');
  });

  it('makes the box/drop shadow preview reflect actual values and edit X/Y', () => {
    const shadow = read('src/editor/tools/StylesTool/atoms/ShadowControl.tsx');
    expect(shadow).toContain('function ShadowLivePreview');
    expect(shadow).toContain('data-shadow-live-preview');
    expect(shadow).toContain('style={{ boxShadow: shadowValue, filter: dropFilter }}');
    expect(shadow).toContain('onOffsetLive');
    expect(shadow).toContain('onOffsetCommit');
    expect(shadow).toContain("event.key === 'ArrowLeft'");
  });

  it('makes text-shadow preview reflect actual values and edit X/Y', () => {
    const shadow = read('src/editor/tools/TextStyleTool/atoms/ShadowControl.tsx');
    expect(shadow).toContain('function TextShadowLivePreview');
    expect(shadow).toContain('data-text-shadow-live-preview');
    expect(shadow).toContain('textShadow:');
    expect(shadow).toContain('onOffsetCommit');
  });

  it('does not keep static fake previews on blur/filter panels', () => {
    expect(read('src/editor/tools/StylesTool/atoms/FilterControl.tsx')).not.toContain('EffectIllustration');
    expect(read('src/editor/tools/StylesTool/atoms/BackdropFilterControl.tsx')).not.toContain('EffectIllustration');
  });
});
