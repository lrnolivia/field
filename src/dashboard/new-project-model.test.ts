import { describe, expect, it } from 'vitest';
import { parseCanvasConfig } from '@/code/project/canvas-config';
import { parsePageAppearanceDocument } from '@/code/project/page-appearance-config';
import {
  DEFAULT_NEW_PROJECT_SETTINGS,
  availableResponsiveCanvasPresets,
  createNewProjectData,
  normalizeProjectColor,
} from './new-project-model';

describe('new project starter model', () => {
  it('builds a durable blank project with the chosen primary canvas and page color', () => {
    const data = createNewProjectData({
      ...DEFAULT_NEW_PROJECT_SETTINGS,
      name: 'Portfolio',
      canvasPresetId: 'laptop',
      pageColor: '#F4EFE6',
      styleSetId: 'editorial',
      additionalViewportIds: ['tablet', 'mobile'],
    });

    expect(data.format).toBe('revyme-v1');
    const page = data.files['app/page.client.tsx'];
    const config = parseCanvasConfig(page);
    expect(config?.viewports.map((viewport) => [viewport.id, viewport.width, viewport.height])).toEqual([
      ['desktop', 1280, 800],
      ['tablet', 768, 800],
      ['mobile', 390, 800],
    ]);
    expect(page).toContain("height: '800px'");
    expect(page).toContain("backgroundColor: '#f4efe6'");

    const appearance = parsePageAppearanceDocument(data.files['_meta/page-appearance.json']);
    expect(appearance.pages['app/page.client.tsx']).toEqual({
      background: '#f4efe6',
      opacity: 100,
      visible: true,
    });
    expect(data.files['app/globals.css']).toContain("--typo-heading-font: Georgia, 'Times New Roman', serif;");
    expect(JSON.parse(data.files['_meta/style-set.json']).id).toBe('editorial');
  });

  it('only offers responsive canvases smaller than the selected primary canvas', () => {
    expect(availableResponsiveCanvasPresets('desktop').map((preset) => preset.id)).toEqual(['tablet', 'mobile']);
    expect(availableResponsiveCanvasPresets('tablet').map((preset) => preset.id)).toEqual(['mobile']);
    expect(availableResponsiveCanvasPresets('mobile')).toEqual([]);
  });

  it('normalizes invalid page colors to a safe white', () => {
    expect(normalizeProjectColor('#ABCDEF')).toBe('#abcdef');
    expect(normalizeProjectColor('tomato')).toBe('#ffffff');
  });
});
