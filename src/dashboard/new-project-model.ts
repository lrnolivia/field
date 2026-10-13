import type { ProjectData } from '@/backend/types';
import { PROJECT_FORMAT } from '@/backend/types';
import { updateCanvasConfigInCode } from '@/code/project/canvas-config';
import {
  PAGE_APPEARANCE_FILE_PATH,
  serializePageAppearanceDocument,
} from '@/code/project/page-appearance-config';
import { createEmptyProject } from '@/code/project/project-fs';
import { VIEWPORT_GAP } from '@/shared/constants';
import type { ViewportConfig } from '@/shared/types';

export type NewProjectCanvasPresetId = 'desktop' | 'laptop' | 'tablet' | 'mobile';
export type NewProjectStyleSetId = 'none' | 'neutral' | 'editorial' | 'studio';

export interface NewProjectCanvasPreset {
  id: NewProjectCanvasPresetId;
  label: string;
  width: number;
  height: number;
  detail: string;
}

export interface NewProjectStyleSet {
  id: NewProjectStyleSetId;
  label: string;
  detail: string;
  suggestedPageColor: string;
}

export interface NewProjectSettings {
  name: string;
  canvasPresetId: NewProjectCanvasPresetId;
  pageColor: string;
  styleSetId: NewProjectStyleSetId;
  additionalViewportIds: NewProjectCanvasPresetId[];
}

export const NEW_PROJECT_CANVAS_PRESETS: readonly NewProjectCanvasPreset[] = [
  { id: 'desktop', label: 'Desktop', width: 1440, height: 900, detail: '1440 × 900' },
  { id: 'laptop', label: 'Laptop', width: 1280, height: 800, detail: '1280 × 800' },
  { id: 'tablet', label: 'Tablet', width: 768, height: 1024, detail: '768 × 1024' },
  { id: 'mobile', label: 'Mobile', width: 390, height: 844, detail: '390 × 844' },
] as const;

export const NEW_PROJECT_STYLE_SETS: readonly NewProjectStyleSet[] = [
  { id: 'none', label: 'None', detail: 'Keep field’s base tokens.', suggestedPageColor: '#ffffff' },
  { id: 'neutral', label: 'Neutral', detail: 'Quiet sans, compact radius, soft contrast.', suggestedPageColor: '#f7f7f5' },
  { id: 'editorial', label: 'Editorial', detail: 'Warm paper, serif headings, restrained detail.', suggestedPageColor: '#fbf7ef' },
  { id: 'studio', label: 'Studio', detail: 'Crisp geometry, strong spacing, sharp surfaces.', suggestedPageColor: '#ffffff' },
] as const;

export const DEFAULT_NEW_PROJECT_SETTINGS: NewProjectSettings = {
  name: 'Untitled',
  canvasPresetId: 'desktop',
  pageColor: '#ffffff',
  styleSetId: 'none',
  additionalViewportIds: [],
};

const STYLE_SET_TOKENS: Record<Exclude<NewProjectStyleSetId, 'none'>, Record<string, string>> = {
  neutral: {
    'color-brand': '#20201f',
    'color-brand-light': '#575754',
    'color-accent': '#20201f',
    'color-surface': '#f7f7f5',
    'color-text': '#1f1f1d',
    'color-text-muted': '#6f6f69',
    'typo-heading-font': "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    'typo-body-font': "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    'radius-card': '8px',
    'radius-button': '6px',
    'shadow-card': '0 1px 2px rgba(0,0,0,0.05)',
    'shadow-elevated': '0 6px 18px rgba(0,0,0,0.09)',
  },
  editorial: {
    'color-brand': '#7a4a2d',
    'color-brand-light': '#a87350',
    'color-accent': '#7a4a2d',
    'color-surface': '#fbf7ef',
    'color-text': '#241f1a',
    'color-text-muted': '#74695f',
    'typo-heading-font': "Georgia, 'Times New Roman', serif",
    'typo-body-font': "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    'typo-heading-weight': '600',
    'radius-card': '4px',
    'radius-button': '4px',
    'shadow-card': '0 1px 2px rgba(60,42,28,0.06)',
    'shadow-elevated': '0 8px 22px rgba(60,42,28,0.10)',
  },
  studio: {
    'color-brand': '#0f6b55',
    'color-brand-light': '#3b8f78',
    'color-accent': '#0f6b55',
    'color-surface': '#ffffff',
    'color-text': '#111111',
    'color-text-muted': '#606060',
    'typo-heading-font': "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    'typo-body-font': "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    'radius-card': '2px',
    'radius-button': '3px',
    'space-section-y': '96px',
    'space-section-x': '72px',
    'shadow-card': '0 0 0 rgba(0,0,0,0)',
    'shadow-elevated': '0 10px 26px rgba(0,0,0,0.12)',
  },
};

