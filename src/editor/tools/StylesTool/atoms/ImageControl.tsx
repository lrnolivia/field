// ImageControl.tsx — Granular `backgroundImage` ToolAtom.
//
// Used by the variable-editor registry: when the user creates an Image
// variable from the Fill submenu, the modal mounts this atom in
// `variableDefault` mode. ComponentPropsTool also mounts it on instances
// where the prop maps to `backgroundImage`.
//
// Click on the row → opens a ToolPopup mirroring the Image tab inside
// FillControl's popup: large preview, Change / Remove buttons, image
// presets. Size / Position / Repeat / Attachment are NOT in this popup —
// those are separate CSS properties unrelated to the variable's value.
// They live on the regular StylesTool's Fill row where they edit the node
// directly. Including them here would either silently drop their writes
// (the variable holds one value) or require a dual-write path that doesn't
// exist yet.

import { useState, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { UnifiedControlProvider, useControlContext, ControlRow } from '../../../controls/unified';
import { ControlActionRow, ColorSwatch } from '../../../controls';
import ImageSearchModal from '../../../ui/ImageSearchModal';
import AssetPresetGrid from '../../../ui/AssetPresetGrid';
import CreateImagePresetPanel from '../../../ui/CreateImagePresetPanel';
import EditAssetPresetPanel from '../../../ui/EditAssetPresetPanel';
import { useToolPopupOptional } from '../../../ui/ToolPopup';
import { useEditorPanel } from '../../../hooks/useEditorPanel';
import { presetTokensAtom } from '@/code/stores/preset-store';
import type { AtomProps } from '../../../controls/unified/types';
import { trace } from '@/shared/debug-trace';

/** `url('https://...')` → `https://...` (or empty). */
function extractUrl(css: string): string {
  const m = css.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
  return m?.[1] ?? '';
}

// ─── Reusable popup body ──────────────────────────────────────────────────
// Same content shape as FillControl's image tab, minus the size/position
// controls. Kept self-contained so it can be embedded in either a sliding
// panel (when there's a parent ToolPopup) or a standalone ToolPopup.

interface ImagePopupBodyProps {
  /** Current value — `url('...')` or `var(--image-name)`. */
  value: string;
  /** Called with a new url(...) string OR a `var(--name)` preset reference. */
  onChange: (next: string) => void;
}

function ImagePopupBody({ value, onChange }: ImagePopupBodyProps) {
  // Optional — when this body is rendered INLINE in the variable modal there
  // is no parent ToolPopup, so pushPanel/popPanel for create/edit-preset
  // sliding panels aren't available. The preset list still applies, just no
  // sliding sub-panel for creating/editing presets from inside the modal
  // (those flows live on the regular Fill control instead).
  const popupCtx = useToolPopupOptional();
  const [mediaOpen, setMediaOpen] = useState(false);
  const allTokens = useAtomValue(presetTokensAtom);
  const imagePresets = allTokens.filter(t => t.category === 'image');

  // Detect var(--image-name) — i.e. the user has applied a preset.
  const presetMatch = value.match(/^var\(\s*--([^)\s,]+)\s*\)$/);
  const activePresetName = presetMatch && imagePresets.some(p => p.name === presetMatch[1])
    ? presetMatch[1]
    : undefined;
  // Resolve the underlying URL for preview (preset reference or direct url()).
  const previewUrl = activePresetName
    ? extractUrl(imagePresets.find(p => p.name === activePresetName)?.value || '')
    : extractUrl(value);
  const hasImage = !!previewUrl;

  // Sliding-panel paths only available when embedded inside a ToolPopup —
  // skip the "+ Create new image preset" / "Edit" affordances when we're
  // rendered inline (e.g. the variable modal).
  const handleCreatePreset = popupCtx ? () => {
    popupCtx.pushPanel('New Image Preset', (
      <CreateImagePresetPanel initialValue={value} onCreated={() => popupCtx.popPanel()} />
    ));
  } : undefined;

  const handleEditPreset = popupCtx ? (name: string) => {
    const token = imagePresets.find(t => t.name === name);
    if (!token) return;
    const displayName = token.label || name.replace(/^image-/, '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    popupCtx.pushPanel(`Edit "${displayName}"`, (
      <EditAssetPresetPanel
        presetName={name}
        type="image"
        initialValue={token.value}
        onDeleted={() => popupCtx.popPanel()}
      />
    ));
  } : undefined;

  const applyMediaImage = (url: string) => {
    trace.action('image-control:pick', { url: url.slice(0, 60), source: 'media-context' });
    onChange(`url('${url}')`);
  };

  const openMedia = () => {
    if (popupCtx) {
      popupCtx.pushPanel('Media', (
        <div data-contextual-media-picker="image-value" className="min-h-0">
          <ImageSearchModal
            isOpen
            embedded
            compact
            onClose={() => popupCtx.popPanel()}
            onSelect={applyMediaImage}
          />
        </div>
      ));
      return;
    }
    setMediaOpen(true);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Preview + Change / Remove */}
      {hasImage ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={openMedia}
            className="min-w-0 flex-1 h-9 flex items-center gap-2 rounded-[4px] border border-[var(--control-border)] bg-[var(--grid-line)] px-1.5 text-left hover:border-[var(--control-border-hover)] hover:bg-[var(--bg-hover)] transition-colors"
            title={previewUrl}
          >
            <span
              className="h-6 w-6 shrink-0 rounded-[3px] border border-[var(--border-light)]"
              style={{ backgroundImage: `url(${previewUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
            <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--text-primary)]">Image</span>
            <span className="shrink-0 text-[10px] text-[var(--text-secondary)]">Change</span>
          </button>
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Remove image"
            title="Remove image"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[var(--control-border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            &minus;
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openMedia}
          className="w-full h-8 flex items-center gap-2 rounded-[4px] border border-[var(--control-border)] bg-[var(--grid-line)] px-2 text-left text-[11px] text-[var(--text-secondary)] hover:border-[var(--control-border-hover)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
        >
          <span className="flex h-4 w-4 items-center justify-center" aria-hidden>◇</span>
          <span className="min-w-0 flex-1 truncate">Choose media</span>
          <span className="text-[10px] text-[var(--text-disabled)]">Image</span>
        </button>
      )}

      {/* Preset grid */}
      <AssetPresetGrid
        presets={imagePresets}
        type="image"
        activePresetName={activePresetName}
        onApplyPreset={(varVal) => {
          trace.action('image-control:apply-preset', { var: varVal });
          onChange(varVal);
        }}
        onCreatePreset={handleCreatePreset}
        onEditPreset={handleEditPreset}
      />

      {!popupCtx && mediaOpen && (
        <div data-contextual-media-picker="image-value-inline" className="min-h-0">
          <ImageSearchModal
            isOpen
            embedded
            compact
            onClose={() => setMediaOpen(false)}
            onSelect={(url) => {
              applyMediaImage(url);
              setMediaOpen(false);
            }}
          />
        </div>
      )}    </div>
  );
}

// ─── Atom row ─────────────────────────────────────────────────────────────
// Compact swatch + label; clicking opens the rich popup. Same shape in every
// mode — the variable modal also renders this row (label goes plain in
// non-direct modes via the ControlRow / ControlLabel `plain` flag below).

function ImageAtom() {
  const { value, onChange, mode } = useControlContext();
  const { openPanel, panelPopup } = useEditorPanel('Image', () => (
    <ImagePopupBody value={css} onChange={onChange} />
  ));
  const rowRef = useRef<HTMLDivElement>(null);

  const css = value || '';
  const presetMatch = css.match(/^var\(\s*--([^)\s,]+)\s*\)$/);
  const isPresetRef = !!presetMatch;
  const directUrl = extractUrl(css);

  const handleClick = () => {
    trace.action('image-control:open', { mode });
    openPanel();
  };

  const swatchStyle: React.CSSProperties = directUrl
    ? { backgroundImage: `url(${directUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : isPresetRef
      ? { backgroundImage: css, backgroundSize: 'cover', backgroundPosition: 'center' }
      : {};
  const labelText = directUrl || isPresetRef ? 'Image' : 'Pick image';

  return (
    <>
      <div ref={rowRef} className="w-full min-w-0">
        <ControlActionRow onClick={handleClick}>
          {(directUrl || isPresetRef) ? (
            <ColorSwatch style={swatchStyle} />
          ) : (
            <ColorSwatch className="bg-[var(--bg-hover)]" />
          )}
          <span className="text-xs text-[var(--text-primary)] truncate flex-1 text-left">
            {labelText}
          </span>
        </ControlActionRow>
      </div>
      {panelPopup(rowRef)}
    </>
  );
}

export function ImageControl({ mode = 'direct', ...mp }: AtomProps) {
  // Route the label through the SHARED ControlRow (same as the color atoms) so it
  // gets: the row's variable name + "Image" sub-line (LabelOverride), the exact same
  // value-column width as every other row, and — crucially — the chevron / "Set
  // Variable" menu when a HoistMenuItemProvider is present (ComponentPropsTool
  // instance rows). ControlRow's `(plain || !isDirect) && !hoistItem` rule keeps the
  // label PLAIN inside the Variable modal (no hoist item there) but interactive on
  // instance prop rows — replacing the hand-rolled plain-always row that had no
  // chevron and a 2px-off width.
  return (
    <UnifiedControlProvider property="backgroundImage" defaultValue="" mode={mode} {...mp}>
      <ControlRow label="Image"><ImageAtom /></ControlRow>
    </UnifiedControlProvider>
  );
}
