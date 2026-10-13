import { describe, expect, it } from 'vitest';
import {
  WORKSPACE_PANEL_WIDTH_PRESETS,
  getWorkspacePanelWidthPresetId,
} from '@/code/stores/workspace-panels-store';

describe('workspace panel width presets', () => {
  it('ships three bounded presets', () => {
    expect(WORKSPACE_PANEL_WIDTH_PRESETS).toEqual([
      { id: 'compact', label: 'Compact', description: 'More room for Canvas', left: 232, right: 300 },
      { id: 'balanced', label: 'Balanced', description: 'field defaults', left: 256, right: 328 },
      { id: 'roomy', label: 'Roomy', description: 'More panel breathing room', left: 320, right: 380 },
    ]);
  });

  it('recognizes presets and treats mouse-tuned widths as Custom', () => {
    expect(getWorkspacePanelWidthPresetId(232, 300)).toBe('compact');
    expect(getWorkspacePanelWidthPresetId(256, 328)).toBe('balanced');
    expect(getWorkspacePanelWidthPresetId(320, 380)).toBe('roomy');
    expect(getWorkspacePanelWidthPresetId(264, 336)).toBeNull();
  });
});