function canvasPreset(id: NewProjectCanvasPresetId): NewProjectCanvasPreset {
  return NEW_PROJECT_CANVAS_PRESETS.find((preset) => preset.id === id)
    ?? NEW_PROJECT_CANVAS_PRESETS[0];
}

export function normalizeProjectColor(value: string): string {
  const trimmed = value.trim();
  const match = /^#([0-9a-fA-F]{6})$/.exec(trimmed);
  return match ? `#${match[1].toLowerCase()}` : '#ffffff';
}

export function availableResponsiveCanvasPresets(
  primaryId: NewProjectCanvasPresetId,
): NewProjectCanvasPreset[] {
  const primary = canvasPreset(primaryId);
  return NEW_PROJECT_CANVAS_PRESETS
    .filter((preset) => (preset.id === 'tablet' || preset.id === 'mobile') && preset.width < primary.width)
    .map((preset) => ({ ...preset }));
}

function replaceToken(css: string, name: string, value: string): string {
  const pattern = new RegExp(`(--${name}:\\s*)([^;]+)(;)`);
  if (!pattern.test(css)) throw new Error(`Starter style token --${name} is missing`);
  return css.replace(pattern, `$1${value}$3`);
}

export function applyNewProjectStyleSet(css: string, styleSetId: NewProjectStyleSetId): string {
  if (styleSetId === 'none') return css;
  const tokens = STYLE_SET_TOKENS[styleSetId];
  let next = css;
  for (const [name, value] of Object.entries(tokens)) {
    next = replaceToken(next, name, value);
  }
  return next;
}

function buildViewportConfig(settings: NewProjectSettings): {
  viewports: ViewportConfig[];
  positions: Record<string, { x: number; y: number }>;
} {
  const primary = canvasPreset(settings.canvasPresetId);
  const viewports: ViewportConfig[] = [{
    id: 'desktop',
    label: primary.label,
    width: primary.width,
    height: primary.height,
    isPrimary: true,
    order: 0,
    x: 0,
    y: 0,
  }];
  const positions: Record<string, { x: number; y: number }> = {
    desktop: { x: 0, y: 0 },
  };
  let nextX = primary.width + VIEWPORT_GAP;
  const allowed = new Set(availableResponsiveCanvasPresets(settings.canvasPresetId).map((preset) => preset.id));
  const chosen = settings.additionalViewportIds
    .filter((id, index, all) => allowed.has(id) && all.indexOf(id) === index)
    .map(canvasPreset)
    .sort((a, b) => b.width - a.width);

  chosen.forEach((preset, index) => {
    const viewport: ViewportConfig = {
      id: preset.id,
      label: preset.label,
      width: preset.width,
      height: primary.height,
      isPrimary: false,
      order: index + 1,
      x: nextX,
      y: 0,
    };
    viewports.push(viewport);
    positions[preset.id] = { x: nextX, y: 0 };
    nextX += preset.width + VIEWPORT_GAP;
  });

  return { viewports, positions };
}

export function createNewProjectData(settings: NewProjectSettings): ProjectData {
  const primary = canvasPreset(settings.canvasPresetId);
  const pageColor = normalizeProjectColor(settings.pageColor);
  const files = createEmptyProject();
  const starterPage = files.get('app/page.client.tsx');
  const starterCss = files.get('app/globals.css');
  if (!starterPage || !starterCss) throw new Error('field empty-project starter is incomplete');

  let page = updateCanvasConfigInCode(starterPage, buildViewportConfig(settings));
  if (!/height:\s*'900px'/.test(page)) throw new Error('Empty page height anchor is missing');
  if (!/backgroundColor:\s*'#ffffff'/.test(page)) throw new Error('Empty page background anchor is missing');
  page = page
    .replace(/height:\s*'900px'/, `height: '${primary.height}px'`)
    .replace(/backgroundColor:\s*'#ffffff'/, `backgroundColor: '${pageColor}'`);
  files.set('app/page.client.tsx', page);
  files.set('app/globals.css', applyNewProjectStyleSet(starterCss, settings.styleSetId));
  files.set(PAGE_APPEARANCE_FILE_PATH, serializePageAppearanceDocument({
    pages: {
      'app/page.client.tsx': {
        background: pageColor,
        opacity: 100,
        visible: true,
      },
    },
  }));

  if (settings.styleSetId !== 'none') {
    files.set('_meta/style-set.json', JSON.stringify({
      version: 1,
      id: settings.styleSetId,
    }, null, 2));
  }

  return {
    format: PROJECT_FORMAT,
    files: Object.fromEntries(files),
  };
}
