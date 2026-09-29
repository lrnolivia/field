// FillControl.tsx — Self-contained fill ToolAtom (solid/gradient/pattern/image/video/shader).
// Supports Single mode (current behavior) and Multiple mode (stacked background layers).

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLivePreview } from '../../../hooks/useLivePreview';
import { useAtomValue, useSetAtom } from 'jotai';
import { cmsPageMetaAtom } from '@/code/stores/cms-page-store';
import LocaleBoundPill, { useLocaleStyleOverrides } from '@/editor/controls/LocaleBoundPill';
import { UnifiedControlProvider, useControlContext, useControlContextOptional, InspectorProvenanceBoundary } from '../../../controls/unified';
import { UsedByRow } from '../../../controls/unified/UsedByRow';
import { VariableBoundPill, LegacyVariableBoundPill } from '../../../controls/VariableBoundPill';
import { useControlOptional } from '../../../controls/ControlProvider';
import { CmsBoundPill, CmsMissingPill, cmsOrphanInScope } from '../../../controls/CmsBoundPill';
import type { MenuItem } from '../../../controls/control-menu-items';
import { createDefaultGradient, formatGradient } from '@/shared/gradient-utils';
import { toHexDisplay } from '../../../ui/color-utils';
import { splitPaintOpacity, serializePaintOpacity } from '../../../ui/paint-opacity';
import type { AtomProps } from '../../../controls/unified/types';
import { ToolSelect, ToolSegmentedControl, ControlActionRow, ColorSwatch, ControlLabel, RemoveButton, PaintRow, ToolRow, ToolInput, ColorInput } from '../../../controls';
import { YES_NO_OPTIONS } from '../../../controls/css-property-options';
import ToolPopup, { useToolPopup } from '../../../ui/ToolPopup';
import PaintPickerShell, { ALL_PAINT_TYPES, SOLID_ONLY_PAINT_TYPES, type PaintPickerSurface, type PaintType } from '../../../ui/PaintPickerShell';
import ColorPicker from '../../../ui/ColorPicker';
import CreateColorPresetPanel from '../../../ui/CreateColorPresetPanel';
import { CreatePresetPopupBody } from '../../../ui/CreatePresetPopup';
import GradientEditor from '../../../ui/GradientEditor';
import ImageSearchModal from '../../../ui/ImageSearchModal';
import CropModal from '../../../ui/CropModal';
import VideoSearchModal from '../../../ui/VideoSearchModal';
import AssetPresetGrid from '../../../ui/AssetPresetGrid';
import CreateImagePresetPanel from '../../../ui/CreateImagePresetPanel';
import CreateVideoPresetPanel from '../../../ui/CreateVideoPresetPanel';
import EditAssetPresetPanel from '../../../ui/EditAssetPresetPanel';
import ColorPresetEditPanel from '../../../ui/ColorPresetEditPanel';
import { getCanvasBridge } from '@/canvas/canvas-bridge';
import { isComponentFileAtom, selectedIdsAtom, getNodeFromCache } from '@/code/stores/store';
import { useNodesComputed } from '@/code/stores/node-family';
import { aggregateSelectionColors } from '@/editor/selection-colors';
import { forSelectionTargets } from '../../../controls/multi-select-targets';
import { isComponentVariantViewportAtom, activeComponentVariantAtom } from '@/code/stores/viewport-store';
import { fillClearStyles, isTransparentColor } from './fill-clear';
import { getContentRoot, updateNodeStyles } from '@/canvas/node-ops';
import { activeCodeAtom } from '@/code/project/active-file-store';
import { getPropType } from '@/code/components/prop-meta';
import {
  parseBackgroundLayers, formatBackgroundLayers, isMultiLayerBackground,
  createDefaultLayer, getLayerLabel,
  type BgLayer, type BgLayerType,
} from '../../../ui/background-layer-utils';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { presetTokensAtom, livePresetTokenAtom } from '@/code/stores/preset-store';
import { resolveCssTokens } from '@/code/project/preset-ops';
import { queueMutation } from '@/code/mutation/mutation-queue';
import { instantCreateAndEditVariable } from '../../../controls/instant-create-variable';
import { activeFilePathAtom } from '@/code/project/active-file-store';
import { pageVariablesAtom } from '@/code/stores/page-variables-store';
import { variableModalRequestAtom } from '@/code/stores/store';
import { canAcceptChildren } from '@/shared/constants';
import type { CanvasNode } from '@/code/parsing/parser';
import { trace } from '@/shared/debug-trace';
import { parseVarRef } from '@/shared/css-utils';
import { DEFAULT_PATTERN_FILL, PATTERN_KIND_OPTIONS, buildPatternFillStyles, defaultAssetPatternFill, parsePatternFillConfig, serializePatternFillConfig, patternMonsterMaxColors, type AssetPatternFillConfig, type AssetPatternRepeat, type FieldPatternFillConfig, type PatternFillConfig, type PatternKind, type PatternMonsterDefinition, type PatternMonsterFillConfig } from '@/editor/ui/pattern-fill-utils';
import PatternLibraryPanel from '@/editor/ui/PatternLibraryPanel';
import ShaderFillTab from '@/editor/ui/ShaderFillTab';

