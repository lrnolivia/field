// SelectionTool.tsx — Multi-select properties panel.
//
// Aggregates background fills (solid colors + gradients) across every
// selected node, de-duplicates by exact value, and renders one row per
// unique value. Editing a row propagates the new value to every selected
// node that had the old one — so the user can recolor matching elements
// as a group without touching each one individually.
//
// COLLAPSED state (compact): one "Colors" row with inline swatch
//   previews — up to 4 inline; overflow becomes `+N`.
// EXPANDED state: full list with one SelectionFillRow per unique value
//   so each is editable. Header carries a `+` / `-` toggle.
//
// Each fill row opens a popup with Color / Gradient tabs (same shape as
// FillControl's Single mode, minus Image / Video — those don't make
// sense across heterogeneous nodes). Switching tabs clears the other
// fill type's property so the rendered background matches the active
// tab.

import { useRef, useState, useEffect } from 'react';
import { useLivePreview } from '../hooks/useLivePreview';
import { useAtomValue, useSetAtom } from 'jotai';
import { selectedIdsAtom, getNodeFromCache } from '@/code/stores/store';
import { useNodesComputed } from '@/code/stores/node-family';
import { ColorSwatch, ToolSegmentedControl, ToolInput, ToolSection } from '../controls';
import ToolPopup from '../ui/ToolPopup';
import ColorPicker from '../ui/ColorPicker';
import GradientEditor from '../ui/GradientEditor';
import { presetTokensAtom } from '@/code/stores/preset-store';
import { toHexDisplay } from '../ui/color-utils';
import { splitPaintOpacity, serializePaintOpacity } from '../ui/paint-opacity';
import PresetPicker from '../ui/PresetPicker';
import { updateNodeStyles, getContentRoot, parseRectCacheKey } from '@/canvas/node-ops';
import { getCanvasBridge } from '@/canvas/canvas-bridge';
import { trace } from '@/shared/debug-trace';
import { parseVarRef } from '@/shared/css-utils';

/** Skip these as "no fill" so the aggregation isn't dominated by transparent
 *  defaults the user didn't intentionally set. */
const EMPTY_VALUES = new Set(['', 'transparent', 'rgba(0, 0, 0, 0)', 'rgba(0,0,0,0)', 'none']);

/** Threshold for inline display in the collapsed row. ≤ this many unique
 *  fills → render every swatch; more than this → render the first 4 and
 *  add `+N`. */
const SELECTION_COLOR_VISIBLE_LIMIT = 10;

interface ColorGroup {
  /** The exact CSS value the rule applies to. */
  value: string;
  /** Node ids that currently render with this value. */
  nodeIds: string[];
  /** Whether the value is a gradient (vs. a plain color). */
  isGradient: boolean;
}

function isGradientValue(v: string): boolean {
  return /\b(linear-gradient|radial-gradient|conic-gradient|repeating-)/.test(v);
}

/** Group selected nodes by their background fill. Reads both
 *  `backgroundColor` (solid colors) AND `background` / `backgroundImage`
 *  (gradients) so the aggregator picks up every authored fill. */
function aggregateFills(
  selectedIds: string[],
  nodes: Map<string, import('@/code/parsing/parser').CanvasNode>,
): ColorGroup[] {
  const map = new Map<string, { ids: string[]; isGradient: boolean }>();
  const collect = (id: string, raw: string | undefined) => {
    if (!raw || EMPTY_VALUES.has(raw)) return;
    const existing = map.get(raw);
    if (existing) existing.ids.push(id);
    else map.set(raw, { ids: [id], isGradient: isGradientValue(raw) });
  };
  for (const id of selectedIds) {
    const n = getNodeFromCache(id) ?? nodes.get(id);
    if (!n) continue;
    collect(id, n.styles?.backgroundColor);
    const bg = n.styles?.background;
    if (bg && isGradientValue(bg)) collect(id, bg);
    const bgImg = n.styles?.backgroundImage;
    if (bgImg && isGradientValue(bgImg)) collect(id, bgImg);
  }
  return Array.from(map.entries())
    .map(([value, { ids, isGradient }]) => ({ value, nodeIds: ids, isGradient }))
    .sort((a, b) => b.nodeIds.length - a.nodeIds.length || a.value.localeCompare(b.value));
}

