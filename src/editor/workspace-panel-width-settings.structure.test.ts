import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const settings = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/overlays/SettingsOverlay.tsx'), 'utf8');
const handles = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/WorkspacePaneResizeHandles.tsx'), 'utf8');
const store = fs.readFileSync(path.resolve(process.cwd(), 'src/code/stores/workspace-panels-store.ts'), 'utf8');

describe('workspace panel width settings', () => {
  it('replaces sliders with intentional presets and Custom detection', () => {
    const start = settings.indexOf('label="Panel widths"');
    const end = settings.indexOf('</SettingsRow>', start);
    const block = settings.slice(start, end);
    expect(block).toContain('WORKSPACE_PANEL_WIDTH_PRESETS.map');
    expect(block).toContain("activePanelWidthPreset");
    expect(block).toContain("'Custom'");
    expect(block).not.toContain('type="range"');
  });

  it('persists a lock that removes editor mouse resize handles', () => {
    expect(store).toContain('workspacePanelWidthsLockedAtom');
    expect(store).toContain("'field:prefs:workspacePanelWidthsLocked:v1'");
    expect(handles).toContain('const panelWidthsLocked = useAtomValue(workspacePanelWidthsLockedAtom)');
    expect(handles).toContain('if (hidden || panelWidthsLocked) return null');
  });

  it('keeps preset selection available while locked', () => {
    expect(settings).toContain("onClick={() => applyPanelWidthPreset(preset.id)}");
    expect(settings).toContain('Mouse resizing is locked. Presets remain available here.');
  });
});
