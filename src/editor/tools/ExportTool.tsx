// ExportTool.tsx — Export selected element as PNG/JPG/SVG at 1x/2x/3x.
// Capture runs INSIDE the sandbox iframe via the bridge — `html-to-image`
// must clone the element from the iframe's own DOM. The old parent-frame
// `findNodeElement` + html-to-image path returned null post-iframe-migration
// (canvas content isn't in the parent document), so the preview hung on
// "Generating…" forever and Export silently no-op'd.

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { ToolSection, ToolSelect } from '../controls';
import { useControl } from '../controls/ControlProvider';
import { exportSectionOpenAtom } from '@/code/stores/editor-store';
import { getViewportPrefix } from '@/canvas/node-ops';
import { getCanvasBridge } from '@/canvas/canvas-bridge';
import { trace } from '@/shared/debug-trace';
import ToolPopup from '../ui/ToolPopup';

/** `captureElement` lives on PostMessageBridge but isn't in the base
 *  `CanvasBridge` interface — same pattern as the shape-edit RPC methods.
 *  Cast + optional-chain so NullBridge (pre-iframe-load) is a safe no-op. */
type BridgeWithCapture = {
  captureElement?: (
    nodeId: string,
    vpPrefix: string,
    opts: { format: 'png' | 'jpeg' | 'svg'; pixelRatio: number; backgroundColor?: string },
  ) => Promise<string | null>;
};

const SCALE_OPTIONS = [
  { value: '0.5', label: '0.5x' },
  { value: '1', label: '1x' },
  { value: '2', label: '2x' },
  { value: '3', label: '3x' },
  { value: '4', label: '4x' },
];

const FORMAT_OPTIONS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpg', label: 'JPG' },
  { value: 'svg', label: 'SVG' },
  { value: 'pdf', label: 'PDF', disabled: true },
];

type ExportConfiguration = { id: number; scale: string; format: string; suffix: string };
let nextExportId = 1;

function ExportConfigurationRow({ configuration, onChange, onRemove }: {
  configuration: ExportConfiguration;
  onChange: (patch: Partial<ExportConfiguration>) => void;
  onRemove: () => void;
}) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsRef = useRef<HTMLButtonElement>(null);
  return <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_24px_24px] items-center gap-1.5 w-full" data-export-configuration>
    <ToolSelect ariaLabel="Export scale" value={configuration.scale} onChange={(scale) => onChange({ scale })} options={SCALE_OPTIONS} />
    <ToolSelect ariaLabel="Export format" value={configuration.format} onChange={(format) => onChange({ format })} options={FORMAT_OPTIONS} />
    <button ref={optionsRef} type="button" title="Export options" aria-label="Export options"
      aria-haspopup="dialog" aria-expanded={optionsOpen} onClick={() => setOptionsOpen(true)}
      className="h-6 rounded hover:bg-[var(--bg-hover)] text-[var(--text-primary)]">···</button>
    <button type="button" title="Remove export setting" aria-label="Remove export setting" onClick={onRemove}
      className="h-6 rounded hover:bg-[var(--bg-hover)] text-[var(--text-primary)]">−</button>
    <ToolPopup isOpen={optionsOpen} onClose={() => setOptionsOpen(false)} title="Export" anchorRef={optionsRef} width={260}>
      <div className="flex flex-col gap-3 text-xs">
        <label className="flex items-center justify-between gap-3 text-[var(--text-secondary)]">
          Suffix
          <input aria-label="Export filename suffix" value={configuration.suffix}
            onChange={(event) => onChange({ suffix: event.target.value })}
            className="h-[var(--control-height)] min-w-0 w-28 rounded-[var(--control-radius)] bg-[var(--control-bg)] px-2 text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]" />
        </label>
        <label className="flex items-center justify-between gap-3 text-[var(--text-disabled)]" title="Color profile selection is not available in the current export engine">
          Color profile <span className="w-28"><ToolSelect disabled ariaLabel="Color profile (unavailable)" value="sRGB" options={[{ value: 'sRGB', label: 'sRGB' }]} onChange={() => {}} /></span>
        </label>
        <label className="flex items-center justify-between gap-3 text-[var(--text-disabled)]" title="Resampling selection is not available in the current export engine">
          Image resampling <span className="w-28"><ToolSelect disabled ariaLabel="Image resampling (unavailable)" value="Detailed" options={[{ value: 'Detailed', label: 'Detailed' }]} onChange={() => {}} /></span>
        </label>
        <label className="flex items-center gap-2 text-[var(--text-secondary)]" title="The export captures the selected layer only">
          <input type="checkbox" checked disabled /> Ignore overlapping layers
        </label>
        <label className="flex items-center gap-2 text-[var(--text-disabled)]" title="Bounding box adjustment is not available in the current export engine">
          <input type="checkbox" disabled /> Include bounding box
        </label>
      </div>
    </ToolPopup>
  </div>;
}