/** Fan-out helper — write the same styles map to every id in `ids` via
 *  the standard `updateNodeStyles` path (so per-node replica/variant
 *  routing keeps working). */
function writeStylesToNodes(ids: string[], styles: Record<string, string>): void {
  const contentEl = getContentRoot();
  if (!contentEl) return;
  for (const id of ids) {
    updateNodeStyles({ id, styles, contentEl });
  }
}

/** LIVE preview — imperative DOM patch only, NO code write. Same `bridge.patchStyles`
 *  fan-out as ControlProvider.updateStyleLive's primary path, but scoped to a specific
 *  group of node ids. Called on every drag frame so multi-select fill/gradient stays
 *  60fps; the code commit (`writeStylesToNodes`) runs ONCE on pointer release. Without
 *  this, the picker's per-frame onChange went straight to `updateNodeStyles` → a queued
 *  mutation → a full page re-parse PER FRAME — exactly the multi-select drag lag. */
function livePatchToNodes(ids: string[], styles: Record<string, string>): void {
  const bridge = getCanvasBridge();
  // Patch the primary tile + every replica viewport prefix the bridge knows about
  // (a multi-select fill is a primary/base edit, so it cascades to all tiles).
  const rectCache = (bridge as any).rectCache as Map<string, DOMRect> | undefined;
  const prefixes = new Set<string>(['']);
  if (rectCache) {
    for (const cacheKey of rectCache.keys()) {
      const parsed = parseRectCacheKey(cacheKey);
      if (!parsed) continue;
      prefixes.add(parsed.vpPrefix);
    }
  }
  for (const id of ids) {
    for (const prefix of prefixes) bridge.patchStyles(id, prefix, styles);
  }
}

// ─── SelectionFillRow ────────────────────────────────────────────────────────
//
// One row per unique fill across the multi-select. Renders a clickable pill
// (swatch + value) and opens a tabbed popup (Color / Gradient) on click. Tab
// content uses the same ColorPicker / GradientEditor as the Fill control —
// edits route through `writeStylesToNodes` so the change fans out to every
// node currently sharing this fill.

type FillTab = 'color' | 'gradient';

function FourDotIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.15" aria-hidden>
      <circle cx="4" cy="4" r="1.45" /><circle cx="12" cy="4" r="1.45" />
      <circle cx="4" cy="12" r="1.45" /><circle cx="12" cy="12" r="1.45" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.15" aria-hidden>
      <circle cx="8" cy="8" r="5.5" /><circle cx="8" cy="8" r="2.15" /><circle cx="8" cy="8" r=".65" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DetachIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden>
      <path d="M5.3 5.3 3.8 3.8a2.2 2.2 0 0 0-3.1 3.1l2.4 2.4a2.2 2.2 0 0 0 3.1 0l1-1" />
      <path d="m10.7 10.7 1.5 1.5a2.2 2.2 0 0 0 3.1-3.1l-2.4-2.4a2.2 2.2 0 0 0-3.1 0l-1 1" />
      <path d="M5.8 10.2 10.2 5.8M2 14 14 2" />
    </svg>
  );
}