// ─── Shared Constants ───────────────────────────────────────────────────────

const SIZE_OPTIONS = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'auto', label: 'Auto' },
  { value: '100% 100%', label: 'Stretch' },
];

const POSITION_OPTIONS = [
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'top left', label: 'Top Left' },
  { value: 'top right', label: 'Top Right' },
  { value: 'bottom left', label: 'Bottom Left' },
  { value: 'bottom right', label: 'Bottom Right' },
];

const REPEAT_OPTIONS = [
  { value: 'no-repeat', label: 'No Repeat' },
  { value: 'repeat', label: 'Repeat' },
  { value: 'repeat-x', label: 'Repeat X' },
  { value: 'repeat-y', label: 'Repeat Y' },
];

const ATTACHMENT_OPTIONS = [
  { value: 'scroll', label: 'Scroll' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'local', label: 'Local' },
];

const BLEND_MODE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn', label: 'Color Burn' },
  { value: 'hard-light', label: 'Hard Light' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
  { value: 'hue', label: 'Hue' },
  { value: 'saturation', label: 'Saturation' },
  { value: 'color', label: 'Color' },
  { value: 'luminosity', label: 'Luminosity' },
];

// ─── Image Fill Tab (shared between Single and Multiple) ────────────────────

function ImageFillTab({ styles, onUpdate, libraryOnly = false }: { styles: Record<string, string>; onUpdate: (k: string, v: string) => void; libraryOnly?: boolean }) {
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const { pushPanel, popPanel } = useToolPopup();
  const allTokens = useAtomValue(presetTokensAtom);
  const imagePresets = allTokens.filter(t => t.category === 'image');

  const bg = styles.backgroundImage || '';
  // Detect var(--image-name) — i.e. the user has applied an image preset.
  const presetMatch = bg.match(/^var\(\s*--([^)\s,]+)\s*\)$/);
  const activePresetName = presetMatch && imagePresets.some(p => p.name === presetMatch[1])
    ? presetMatch[1]
    : undefined;
  // Resolve the underlying URL for preview (preset reference or direct url()).
  const previewUrl = activePresetName
    ? extractUrl(imagePresets.find(p => p.name === activePresetName)?.value || '')
    : extractUrl(bg);
  const hasImage = !!previewUrl;
  const previewBg = previewUrl ? `url(${previewUrl})` : 'none';

  const handleCreatePreset = useCallback(() => {
    pushPanel('New Image Preset', (
      <CreateImagePresetPanel initialValue={bg} onCreated={() => popPanel()} />
    ));
  }, [pushPanel, popPanel, bg]);

  const handleEditPreset = useCallback((name: string) => {
    const token = imagePresets.find(t => t.name === name);
    if (!token) return;
    const displayName = token.label || name.replace(/^image-/, '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    pushPanel(`Edit "${displayName}"`, (
      <EditAssetPresetPanel
        presetName={name}
        type="image"
        initialValue={token.value}
        onDeleted={() => popPanel()}
      />
    ));
  }, [pushPanel, popPanel, imagePresets]);

  const applyImageUrl = useCallback((url: string) => {
    onUpdate('backgroundColor', '');
    onUpdate('background', '');
    onUpdate('backgroundImage', `url(${url})`);
    onUpdate('backgroundSize', styles.backgroundSize || 'cover');
    onUpdate('backgroundPosition', styles.backgroundPosition || 'center');
    onUpdate('backgroundRepeat', styles.backgroundRepeat || 'no-repeat');
    trace.action('fill:image-selected', { url: url.slice(0, 80), source: 'media-context' });
  }, [onUpdate, styles.backgroundSize, styles.backgroundPosition, styles.backgroundRepeat]);

  const openMedia = useCallback(() => {
    pushPanel('Media', (
      <div data-contextual-media-picker="fill-image" className="min-h-0">
        <ImageSearchModal
          isOpen
          embedded
          compact
          onClose={() => popPanel()}
          onSelect={applyImageUrl}
        />
      </div>
    ));
  }, [pushPanel, popPanel, applyImageUrl]);

  return (
    <div className="flex flex-col gap-4">
      {!libraryOnly && (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="w-[190px]">
              <ToolSelect
                value={styles.backgroundSize || 'cover'}
                onChange={(value) => onUpdate('backgroundSize', value)}
                options={SIZE_OPTIONS}
              />
            </div>
            <button
              type="button"
              onClick={() => hasImage && setCropModalOpen(true)}
              disabled={!hasImage}
              aria-label="Crop image"
              title="Crop image"
              className="w-9 h-9 flex items-center justify-center rounded-[7px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M18 22V8a2 2 0 0 0-2-2H2" />
              </svg>
            </button>
          </div>

          <button
            type="button"
            onClick={openMedia}
            className="relative w-full aspect-square max-h-[300px] overflow-hidden rounded-[10px] border border-[var(--control-border)] bg-[var(--canvas-bg)] group"
            title={previewUrl || 'Select image source'}
          >
            <span
              className="absolute inset-0"
              style={hasImage
                ? { backgroundImage: previewBg, backgroundSize: styles.backgroundSize || 'cover', backgroundPosition: styles.backgroundPosition || 'center', backgroundRepeat: styles.backgroundRepeat || 'no-repeat' }
                : ALPHA_CHECKER_STYLE}
              aria-hidden
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="h-9 px-3 rounded-[7px] border border-white/15 bg-black/45 backdrop-blur-sm flex items-center gap-2 text-[13px] font-medium text-white shadow-sm group-hover:bg-black/55 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                {hasImage ? 'Replace source…' : 'Select source…'}
              </span>
            </span>
          </button>

          {hasImage && (
            <div className="border-t border-[var(--border-light)] pt-4 flex flex-col gap-3">
              <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
                <span className="text-[12px] text-[var(--text-secondary)]">Position</span>
                <ToolSelect value={styles.backgroundPosition || 'center'} onChange={(value) => onUpdate('backgroundPosition', value)} options={POSITION_OPTIONS} />
              </div>
              <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
                <span className="text-[12px] text-[var(--text-secondary)]">Repeat</span>
                <ToolSelect value={styles.backgroundRepeat || 'no-repeat'} onChange={(value) => onUpdate('backgroundRepeat', value)} options={REPEAT_OPTIONS} />
              </div>
              <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
                <span className="text-[12px] text-[var(--text-secondary)]">Attachment</span>
                <ToolSelect value={styles.backgroundAttachment || 'scroll'} onChange={(value) => onUpdate('backgroundAttachment', value)} options={ATTACHMENT_OPTIONS} />
              </div>
            </div>
          )}
        </>
      )}

      {libraryOnly && (
        <AssetPresetGrid
          presets={imagePresets}
          type="image"
          activePresetName={activePresetName}
          onApplyPreset={(varVal) => {
            onUpdate('backgroundColor', '');
            onUpdate('background', '');
            onUpdate('backgroundImage', varVal);
            onUpdate('backgroundSize', styles.backgroundSize || 'cover');
            onUpdate('backgroundPosition', styles.backgroundPosition || 'center');
            onUpdate('backgroundRepeat', styles.backgroundRepeat || 'no-repeat');
            trace.action('fill:image-preset-applied', { var: varVal });
          }}
          onCreatePreset={handleCreatePreset}
          onEditPreset={handleEditPreset}
        />
      )}

      <CropModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        src={previewUrl}
        onApply={(url) => {
          onUpdate('backgroundColor', '');
          onUpdate('background', '');
          onUpdate('backgroundImage', `url(${url})`);
          onUpdate('backgroundSize', styles.backgroundSize || 'cover');
          onUpdate('backgroundPosition', styles.backgroundPosition || 'center');
          onUpdate('backgroundRepeat', styles.backgroundRepeat || 'no-repeat');
          trace.action('fill:image-cropped', { url: url.slice(0, 80) });
        }}
      />
    </div>
  );
}

