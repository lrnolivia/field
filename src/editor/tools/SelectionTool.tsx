// SelectionTool.tsx — FIGUI3 selected-scope color aggregation.
//
// Selection colors is deliberately separate from the normal Fill / Stroke / Effects
// controls. Those edit the selected object's own visual properties. This tool answers
// the broader design-tool question: "which colors are used by this selected design
// scope?" and applies one color change to every matching occurrence in that scope.
//
// Read truth comes from the parsed CanvasNode graph. Writes still route through
// updateNodeStyles so responsive / variant / instance behavior stays centralized.

import { useEffect, useRef, useState } from 'react';
import { useLivePreview } from '../hooks/useLivePreview';
import { useAtomValue, useSetAtom } from 'jotai';
import { selectedIdsAtom, getNodeFromCache } from '@/code/stores/store';
import { selectionColorLocateAtom, locateSelectionColor } from '@/code/stores/selection-color-locate-store';
import { leftPanelAtom } from '@/code/stores/left-panel-store';
import { useNodesComputed } from '@/code/stores/node-family';
import { ColorSwatch, ToolSection, ToolDivider } from '../controls';
import ToolPopup from '../ui/ToolPopup';
import ColorPicker from '../ui/ColorPicker';
import { presetTokensAtom } from '@/code/stores/preset-store';
import { toHexDisplay } from '../ui/color-utils';
import PresetPicker from '../ui/PresetPicker';
import { updateNodeStyles, getContentRoot, parseRectCacheKey } from '@/canvas/node-ops';
import { getCanvasBridge } from '@/canvas/canvas-bridge';
import { transformManager, zoomToFitNodes } from '@/canvas/transform';
import { animateCanvasTo } from '@/canvas/transform/CameraAnimator';
import { trace } from '@/shared/debug-trace';
import { parseVarRef } from '@/shared/css-utils';
import {
  aggregateSelectionColors,
  buildColorReplacementStyles,
  type SelectionColorGroup,
} from '../selection-colors';

const SELECTION_COLOR_VISIBLE_LIMIT = 10;

let locateCameraRestoreTimer: ReturnType<typeof setTimeout> | null = null;
let locateCameraRestoreTransform: { x: number; y: number; scale: number } | null = null;

function temporarilyFocusSelectionColorNodes(nodeIds: string[]): void {
  const contentEl = getContentRoot();
  if (!contentEl || nodeIds.length === 0) return;

  // Preserve the camera from BEFORE the first locate in a run. Clicking another
  // color while focus is active retargets the temporary zoom but still returns
  // to the user's original view instead of nesting temporary cameras.
  locateCameraRestoreTransform ??= { ...transformManager.getTransform() };
  if (locateCameraRestoreTimer) clearTimeout(locateCameraRestoreTimer);

  zoomToFitNodes(contentEl, nodeIds, false, 72, 0.88);
  locateCameraRestoreTimer = setTimeout(() => {
    const restore = locateCameraRestoreTransform;
    locateCameraRestoreTimer = null;
    locateCameraRestoreTransform = null;
    if (!restore) return;
    animateCanvasTo(restore.x, restore.y, restore.scale, 240, { focus: true });
  }, 2200);
}

function writeReplacementStyles(stylesByNode: Map<string, Record<string, string>>): void {
  const contentEl = getContentRoot();
  if (!contentEl) return;

  for (const [id, styles] of stylesByNode) {
    updateNodeStyles({ id, styles, contentEl });
  }
}

function livePatchReplacementStyles(stylesByNode: Map<string, Record<string, string>>): void {
  const bridge = getCanvasBridge();
  const rectCache = (bridge as any).rectCache as Map<string, DOMRect> | undefined;
  const prefixes = new Set<string>(['']);

  if (rectCache) {
    for (const cacheKey of rectCache.keys()) {
      const parsed = parseRectCacheKey(cacheKey);
      if (parsed) prefixes.add(parsed.vpPrefix);
    }
  }

  for (const [id, styles] of stylesByNode) {
    for (const prefix of prefixes) {
      bridge.patchStyles(id, prefix, styles);
    }
  }
}

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

function propertyForPresetPicker(group: SelectionColorGroup): string {
  const direct = group.targets.find((target) => target.kind === 'property');
  return direct && direct.kind === 'property' ? direct.property : 'color';
}

