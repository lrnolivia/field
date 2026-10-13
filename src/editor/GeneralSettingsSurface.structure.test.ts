import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const settings = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/overlays/SettingsOverlay.tsx'), 'utf8');

describe('General Settings surfaced preferences', () => {
  it('surfaces only existing cross-project preferences', () => {
    for (const symbol of [
      'builderThemeAtom',
      'editorThemeModeAtom',
      'editorNeutralLevelAtom',
      'websitePreviewThemeAtom',
      'caseManagementAtom',
      'workspaceModeAtom',
      'workspaceAutoHideAtom',
      'rightInspectorAutoHideAtom',
      'leftContentWidthAtom',
      'rightPaneWidthAtom',
      'workspacePanelWidthsLockedAtom',
      'autoFocusLayersAtom',
      'showRulersAtom',
      'showPixelGridAtom',
      'useSmoothZoomAtom',
      'autoPanSpeedAtom',
    ]) {
      expect(settings).toContain(symbol);
    }
  });

  it('uses visual selectors for visual choices and compact toggles for behaviors', () => {
    expect(settings).toContain('function ChoiceTile');
    expect(settings).toContain('function WorkspaceChoiceGlyph');
    expect(settings).toContain('function SegmentedChoice');
    expect(settings).toContain('BUILDER_THEMES.map');
    expect(settings).toContain('EDITOR_NEUTRAL_SWATCHES');
    expect(settings).toContain('WORKSPACE_PANEL_WIDTH_PRESETS.map');
    expect(settings).toContain('data-panel-width-presets');
    expect(settings).toContain('Lock widths');
  });

  it('keeps website preview appearance source-safe', () => {
    expect(settings).toContain('refreshCanvasTokens()');
    expect(settings).toContain('never rewrites project source');
  });
});
