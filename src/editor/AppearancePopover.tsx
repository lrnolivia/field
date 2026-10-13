import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useAtom } from 'jotai';
import { builderThemeAtom, editorThemeModeAtom } from '@/code/stores/user-preferences-store';
import { BUILDER_THEMES, builderAccentSurface, getBuilderThemeById } from '@/shared/builder-themes';
import { useUiChromeCase } from './ui/useUiChromeCase';
import { applyBuilderTheme, applyEditorChromePreferences } from './builder-theme';
import ToolSwitch from './controls/ToolSwitch';
import { FigmaCheckIcon } from '@/shared/loew-figma-icons';

/** Local preview never writes preferences or recolors the user's document. */
export default function AppearancePopover({ anchorRef, onClose, embedded = false }: {
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  embedded?: boolean;
}) {
  const [themeId, setThemeId] = useAtom(builderThemeAtom);
  const [mode, setMode] = useAtom(editorThemeModeAtom);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [position, setPosition] = useState({ left: 12, top: 60 });
  const panelRef = useRef<HTMLDivElement>(null);
  const swatches = useRef<(HTMLButtonElement | null)[]>([]);
  const uiCase = useUiChromeCase();
  const selected = getBuilderThemeById(themeId) ?? BUILDER_THEMES[0]!;
  const preview = getBuilderThemeById(previewId ?? selected.id) ?? selected;
  const palette = preview[mode];

  useLayoutEffect(() => {
    if (embedded) return;
    const positionPanel = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const panel = panelRef.current?.getBoundingClientRect();
      if (!anchor || !panel) return;
      const below = anchor.bottom + 4;
      setPosition({
        left: Math.max(12, Math.min(anchor.left, window.innerWidth - panel.width - 12)),
        top: Math.max(12, below + panel.height <= window.innerHeight - 12 ? below : anchor.top - panel.height - 4),
      });
    };
    positionPanel();
    window.addEventListener('resize', positionPanel);
    return () => window.removeEventListener('resize', positionPanel);
  }, [anchorRef, embedded]);

  useEffect(() => {
    if (embedded) return;
    const trigger = anchorRef.current;
    panelRef.current?.querySelector<HTMLButtonElement>('[role="switch"]')?.focus();
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !trigger?.contains(target)) onClose();
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [anchorRef, onClose, embedded]);

  const content = (
    <div ref={panelRef} role="dialog" aria-label={uiCase('Appearance') ?? undefined}
      data-modal-root data-field-appearance-popover data-field-no-canvas-input
      className={`${embedded ? 'relative' : 'fixed z-[16000]'} w-[240px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[7px] border border-[var(--border-light)] bg-[var(--bg-panel)] shadow-[var(--shadow-md)] text-[var(--text-primary)]`}
      style={embedded ? undefined : position}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.preventDefault(); event.stopPropagation(); onClose(); anchorRef.current?.focus();
        }
        if (event.key === 'Tab') {
          const items = [...(panelRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
          const first = items[0], last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}>
      <div className="p-2.5">
      <div data-appearance-preview className="overflow-hidden rounded-[5px] bg-[var(--field-chrome-section-bg)]">
        <div className="flex h-7 items-center gap-1.5 border-b border-[var(--border-light)] px-2 text-[10px] text-[var(--text-secondary)]">
          <span aria-hidden className="h-2 w-2 rounded-[2px]" style={{ background: palette.accent }} />
          <span>{uiCase(preview.label)}</span>
        </div>
        <div className="flex h-12 items-center justify-between gap-2 px-2 text-[11px]">
          <span>{uiCase('Make space for ideas')}</span>
          <span className="flex h-6 w-6 items-center justify-center rounded-[4px] font-medium" style={{ background: builderAccentSurface(palette.accent, palette.accentTextFg), color: palette.accentTextFg }}>{uiCase('Aa')}</span>
        </div>
      </div>
      <div className="my-2.5 flex h-7 items-center justify-between text-[11px]">
        <span>{uiCase('Light / dark')}</span>
        <ToolSwitch value={mode === 'dark'} ariaLabel={uiCase('Light / dark') ?? undefined}
          onChange={dark => { setMode(dark ? 'dark' : 'light'); applyEditorChromePreferences(); applyBuilderTheme(); }} />
      </div>
      <div role="group" aria-label={uiCase('Accent color') ?? undefined} className="flex justify-between gap-1 border-t border-[var(--border-light)] pt-2"
        onMouseLeave={() => setPreviewId(null)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPreviewId(null); }}>
        {BUILDER_THEMES.map((theme, index) => (
          <button key={theme.id} ref={el => { swatches.current[index] = el; }} type="button"
            data-appearance-swatch={theme.id} aria-label={uiCase(theme.label) ?? undefined} title={uiCase(theme.label) ?? undefined}
            aria-pressed={selected.id === theme.id}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent-text)]"
            onPointerEnter={event => { if (event.pointerType !== 'touch') setPreviewId(theme.id); }} onFocus={() => setPreviewId(theme.id)}
            onClick={() => { setThemeId(theme.id); setPreviewId(null); applyBuilderTheme(); }}
            onKeyDown={event => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? BUILDER_THEMES.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + BUILDER_THEMES.length) % BUILDER_THEMES.length;
              swatches.current[next]?.focus();
            }}>
            <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-[4px] text-[11px]" style={{ background: theme[mode].accent, color: theme[mode].accentTextFg }}>
              {selected.id === theme.id ? <FigmaCheckIcon size={12} /> : null}
            </span>
          </button>
        ))}
      </div>
      </div>
    </div>
  );
  return embedded ? content : createPortal(content, document.body);
}
