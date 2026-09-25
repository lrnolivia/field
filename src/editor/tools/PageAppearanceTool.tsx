import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import ColorInput from '@/editor/controls/ColorInput';
import ToolInput from '@/editor/controls/ToolInput';
import { FigmaReloadIcon } from '@/shared/loew-figma-icons';
import { editorNeutralLevelAtom, editorThemeModeAtom } from '@/code/stores/user-preferences-store';
import { activePageAppearanceAtom, pageAppearanceOps } from '@/code/stores/page-appearance-store';

function EyeIcon({ hidden = false }: { hidden?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1.7 8s2.1-3.7 6.3-3.7S14.3 8 14.3 8 12.2 11.7 8 11.7 1.7 8 1.7 8Z" />
      <circle cx="8" cy="8" r="1.7" />
      {hidden && <path d="m2.2 2.2 11.6 11.6" />}
    </svg>
  );
}

export default function PageAppearanceTool() {
  const { filePath, appearance } = useAtomValue(activePageAppearanceAtom);
  const mode = useAtomValue(editorThemeModeAtom);
  const neutralLevel = useAtomValue(editorNeutralLevelAtom);

  const defaultBackground = useMemo(() => {
    if (typeof document === 'undefined') return mode === 'dark' ? '#1e1e1e' : '#e9e9e9';
    const value = getComputedStyle(document.documentElement).getPropertyValue('--bg-canvas').trim();
    return value || (mode === 'dark' ? '#1e1e1e' : '#e9e9e9');
  }, [mode, neutralLevel]);

  const color = appearance?.background ?? defaultBackground;
  const opacity = Math.max(0, Math.min(100, appearance?.opacity ?? 100));
  const visible = appearance?.visible !== false;
  const customized = appearance !== null;

  return (
    <div data-page-inspector="" className="w-full">
      <div className="h-8 px-2.5 border-b border-[var(--border-light)] flex items-center">
        <span className="text-[12px] font-semibold text-[var(--text-primary)]">Page</span>
      </div>
      <div className="px-2.5 py-2">
        <div className="grid grid-cols-[minmax(0,1fr)_52px_24px_24px] gap-1 items-center">
          <div className="h-[var(--control-height)] min-w-0 overflow-hidden rounded-[var(--control-radius)] bg-[var(--control-bg)] border border-[var(--control-border)] hover:border-[var(--control-border-hover)]">
            <ColorInput
              value={color}
              onChange={(background) => pageAppearanceOps.patch(filePath, { background, opacity, visible: true })}
              embedded
            />
          </div>
          <ToolInput
            value={String(opacity)}
            min={0}
            max={100}
            chevronLabel="%"
            ariaLabel="Page background opacity"
            onChange={(value) => {
              const next = Number.parseFloat(value);
              pageAppearanceOps.patch(filePath, {
                background: appearance?.background ?? defaultBackground,
                opacity: Number.isFinite(next) ? Math.max(0, Math.min(100, next)) : opacity,
              });
            }}
          />
          <button
            type="button"
            className={`h-6 w-6 flex items-center justify-center rounded-[var(--control-radius)] transition-colors ${visible ? 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]' : 'text-[var(--text-secondary)] bg-[var(--bg-active)]'}`}
            aria-label={visible ? 'Hide page canvas paint' : 'Show page canvas paint'}
            title={visible ? 'Hide page canvas paint' : 'Show page canvas paint'}
            onClick={() => pageAppearanceOps.patch(filePath, { visible: !visible })}
          >
            <EyeIcon hidden={!visible} />
          </button>
          <button
            type="button"
            disabled={!customized}
            className="h-6 w-6 flex items-center justify-center rounded-[var(--control-radius)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-25 disabled:pointer-events-none"
            aria-label="Reset page canvas to theme default"
            title="Reset to theme default"
            onClick={() => pageAppearanceOps.reset(filePath)}
          >
            <FigmaReloadIcon size={14} />
          </button>
        </div>
        {!appearance?.background && (
          <div className="mt-1.5 text-[9px] leading-[12px] text-[var(--text-tertiary)]">
            Following editor theme
          </div>
        )}
      </div>
    </div>
  );
}