function SelectionFillRow({ group, nodeIds, onSelectMatching }: {
  group: ColorGroup;
  nodeIds: string[];
  onSelectMatching: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const styleRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [tab, setTab] = useState<FillTab>(group.isGradient ? 'gradient' : 'color');
  const allTokens = useAtomValue(presetTokensAtom);
  const colorPresets = allTokens.filter(t => t.category === 'color');

  useEffect(() => {
    setTab(group.isGradient ? 'gradient' : 'color');
  }, [group.isGradient]);

  const opacityState = splitPaintOpacity(group.value);
  const baseValue = group.isGradient ? group.value : (opacityState.base || group.value);
  const presetName = !group.isGradient && baseValue.startsWith('var(--')
    ? parseVarRef(baseValue) || ''
    : '';
  const preset = presetName ? colorPresets.find(t => t.name === presetName) : undefined;
  const isVariable = !!presetName;
  const resolvedBase = preset?.value || baseValue || '#000000';
  const canDetach = isVariable && !!preset;
  const showOpacity = !group.isGradient && opacityState.adjustable && !isVariable;

  const [livePreview, setLivePreview] = useLivePreview<string>([group.value]);
  const displayValue = livePreview ?? group.value;
  const labelText = group.isGradient
    ? 'Gradient'
    : isVariable
      ? (preset?.label || presetName)
      : toHexDisplay(baseValue).replace(/^#/, '').toUpperCase();

  const handleTabChange = (newTab: FillTab) => {
    if (newTab === tab) return;
    trace.action('selection-fill:tab-change', { from: tab, to: newTab, count: nodeIds.length });
    setTab(newTab);
  };

  const serializeSolid = (raw: string, opacity = opacityState.opacity) =>
    serializePaintOpacity(raw, opacity);

  const previewSolid = (raw: string) => {
    const next = serializeSolid(raw);
    livePatchToNodes(nodeIds, { backgroundColor: next, background: '', backgroundImage: '' });
    setLivePreview(next);
  };

  const commitSolid = (raw: string) => {
    writeStylesToNodes(nodeIds, {
      backgroundColor: serializeSolid(raw),
      background: '',
      backgroundImage: '',
    });
  };

  const previewOpacity = (opacity: number) => {
    if (!showOpacity) return;
    const next = serializePaintOpacity(baseValue, opacity);
    livePatchToNodes(nodeIds, { backgroundColor: next, background: '', backgroundImage: '' });
    setLivePreview(next);
  };

  const commitOpacity = (opacity: number) => {
    if (!showOpacity) return;
    writeStylesToNodes(nodeIds, {
      backgroundColor: serializePaintOpacity(baseValue, opacity),
      background: '',
      backgroundImage: '',
    });
  };

  const detachVariable = () => {
    if (!canDetach || !preset) return;
    writeStylesToNodes(nodeIds, {
      backgroundColor: serializePaintOpacity(preset.value, opacityState.opacity),
      background: '',
      backgroundImage: '',
    });
    trace.action('selection-color:detach-variable', { presetName, count: nodeIds.length });
  };

  const grid = showOpacity
    ? 'grid-cols-[minmax(0,1fr)_54px_28px_28px]'
    : 'grid-cols-[minmax(0,1fr)_28px_28px]';

  return (
    <>
      <div
        data-selection-color-row
        data-selection-color-variable={isVariable ? 'true' : undefined}
        className={`group/selection-color grid ${grid} gap-0.5 items-center w-full min-w-0`}
      >
        <button
          ref={btnRef}
          type="button"
          onClick={() => setIsOpen(true)}
          className="h-[var(--control-height)] min-w-0 flex items-center gap-2 px-2 bg-[var(--grid-line)] border border-[var(--control-border)] rounded-[var(--control-radius)] text-left hover:border-[var(--control-border-hover)] transition-colors overflow-hidden"
          title={labelText}
        >
          <ColorSwatch style={{ background: displayValue }} />
          <span className="min-w-0 flex-1 text-xs text-[var(--text-primary)] truncate">{labelText}</span>
        </button>

        {showOpacity && (
          <ToolInput
            value={String(opacityState.opacity)}
            onChange={(v) => commitOpacity(Number.parseFloat(v) || 0)}
            onChangeLive={(v) => previewOpacity(Number.parseFloat(v) || 0)}
            onCommit={(v) => commitOpacity(Number.parseFloat(v) || 0)}
            min={0}
            max={100}
            chevronLabel="%"
            ariaLabel="Selection color opacity"
            className="!h-[var(--control-height)]"
          />
        )}

        {isVariable ? (
          <button
            type="button"
            onClick={detachVariable}
            disabled={!canDetach}
            title="Detach variable"
            aria-label="Detach variable"
            className="h-7 w-7 flex items-center justify-center rounded-[7px] text-[var(--text-primary)] opacity-0 group-hover/selection-color:opacity-100 focus-visible:opacity-100 hover:bg-[var(--bg-hover)] disabled:opacity-0 transition-opacity"
          >
            <DetachIcon />
          </button>
        ) : (
          <button
            ref={styleRef}
            type="button"
            onClick={() => setStyleOpen(true)}
            title="Style"
            aria-label="Style"
            className="h-7 w-7 flex items-center justify-center rounded-[7px] text-[var(--text-primary)] opacity-0 group-hover/selection-color:opacity-100 focus-visible:opacity-100 hover:bg-[var(--bg-hover)] transition-opacity"
          >
            <FourDotIcon />
          </button>
        )}

        <button
          type="button"
          onClick={onSelectMatching}
          title="Select item using this color"
          aria-label="Select item using this color"
          className="h-7 w-7 flex items-center justify-center rounded-[7px] text-[var(--text-primary)] opacity-0 group-hover/selection-color:opacity-100 focus-visible:opacity-100 hover:bg-[var(--bg-hover)] transition-opacity"
        >
          <TargetIcon />
        </button>
      </div>

      {!isVariable && (
        <PresetPicker
          property="backgroundColor"
          tokens={allTokens}
          isOpen={styleOpen}
          onClose={() => setStyleOpen(false)}
          anchorRef={styleRef}
          onSelect={(tokenName) => {
            commitSolid(`var(--${tokenName})`);
            setStyleOpen(false);
          }}
        />
      )}

      <ToolPopup
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={tab === 'color' ? 'Color' : 'Gradient'}
        anchorRef={btnRef}
        width={280}
      >
        <ToolSegmentedControl
          value={tab}
          onChange={(v) => handleTabChange(v as FillTab)}
          options={[
            { value: 'color', label: 'Color' },
            { value: 'gradient', label: 'Gradient' },
          ]}
          size="sm"
        />

        {tab === 'color' && (
          <ColorPicker
            value={resolvedBase}
            onChange={previewSolid}
            onChangeEnd={commitSolid}
            showAlpha
            colorPresets={colorPresets}
            onApplyPreset={(varVal) => commitSolid(varVal)}
            activePresetName={presetName || undefined}
          />
        )}

        {tab === 'gradient' && (
          <GradientEditor
            value={group.isGradient ? group.value : ''}
            onChange={(css) => {
              writeStylesToNodes(nodeIds, {
                backgroundImage: css,
                background: '',
                backgroundColor: '',
              });
            }}
            onLiveChange={(css) => {
              livePatchToNodes(nodeIds, { backgroundImage: css, background: '', backgroundColor: '' });
              setLivePreview(css);
            }}
            hideOverlay
          />
        )}
      </ToolPopup>
    </>
  );
}

export default function SelectionTool() {
  const selectedIds = useAtomValue(selectedIdsAtom);
  const setSelectedIds = useSetAtom(selectedIdsAtom);
  const [showAll, setShowAll] = useState(false);

  const groups = useNodesComputed(
    (nodes) => aggregateFills(selectedIds, nodes),
    [selectedIds],
  );

  if (selectedIds.length <= 1) return null;
  if (groups.length === 0) return null;

  const visibleGroups = showAll ? groups : groups.slice(0, SELECTION_COLOR_VISIBLE_LIMIT);
  const hasOverflow = groups.length > SELECTION_COLOR_VISIBLE_LIMIT;

  return (
    <ToolSection title="Selection colors" collapsible={false}>
      <div data-selection-colors-figui3 className="flex flex-col gap-1">
        {visibleGroups.map((group) => (
          <SelectionFillRow
            key={group.nodeIds[0]}
            group={group}
            nodeIds={group.nodeIds}
            onSelectMatching={() => {
              setSelectedIds(group.nodeIds);
              trace.action('selection-color:select-matching', { count: group.nodeIds.length, color: group.value });
            }}
          />
        ))}

        {hasOverflow && (
          <button
            type="button"
            data-selection-colors-overflow
            onClick={() => setShowAll((v) => !v)}
            className="h-7 mt-1 flex items-center justify-center gap-2 text-xs text-[var(--text-disabled)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <span aria-hidden className="tracking-[-1px]">⋮</span>
            <span>{showAll ? `Show first ${SELECTION_COLOR_VISIBLE_LIMIT} colors` : `See all ${groups.length} colors`}</span>
          </button>
        )}
      </div>
    </ToolSection>
  );
}