/** Pull URL out of `url(...)` wrapper (handles single/double/no quotes). */
function extractUrl(value: string): string | null {
  const m = value.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
  return m ? m[1] : null;
}

// ─── Single Mode Fill Popup Content ─────────────────────────────────────────

type FillTab = 'color' | 'gradient' | 'pattern' | 'image' | 'video' | 'shader';

function detectFillTab(styles: Record<string, string>, node?: CanvasNode | null): FillTab {
  if (node?.attrs?.['data-field-shader-fill']) return 'shader';
  if (node?.attrs?.['data-field-pattern']) return 'pattern';
  // bg-video child on the node = Video tab. This is the new canonical state;
  // the legacy `backgroundVideo` style key was a no-op CSS prop that the parser
  // now strips silently, so we don't check it here.
  if (node?.bgVideo) return 'video';
  const bgImage = styles.backgroundImage || '';
  // Direct url() — Image tab.
  if (bgImage.includes('url(')) return 'image';
  // Image preset reference (`var(--image-...)`). Other var() refs fall through
  // to color tab so things like `var(--color-brand)` don't open Image.
  if (/^var\(\s*--image-/.test(bgImage)) return 'image';
  if (styles.background?.includes('gradient') || bgImage.includes('gradient')) return 'gradient';
  return 'color';
}

function fillTypeSignature(styles: Record<string, string>, node?: CanvasNode | null): string {
  const type = detectFillTab(styles, node);
  return [
    type,
    node?.attrs?.['data-field-pattern'] ? 'pattern' : '',
    node?.attrs?.['data-field-shader-fill'] ? 'shader' : '',
    node?.bgVideo ? 'video' : '',
  ].join('|');
}

function hasSemanticSingleFill(node?: CanvasNode | null): boolean {
  return !!(
    node?.attrs?.['data-field-pattern']
    || node?.attrs?.['data-field-shader-fill']
    || node?.bgVideo
  );
}

/** Transparent-checker pattern for the empty poster swatch — matches the
 *  alpha-checker visual the rest of the editor uses for "no value yet". */
const ALPHA_CHECKER_STYLE: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%), ' +
    'linear-gradient(-45deg, rgba(255,255,255,0.15) 25%, transparent 25%), ' +
    'linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.15) 75%), ' +
    'linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.15) 75%)',
  backgroundSize: '6px 6px',
  backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0',
};