export default function ExportTool() {
  const { node, nodeId, vpId } = useControl();
  // Keep the established global expansion signal; each plus click now adds an
  // independent export configuration as in the design panel.
  const [open, setOpen] = useAtom(exportSectionOpenAtom);
  const [configurationsByNode, setConfigurationsByNode] = useState<Record<string, ExportConfiguration[]>>({});
  const [exporting, setExporting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const nodeName = node?.name || node?.type || 'element';
  const configurationKey = nodeId || '';
  const configurations = configurationsByNode[configurationKey] || [];
  const setConfigurations = (update: (current: ExportConfiguration[]) => ExportConfiguration[]) => {
    setConfigurationsByNode((current) => ({ ...current, [configurationKey]: update(current[configurationKey] || []) }));
  };
  const firstConfiguration = configurations[0];
  const addConfiguration = () => {
    setConfigurations((current) => [...current, { id: nextExportId++, scale: '1', format: 'png', suffix: '' }]);
    setOpen(true);
  };
  const updateConfiguration = (id: number, patch: Partial<ExportConfiguration>) => {
    setConfigurations((current) => current.map((entry) => entry.id === id ? { ...entry, ...patch } : entry));
  };

  // Auto-generate the preview shortly after the selection settles. The
  // capture itself runs OFF the parent's main thread (inside the sandbox
  // iframe via the bridge), so a plain debounced setTimeout is enough —
  // the previous `requestIdleCallback` indirection was both unnecessary
  // AND broken: `const rIC = window.requestIdleCallback; rIC(cb)` calls a
  // `window` method through a bare reference, losing its `this` binding →
  // "Illegal invocation" throw → the idle callback never scheduled, so the
  // preview only ever appeared after a manual Export.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    setPreview(null);
    cancelledRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // `open` gate: no bridge captures while the section is collapsed.
    if (!nodeId || !showPreview || !open || !firstConfiguration) return;
    cancelledRef.current = false;

    // Debounce 600ms after selection settles, then capture via the bridge.
    debounceRef.current = setTimeout(async () => {
      if (cancelledRef.current) return;
      // Capture runs inside the sandbox iframe via the bridge — the
      // element lives in the iframe's DOM, unreachable from the parent.
      const bridge = getCanvasBridge() as BridgeWithCapture;
      if (typeof bridge.captureElement !== 'function') return;
      try {
        // Rasterize at full resolution (pixelRatio: 1), not 0.25 — the old
        // quarter-res value was a main-thread-perf hack that no longer
        // applies now the capture runs off-thread inside the iframe. At
        // 0.25x, text/details get baked in blurry; at 1x the preview box's
        // `object-contain` just downscales a crisp source.
        const dataUrl = await bridge.captureElement(nodeId, getViewportPrefix(vpId), {
          format: 'png', pixelRatio: 1,
        });
        if (cancelledRef.current) return;
        if (dataUrl) {
          setPreview(dataUrl);
          trace.action('export-tool:preview-generated', { nodeId });
        } else {
          trace.error('export-tool:preview-failed', { nodeId, error: 'capture returned null' });
        }
      } catch (err) {
        trace.error('export-tool:preview-failed', { nodeId, error: String(err) });
      }
    }, 600);

    return () => {
      cancelledRef.current = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [nodeId, vpId, showPreview, open, firstConfiguration?.id]);

  const handleExport = useCallback(async () => {
    if (!nodeId) return;

    const bridge = getCanvasBridge() as BridgeWithCapture;
    if (typeof bridge.captureElement !== 'function') {
      trace.error('export-tool:no-bridge', { nodeId });
      return;
    }

    setExporting(true);
    trace.action('export-tool:start', { nodeId, configurations: configurations.length, nodeName });

    try {
      for (const configuration of configurations) {
        const { format, scale, suffix } = configuration;
        const captureFormat: 'png' | 'jpeg' | 'svg' = format === 'jpg' ? 'jpeg' : (format as 'png' | 'svg');
        const dataUrl = await bridge.captureElement(nodeId, getViewportPrefix(vpId), {
          format: captureFormat,
          pixelRatio: parseFloat(scale),
          backgroundColor: captureFormat === 'jpeg' ? '#ffffff' : undefined,
        });
        if (!dataUrl) {
          trace.error('export-tool:element-not-found', { nodeId, vpId });
          continue;
        }
        if (configuration.id === firstConfiguration?.id) setPreview(dataUrl);
        const link = document.createElement('a');
        link.download = `${nodeName}${suffix || (scale === '1' ? '' : `@${scale}x`)}.${format}`;
        link.href = dataUrl;
        link.click();
        trace.action('export-tool:success', { nodeId, format, scale, nodeName });
      }
    } catch (err) {
      trace.error('export-tool:failed', {
        nodeId, configurations: configurations.length,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setExporting(false);
    }
  }, [nodeId, vpId, configurations, firstConfiguration?.id, nodeName]);

  trace.fn('ExportTool:render', { nodeId, configurations: configurations.length, exporting, open });

  // Same +/− affordance as AnchorTool / AccessibilityTool. The oversized
  // `pl-[80px] -ml-[80px]` hit area mirrors AnchorTool's toggle button.
  const addBtn = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        addConfiguration();
      }}
      title="Add export setting"
      aria-label="Add export setting"
      className="flex h-7 w-7 items-center justify-center rounded-[6px] hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
    >
      <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
    </button>
  );

  return (
    <ToolSection key={`${configurationKey}:${configurations.length}`} title="Export" collapsible action={addBtn} hasContent={open && configurations.length > 0}>
      {configurations.map((configuration) => <ExportConfigurationRow key={configuration.id}
        configuration={configuration}
        onChange={(patch) => updateConfiguration(configuration.id, patch)}
        onRemove={() => setConfigurations((current) => current.filter((entry) => entry.id !== configuration.id))} />)}

      {/* Preview toggle */}
      <button
        onClick={() => {
          const next = !showPreview;
          trace.action('export-tool:toggle-preview', { showPreview: next });
          if (!next) setPreview(null);
          setShowPreview(next);
        }}
        className="flex items-center justify-between w-full text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-0.5"
      >
        <span>Preview</span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className="transition-transform duration-150"
          style={{ transform: showPreview ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        >
          <path d="M2 4.5L6 8L10 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {showPreview && (
        <div className="w-full cut-corners cut-border [--cut-border-color:var(--control-border)] border border-[var(--control-border)] overflow-hidden bg-[var(--grid-line)] p-2" style={{ height: '120px' }}>
          {preview ? (
            <img src={preview} alt="Export preview" className="w-full h-full object-contain cut-corners" />
          ) : (
            // Pulsating skeleton while the capture is generating.
            <div className="w-full h-full animate-pulse bg-[var(--text-primary)]/[0.06] cut-corners" />
          )}
        </div>
      )}

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={exporting || !nodeId}
        className={`w-full h-[var(--control-height)] cut-corners cut-border text-xs font-medium transition-colors border ${
          exporting || !nodeId
            ? 'bg-[var(--grid-line)] border-[var(--control-border)] [--cut-border-color:var(--control-border)] text-[var(--text-disabled)] cursor-not-allowed'
            : 'bg-[var(--grid-line)] border-[var(--control-border)] [--cut-border-color:var(--control-border)] hover:border-[var(--control-border-hover)] hover:[--cut-border-color:var(--control-border-hover)] text-[var(--text-primary)] cursor-pointer'
        }`}
      >
        {exporting ? 'Exporting...' : `Export ${nodeName}`}
      </button>
    </ToolSection>
  );
}