function colorLabel(value: string, presetName: string, presetLabel?: string): string {
  if (presetName) return presetLabel || presetName;

  const display = toHexDisplay(value);
  if (display && display !== value) return display.replace(/^#/, '').toUpperCase();
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return value.replace(/^#/, '').toUpperCase();
  return value;
}

function SelectionColorRow({
  group,
}: {
  group: SelectionColorGroup;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const styleRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [hoverActive, setHoverActive] = useState(false);
  const setLocate = useSetAtom(selectionColorLocateAtom);
  const setLeftPanel = useSetAtom(leftPanelAtom);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRevision = useRef<number | null>(null);
  const allTokens = useAtomValue(presetTokensAtom);
  const colorPresets = allTokens.filter((token) => token.category === 'color');

  const presetName = group.value.startsWith('var(--') ? (parseVarRef(group.value) || '') : '';
  const preset = presetName ? colorPresets.find((token) => token.name === presetName) : undefined;
  const isVariable = !!presetName;
  const canDetach = isVariable && !!preset;
  const resolvedColor = preset?.value || group.value || '#000000';

  const [livePreview, setLivePreview] = useLivePreview<string>([group.value]);
  const displayValue = livePreview ?? resolvedColor;
  const labelText = colorLabel(group.value, presetName, preset?.label);
  const tint = /^#(?:[0-9a-f]{3,8})$/i.test(resolvedColor) || /^rgba?\(/i.test(resolvedColor)
    ? resolvedColor : null;
  const cancelHover = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    setHoverActive(false);
    setLocate((current) => current?.mode === 'hover' && current.revision === activeRevision.current ? null : current);
  };
  const startHover = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      const request = locateSelectionColor(group.nodeIds, tint, 'hover');
      activeRevision.current = request.revision;
      setLocate(request);
      setHoverActive(true);
      trace.action('selection-color:locate-hover', { color: group.value, count: group.nodeIds.length });
    }, 1500);
  };
  const clickLocate = () => {
    cancelHover();
    if (clickTimer.current) clearTimeout(clickTimer.current);
    const request = locateSelectionColor(group.nodeIds, tint, 'click');
    activeRevision.current = request.revision;
    setLocate(request);
    setLeftPanel('layers');
    temporarilyFocusSelectionColorNodes(group.nodeIds);
    trace.action('selection-color:locate-click', { color: group.value, count: group.nodeIds.length });
    clickTimer.current = setTimeout(() => {
      setLocate((current) => current?.revision === request.revision ? null : current);
    }, 2200);
  };
  useEffect(() => () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (clickTimer.current) clearTimeout(clickTimer.current);
  }, []);

  const previewColor = (raw: string) => {
    livePatchReplacementStyles(buildColorReplacementStyles(group.targets, raw));
    setLivePreview(raw);
  };

  const commitColor = (raw: string) => {
    writeReplacementStyles(buildColorReplacementStyles(group.targets, raw));
    trace.action('selection-color:commit', {
      color: group.value,
      next: raw,
      occurrences: group.targets.length,
      nodes: group.nodeIds.length,
    });
  };

  const detachVariable = () => {
    if (!canDetach || !preset) return;
    commitColor(preset.value);
    trace.action('selection-color:detach-variable', {
      presetName,
      occurrences: group.targets.length,
    });
  };

  return (
    <>
      <style>{`
        @keyframes field-locate-target { 0%, 100% { transform: scale(1); opacity: .65; } 50% { transform: scale(1.12); opacity: 1; } }
        .field-selection-color-target[data-locate-pulsing="true"] svg { animation: field-locate-target 2.4s ease-in-out infinite; transform-origin: center; }
        @media (prefers-reduced-motion: reduce) { .field-selection-color-target svg { animation: none !important; } }
      `}</style>
      <div
        data-selection-color-row
        data-selection-color-variable={isVariable ? 'true' : undefined}
        className="group/selection-color grid grid-cols-[minmax(0,1fr)_28px_28px] gap-0.5 items-center w-full min-w-0"
      >
        <button
          ref={btnRef}
          type="button"
          onClick={() => setIsOpen(true)}
          className="h-[var(--control-height)] min-w-0 flex items-center gap-2 px-2 bg-[var(--grid-line)] border border-[var(--control-border)] rounded-[var(--control-radius)] text-left hover:border-[var(--control-border-hover)] transition-colors overflow-hidden"
          title={labelText}
          aria-label={'Edit selection color ' + labelText}
        >
          <ColorSwatch style={{ background: displayValue }} />
          <span className="min-w-0 flex-1 text-xs text-[var(--text-primary)] truncate">{labelText}</span>
        </button>

        {isVariable ? (
          <button
            type="button"
            onClick={detachVariable}
            disabled={!canDetach}
            title="Detach variable in selected scope"
            aria-label="Detach variable in selected scope"
            className="h-7 w-7 flex items-center justify-center rounded-[7px] text-[var(--text-primary)] opacity-0 group-hover/selection-color:opacity-100 focus-visible:opacity-100 hover:bg-[var(--bg-hover)] disabled:opacity-0 transition-opacity"
          >
            <DetachIcon />
          </button>
        ) : (
          <button
            ref={styleRef}
            type="button"
            onClick={() => setStyleOpen(true)}
            title="Apply color style"
            aria-label="Apply color style"
            className="h-7 w-7 flex items-center justify-center rounded-[7px] text-[var(--text-primary)] opacity-0 group-hover/selection-color:opacity-100 focus-visible:opacity-100 hover:bg-[var(--bg-hover)] transition-opacity"
          >
            <FourDotIcon />
          </button>
        )}

        <button
          type="button"
          onMouseEnter={startHover}
          onMouseLeave={cancelHover}
          onClick={clickLocate}
          title="locate"
          aria-label="Locate objects using this color"
          data-selection-color-locate
          data-locate-pulsing={hoverActive ? 'true' : undefined}
          className="field-selection-color-target h-7 w-7 flex items-center justify-center rounded-[7px] text-[var(--text-primary)] opacity-0 group-hover/selection-color:opacity-100 focus-visible:opacity-100 hover:bg-[var(--bg-hover)] transition-opacity"
        >
          <TargetIcon />
        </button>
      </div>

      {!isVariable && (
        <PresetPicker
          property={propertyForPresetPicker(group)}
          tokens={allTokens}
          isOpen={styleOpen}
          onClose={() => setStyleOpen(false)}
          anchorRef={styleRef}
          onSelect={(tokenName) => {
            commitColor('var(--' + tokenName + ')');
            setStyleOpen(false);
          }}
        />
      )}

      <ToolPopup
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Color"
        ariaLabel={'Edit selection color ' + labelText}
        anchorRef={btnRef}
        width={480}
        hideHeader
        showNestedHeaderWhenHidden
        radius={14}
      >
        <ColorPicker
          onClose={() => setIsOpen(false)}
          capabilityLabel="selection color"
          value={resolvedColor}
          onChange={previewColor}
          onChangeEnd={commitColor}
          showAlpha
          colorPresets={colorPresets}
          onApplyPreset={(varValue) => commitColor(varValue)}
          activePresetName={presetName || undefined}
        />
      </ToolPopup>
    </>
  );
}