function PatternFillTab({ node, libraryOnly = false }: { node: CanvasNode | null; libraryOnly?: boolean }) {
  const { pushPanel, popPanel } = useToolPopup();
  const nodeId = node?.id ?? null;
  const raw = node?.attrs?.['data-field-pattern'] || '';
  const [config, setConfig] = useState<PatternFillConfig>(() => parsePatternFillConfig(raw));
  const [monsterDefinition, setMonsterDefinition] = useState<PatternMonsterDefinition | null>(null);

  useEffect(() => {
    setConfig(parsePatternFillConfig(raw));
  }, [nodeId, raw]);

  const monsterId = config.source === 'pattern-monster' ? config.patternId : null;
  useEffect(() => {
    if (!monsterId) {
      setMonsterDefinition(null);
      return;
    }
    let cancelled = false;
    import('@/editor/ui/patterns/pattern-monster-catalog').then(module => {
      if (!cancelled) setMonsterDefinition(module.findPatternMonsterDefinition(monsterId) || null);
    });
    return () => { cancelled = true; };
  }, [monsterId]);

  const applyPattern = useCallback((next: PatternFillConfig, definition?: PatternMonsterDefinition | null) => {
    const resolvedDefinition = next.source === 'pattern-monster' ? (definition || monsterDefinition) : undefined;
    if (next.source === 'pattern-monster' && !resolvedDefinition) return;

    setConfig(next);
    if (!nodeId) return;
    const compiled = buildPatternFillStyles(next, resolvedDefinition);
    forSelectionTargets(nodeId, (tid) => {
      queueMutation({
        type: 'updateStyles',
        nodeId: tid,
        styles: {
          background: '',
          backgroundColor: compiled.backgroundColor,
          backgroundImage: compiled.backgroundImage,
          backgroundSize: compiled.backgroundSize,
          backgroundPosition: compiled.backgroundPosition,
          backgroundRepeat: compiled.backgroundRepeat,
          backgroundAttachment: '',
          WebkitMaskImage: compiled.WebkitMaskImage,
          maskImage: compiled.maskImage,
        },
      });
      queueMutation({
        type: 'updateHtmlAttrs',
        nodeId: tid,
        attrs: { 'data-field-pattern': serializePatternFillConfig(next) },
      });
    });
    trace.action('fill:pattern-applied', {
      nodeId,
      source: next.source,
      pattern: next.source === 'field' ? next.kind : next.source === 'pattern-monster' ? next.patternId : next.assetUrl,
    });
  }, [nodeId, monsterDefinition]);

  if (libraryOnly) {
    return (
      <PatternLibraryPanel
        activePatternId={config.source === 'pattern-monster' ? config.patternId : undefined}
        onSelect={(definition, next) => {
          setMonsterDefinition(definition);
          applyPattern(next, definition);
        }}
      />
    );
  }

  const openPatternMedia = () => {
    pushPanel('Pattern source', (
      <div data-contextual-media-picker="fill-pattern" className="min-h-0">
        <ImageSearchModal
          isOpen
          embedded
          compact
          onClose={() => popPanel()}
          onSelect={(url) => {
            applyPattern(defaultAssetPatternFill(url));
            // ImageSearchModal closes its own single-select flow through onClose.
          }}
        />
      </div>
    ));
  };

  if (config.source === 'asset') {
    const preview = buildPatternFillStyles(config);
    const updateAsset = (next: Partial<AssetPatternFillConfig>) => {
      applyPattern({ ...config, ...next });
    };
    const repeatOptions: Array<{ value: AssetPatternRepeat; label: string }> = [
      { value: 'repeat', label: 'Tile' },
      { value: 'repeat-x', label: 'X only' },
      { value: 'repeat-y', label: 'Y only' },
      { value: 'no-repeat', label: 'Once' },
    ];

    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={openPatternMedia}
          className="relative w-full aspect-square max-h-[300px] overflow-hidden rounded-[10px] border border-[var(--control-border)] bg-[var(--canvas-bg)] group"
          aria-label="Replace pattern source"
          title={config.assetUrl}
        >
          <span className="absolute inset-0" style={preview as React.CSSProperties} aria-hidden />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-9 px-3 rounded-[7px] border border-white/15 bg-black/45 backdrop-blur-sm flex items-center gap-2 text-[13px] font-medium text-white shadow-sm group-hover:bg-black/55 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z" /><path d="m7 14 3-3 3 3 2-2 2 2" /></svg>
              Select source…
            </span>
          </span>
        </button>

        <div className="border-t border-[var(--border-light)] pt-4 flex flex-col gap-3">
          <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
            <span className="text-[12px] text-[var(--text-secondary)]">Tile type</span>
            <ToolSegmentedControl
              value={config.repeat}
              onChange={(value) => updateAsset({ repeat: value as AssetPatternRepeat })}
              options={repeatOptions.map(option => ({ value: option.value, label: option.label }))}
              size="sm"
            />
          </div>
          <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
            <span className="text-[12px] text-[var(--text-secondary)]">Scale</span>
            <ToolInput value={String(config.tileSize)} onChange={(value) => updateAsset({ tileSize: Math.max(4, Math.min(1024, Number(value) || 4)) })} min={4} max={1024} step={1} chevronLabel="px" ariaLabel="Pattern tile size" />
          </div>
          <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
            <span className="text-[12px] text-[var(--text-secondary)]">Alignment</span>
            <ToolSelect value={config.position} onChange={(value) => updateAsset({ position: value })} options={POSITION_OPTIONS} ariaLabel="Pattern alignment" />
          </div>
          <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
            <span className="text-[12px] text-[var(--text-secondary)]">Background</span>
            <ColorInput value={config.background === 'transparent' ? 'rgba(0,0,0,0)' : config.background} onChange={(value) => updateAsset({ background: value })} showAlpha />
          </div>
        </div>
      </div>
    );
  }

  if (config.source === 'pattern-monster') {
    if (!monsterDefinition) {
      return <div className="py-8 text-center text-[11px] text-[var(--text-disabled)]">Loading pattern controls…</div>;
    }

    const preview = buildPatternFillStyles(config, monsterDefinition);
    const maxColors = patternMonsterMaxColors(monsterDefinition);
    const updateMonster = (next: Partial<PatternMonsterFillConfig>) => {
      applyPattern({ ...config, ...next }, monsterDefinition);
    };

    return (
      <div className="flex flex-col gap-4">
        <div
          className="w-full aspect-square max-h-[300px] rounded-[10px] border border-[var(--control-border)]"
          style={preview as React.CSSProperties}
          aria-label={`${monsterDefinition.title} preview`}
        />

        <div className="flex items-center justify-between px-0.5 text-[10px] text-[var(--text-disabled)]">
          <span className="truncate pr-2">{monsterDefinition.title}</span>
          <span className="shrink-0">Pattern Monster · MIT</span>
        </div>
        <button type="button" onClick={openPatternMedia} className="h-10 px-3 rounded-[8px] border border-[var(--control-border)] bg-[var(--control-bg)] text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--control-border-hover)] transition-colors">Select source…</button>
        <div className="border-t border-[var(--border-light)] pt-4 flex flex-col gap-3">

        {maxColors > 2 && (
          <ToolRow label="Colors" hideCreateVariable>
            <ToolInput
              value={String(config.colorCount)}
              onChange={(value) => updateMonster({ colorCount: Math.max(2, Math.min(maxColors, Math.round(Number(value) || 2))) })}
              min={2}
              max={maxColors}
              step={1}
              ariaLabel="Pattern color count"
            />
          </ToolRow>
        )}

        {config.colors.slice(0, config.colorCount).map((color, index) => (
          <ToolRow key={index} label={index === 0 ? 'Background' : `Color ${index}`} hideCreateVariable>
            <ColorInput
              allowPresets={false}
              value={color}
              onChange={(value) => {
                const colors = [...config.colors];
                colors[index] = value;
                updateMonster({ colors });
              }}
              showAlpha
            />
          </ToolRow>
        ))}

        <ToolRow label="Scale" hideCreateVariable>
          <ToolInput
            value={String(config.scale)}
            onChange={(value) => updateMonster({ scale: Math.max(1, Math.min(monsterDefinition.maxScale, Number(value) || 1)) })}
            min={1}
            max={monsterDefinition.maxScale}
            step={0.25}
            ariaLabel="Pattern scale"
          />
        </ToolRow>

        {monsterDefinition.mode !== 'fill' && (
          <ToolRow label="Stroke" hideCreateVariable>
            <ToolInput
              value={String(config.stroke)}
              onChange={(value) => updateMonster({ stroke: Math.max(0.5, Math.min(monsterDefinition.maxStroke, Number(value) || 0.5)) })}
              min={0.5}
              max={monsterDefinition.maxStroke}
              step={0.5}
              chevronLabel="px"
              ariaLabel="Pattern stroke width"
            />
          </ToolRow>
        )}

        {monsterDefinition.mode === 'stroke-join' && (
          <ToolRow label="Join" hideCreateVariable>
            <ToolSegmentedControl
              value={String(config.join)}
              onChange={(value) => updateMonster({ join: value === '2' ? 2 : 1 })}
              options={[{ value: '1', label: 'Square' }, { value: '2', label: 'Round' }]}
              size="sm"
            />
          </ToolRow>
        )}

        {monsterDefinition.maxSpacing[0] > 0 && (
          <ToolRow label="Spacing X" hideCreateVariable>
            <ToolInput
              value={String(config.spacing[0])}
              onChange={(value) => updateMonster({ spacing: [Math.max(0, Math.min(monsterDefinition.maxSpacing[0], Number(value) || 0)), config.spacing[1]] })}
              min={0}
              max={monsterDefinition.maxSpacing[0]}
              step={0.5}
              chevronLabel="px"
              ariaLabel="Pattern horizontal spacing"
            />
          </ToolRow>
        )}

        {monsterDefinition.maxSpacing[1] > 0 && (
          <ToolRow label="Spacing Y" hideCreateVariable>
            <ToolInput
              value={String(config.spacing[1])}
              onChange={(value) => updateMonster({ spacing: [config.spacing[0], Math.max(0, Math.min(monsterDefinition.maxSpacing[1], Number(value) || 0))] })}
              min={0}
              max={monsterDefinition.maxSpacing[1]}
              step={0.5}
              chevronLabel="px"
              ariaLabel="Pattern vertical spacing"
            />
          </ToolRow>
        )}

        <ToolRow label="Angle" hideCreateVariable>
          <ToolInput
            value={String(config.angle)}
            onChange={(value) => updateMonster({ angle: Math.max(0, Math.min(180, Number(value) || 0)) })}
            min={0}
            max={180}
            step={5}
            chevronLabel="°"
            ariaLabel="Pattern angle"
          />
        </ToolRow>

        <ToolRow label="Offset X" hideCreateVariable>
          <ToolInput
            value={String(config.moveLeft)}
            onChange={(value) => updateMonster({ moveLeft: Math.max(monsterDefinition.width * -2, Math.min(0, Number(value) || 0)) })}
            min={monsterDefinition.width * -2}
            max={0}
            step={1}
            chevronLabel="px"
            ariaLabel="Pattern horizontal offset"
          />
        </ToolRow>

        <ToolRow label="Offset Y" hideCreateVariable>
          <ToolInput
            value={String(config.moveTop)}
            onChange={(value) => updateMonster({ moveTop: Math.max(monsterDefinition.height * -2, Math.min(0, Number(value) || 0)) })}
            min={monsterDefinition.height * -2}
            max={0}
            step={1}
            chevronLabel="px"
            ariaLabel="Pattern vertical offset"
          />
        </ToolRow>
        </div>
      </div>
    );
  }

  const preview = buildPatternFillStyles(config);
  const updateField = (next: Partial<FieldPatternFillConfig>) => {
    applyPattern({ ...config, ...next });
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={openPatternMedia}
        className="relative w-full aspect-square max-h-[300px] overflow-hidden rounded-[10px] border border-[var(--control-border)] bg-[var(--canvas-bg)] group"
        aria-label="Select pattern source"
      >
        <span className="absolute inset-0" style={preview as React.CSSProperties} aria-hidden />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-9 px-3 rounded-[7px] border border-white/15 bg-black/45 backdrop-blur-sm flex items-center gap-2 text-[13px] font-medium text-white shadow-sm group-hover:bg-black/55 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z" /><path d="M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" /></svg>
            Select source…
          </span>
        </span>
      </button>

      <div className="border-t border-[var(--border-light)] pt-4 flex flex-col gap-3">
        <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
          <span className="text-[12px] text-[var(--text-secondary)]">Tile type</span>
          <ToolSelect value={config.kind} onChange={(value) => updateField({ kind: value as PatternKind })} options={PATTERN_KIND_OPTIONS} ariaLabel="Pattern kind" />
        </div>
        <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
          <span className="text-[12px] text-[var(--text-secondary)]">Scale</span>
          <ToolInput value={String(config.tileSize)} onChange={(value) => updateField({ tileSize: Math.max(4, Math.min(120, Number(value) || 4)) })} min={4} max={120} step={1} chevronLabel="px" ariaLabel="Pattern scale" />
        </div>
        <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
          <span className="text-[12px] text-[var(--text-secondary)]">Opacity</span>
          <ToolInput value={String(Math.round(config.opacity * 100))} onChange={(value) => updateField({ opacity: Math.max(0, Math.min(100, Number(value) || 0)) / 100 })} min={0} max={100} step={1} chevronLabel="%" ariaLabel="Pattern opacity" />
        </div>
        <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
          <span className="text-[12px] text-[var(--text-secondary)]">Thickness</span>
          <ToolInput value={String(config.thickness)} onChange={(value) => updateField({ thickness: Math.max(0.5, Math.min(12, Number(value) || 0.5)) })} min={0.5} max={12} step={0.5} chevronLabel="px" ariaLabel="Pattern thickness" />
        </div>
        <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
          <span className="text-[12px] text-[var(--text-secondary)]">Foreground</span>
          <ColorInput allowPresets={false} value={config.color} onChange={(value) => updateField({ color: value })} showAlpha />
        </div>
        <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-3">
          <span className="text-[12px] text-[var(--text-secondary)]">Background</span>
          <ColorInput allowPresets={false} value={config.background === 'transparent' ? 'rgba(0,0,0,0)' : config.background} onChange={(value) => updateField({ background: value })} showAlpha />
        </div>
      </div>
    </div>
  );
}


