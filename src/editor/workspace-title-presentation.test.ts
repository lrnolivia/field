import { describe, expect, it } from 'vitest';
import { workspaceTitlePresentation } from './workspace-title-presentation';

describe('workspace title presentation', () => {
  it('uses the embedded title only with expanded docked left chrome', () => {
    for (const mode of ['docked', 'compact-docked'] as const) {
      expect(workspaceTitlePresentation(mode, true, true)).toBe('embedded');
      expect(workspaceTitlePresentation(mode, false, true)).toBe('compact-pill');
      expect(workspaceTitlePresentation(mode, true, false)).toBe('full-pill');
      expect(workspaceTitlePresentation(mode, false, false)).toBe('full-pill');
    }
  });

  it('keeps the full title pill in floating presentation', () => {
    expect(workspaceTitlePresentation('floating', false, true)).toBe('full-pill');
    expect(workspaceTitlePresentation('floating', false, false)).toBe('full-pill');
  });
});