export default function SelectionTool() {
  const selectedIds = useAtomValue(selectedIdsAtom);
  const [showAll, setShowAll] = useState(false);

  const selectionData = useNodesComputed(
    (nodes) => {
      const resolveNode = (id: string) => getNodeFromCache(id) ?? nodes.get(id);
      return aggregateSelectionColors(selectedIds, nodes, resolveNode);
    },
    [selectedIds],
  );

  const groups = selectionData;

  // A simple leaf with one color already has the canonical Fill/Stroke control
  // immediately below. Show the aggregate when a single selection owns a design
  // subtree, has multiple visual colors/effects, or when the user multi-selects.
  // Match Figma's Selection colors behavior: the aggregate appears for a mixed-color
  // selection/scope, not for every ordinary single-color selection.
  if (groups.length <= 1) return null;

  const visibleGroups = showAll ? groups : groups.slice(0, SELECTION_COLOR_VISIBLE_LIMIT);
  const hasOverflow = groups.length > SELECTION_COLOR_VISIBLE_LIMIT;

  return (
    <>
      <ToolSection
        title="Selection colors"
        defaultOpen={false}
        action={(
          <span data-selection-colors-preview className="flex shrink-0 items-center gap-1.5" aria-hidden>
            {groups.slice(0, 3).map(group => <span key={group.value}
              className="h-4 w-4 rounded-[4px] border border-[var(--border-light)]" style={{ background: group.value }} />)}
            {groups.length > 3 && <span className="text-xs font-normal text-[var(--text-secondary)]">+{groups.length - 3}</span>}
          </span>
        )}
      >
        <div data-selection-colors-figui3 className="flex flex-col gap-2">
          {visibleGroups.map((group) => <SelectionColorRow key={group.value} group={group} />)}

          {hasOverflow && (
            <button
              type="button"
              data-selection-colors-overflow
              onClick={() => setShowAll((value) => !value)}
              className="mt-1 flex h-7 items-center justify-center gap-2 text-xs text-[var(--text-disabled)] transition-colors hover:text-[var(--text-secondary)]"
            >
              <span aria-hidden className="tracking-[-1px]">⋮</span>
              <span>
                {showAll
                  ? 'Show first ' + String(SELECTION_COLOR_VISIBLE_LIMIT) + ' colors'
                  : 'See all ' + String(groups.length) + ' colors'}
              </span>
            </button>
          )}
        </div>
      </ToolSection>
      <ToolDivider />
    </>
  );
}