const VIDEO_OBJECT_FIT_OPTIONS = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'fill', label: 'Stretch' },
  { value: 'none', label: 'None' },
  { value: 'scale-down', label: 'Scale Down' },
];

function VideoFillTab({ node, libraryOnly = false }: { node: CanvasNode | null; libraryOnly?: boolean }) {
  const { pushPanel, popPanel } = useToolPopup();
  const allTokens = useAtomValue(presetTokensAtom);
  const videoPresets = allTokens.filter(t => t.category === 'video');

  const nodeId = node?.id ?? null;
  const nodeTag = node?.type ?? null;
  const acceptsChildren = nodeTag ? canAcceptChildren(nodeTag) : true;

  const cfg = node?.bgVideo;
  const currentUrl = cfg?.src ?? '';
  const activePresetName = currentUrl
    ? videoPresets.find(p => p.value === currentUrl)?.name
    : undefined;
  const hasVideo = !!currentUrl;

  // Partial-update wrapper — every toggle/select calls this with one field.
  const patchVideo = useCallback((opts: Parameters<typeof queueMutation>[0] extends infer _ ? Record<string, unknown> : never) => {
    if (!nodeId) return;
    forSelectionTargets(nodeId, (tid) => queueMutation({ type: 'setVideoFill', nodeId: tid, opts: opts as any }));
    trace.action('fill:video-patched', { nodeId, fields: Object.keys(opts) });
  }, [nodeId]);

  // Apply a NEW src — used by the file picker and by preset-apply. Also
  // clears competing fills that may be set on the host.
  const applyVideoSrc = useCallback((url: string) => {
    if (!nodeId) return;
    forSelectionTargets(nodeId, (tid) => {
      queueMutation({ type: 'setVideoFill', nodeId: tid, opts: { src: url } });
      queueMutation({ type: 'updateStyles', nodeId: tid, styles: {
        backgroundColor: '',
        background: '',
        backgroundImage: '',
        backgroundVideo: '',
      } });
    });
    trace.action('fill:video-src-applied', { nodeId, urlLength: url.length });
  }, [nodeId]);

  const openVideoMedia = useCallback(() => {
    pushPanel('Media', (
      <div data-contextual-media-picker="fill-video" className="min-h-0">
        <VideoSearchModal
          isOpen
          embedded
          compact
          onClose={() => popPanel()}
          onSelect={applyVideoSrc}
        />
      </div>
    ));
  }, [pushPanel, popPanel, applyVideoSrc]);

  const openPosterMedia = useCallback(() => {
    pushPanel('Media', (
      <div data-contextual-media-picker="fill-video-poster" className="min-h-0">
        <ImageSearchModal
          isOpen
          embedded
          compact
          onClose={() => popPanel()}
          onSelect={(url) => patchVideo({ poster: url })}
        />
      </div>
    ));
  }, [pushPanel, popPanel, patchVideo]);

  const handleCreatePreset = useCallback(() => {
    pushPanel('New Video Preset', (
      <CreateVideoPresetPanel initialValue={currentUrl} onCreated={() => popPanel()} />
    ));
  }, [pushPanel, popPanel, currentUrl]);

  const handleEditPreset = useCallback((name: string) => {
    const token = videoPresets.find(t => t.name === name);
    if (!token) return;
    const displayName = token.label || name.replace(/^video-/, '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    pushPanel(`Edit "${displayName}"`, (
      <EditAssetPresetPanel
        presetName={name}
        type="video"
        initialValue={token.value}
        onDeleted={() => popPanel()}
      />
    ));
  }, [pushPanel, popPanel, videoPresets]);

  if (!acceptsChildren) {
    return (
      <div className="flex flex-col gap-2 py-2">
        <p className="text-[10px] text-[var(--text-disabled)]">
          Video backgrounds need an element that can hold children — switch the
          tag to a frame (div / section / etc.) first.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!libraryOnly && (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="w-[190px]">
              <ToolSelect
                value={cfg?.objectFit || 'cover'}
                onChange={(value) => hasVideo && patchVideo({ objectFit: value })}
                options={VIDEO_OBJECT_FIT_OPTIONS}
              />
            </div>
            <button
              type="button"
              onClick={openVideoMedia}
              className="w-9 h-9 flex items-center justify-center rounded-[7px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
              title="Replace video"
              aria-label="Replace video"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8 8 0 1 1-2.34-5.66L20 7.68" /><path d="M20 3v4.68h-4.68" /></svg>
            </button>
          </div>

          <button
            type="button"
            onClick={openVideoMedia}
            className="relative w-full aspect-square max-h-[300px] overflow-hidden rounded-[10px] border border-[var(--control-border)] bg-[var(--canvas-bg)] group"
            title={currentUrl || 'Select video source'}
          >
            {hasVideo ? (
              <video
                src={currentUrl}
                muted
                playsInline
                preload="metadata"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
            ) : (
              <span className="absolute inset-0" style={ALPHA_CHECKER_STYLE} aria-hidden />
            )}
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="h-9 px-3 rounded-[7px] border border-white/15 bg-black/45 backdrop-blur-sm flex items-center gap-2 text-[13px] font-medium text-white shadow-sm group-hover:bg-black/55 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="m10 8 6 4-6 4Z" /></svg>
                {hasVideo ? 'Replace sour
... (output truncated, full output saved to: /mnt/files/.composio/output/bash_fish_stdout.txt)
Run 'cat /mnt/files/.composio/output/bash_fish_stdout.txt' to view the full output, or use 'head -n 100 /mnt/files/.composio/output/bash_fish_stdout.txt' / 'tail -n 100 /mnt/files/.composio/output/bash_fish_stdout.txt' to view parts of it.