import { useEffect, useRef, type RefObject } from 'react';
import {
  DEFAULT_EDITOR_NEUTRAL_LEVEL,
  EDITOR_NEUTRAL_LEVELS,
  EDITOR_NEUTRAL_SWATCHES,
  EDITOR_THEME_MODES,
  type EditorNeutralLevel,
  type EditorThemeMode,
} from '@/shared/editor-neutral-theme';

interface ThemeNeutralPopoverProps {
  mode: EditorThemeMode;
  level: EditorNeutralLevel;
  anchorRef: RefObject<HTMLElement | null>;
  onSelect: (mode: EditorThemeMode, level: EditorNeutralLevel) => void;
  onClose: () => void;
}

export default function ThemeNeutralPopover({ mode, level, anchorRef, onSelect, onClose }: ThemeNeutralPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (panelRef.current?.contains(target) || anchorRef.current?.contains(target))) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [anchorRef, onClose]);

  const activeIndex = EDITOR_THEME_MODES.indexOf(mode) * EDITOR_NEUTRAL_LEVELS.length
    + EDITOR_NEUTRAL_LEVELS.indexOf(level);

  const moveFocus = (index: number, key: string) => {
    const cols = EDITOR_NEUTRAL_LEVELS.length;
    let next = index;
    if (key === 'ArrowLeft') next = (index + 5) % 6;
    if (key === 'ArrowRight') next = (index + 1) % 6;
    if (key === 'ArrowUp') next = (index - cols + 6) % 6;
    if (key === 'ArrowDown') next = (index + cols) % 6;
    if (next !== index) optionRefs.current[next]?.focus();
  };

  return (
    <div
      ref={panelRef}
      data-theme-neutral-popover=""
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[172px] rounded-[8px] border border-[var(--border-light)] bg-[var(--dropdown-bg)] shadow-[var(--shadow-lg)] p-2 z-[10020]"
      role="radiogroup"
      aria-label="Editor neutral appearance"
    >
      <div className="grid grid-cols-[38px_repeat(3,1fr)] gap-x-1 gap-y-1 items-center">
        {EDITOR_THEME_MODES.map((themeMode, row) => (
          <div key={themeMode} className="contents">
            <span className="text-[10px] leading-none text-[var(--text-secondary)] capitalize pl-0.5">
              {themeMode}
            </span>
            {EDITOR_NEUTRAL_LEVELS.map((neutralLevel, col) => {
              const index = row * EDITOR_NEUTRAL_LEVELS.length + col;
              const checked = themeMode === mode && neutralLevel === level;
              const isDefault = neutralLevel === DEFAULT_EDITOR_NEUTRAL_LEVEL;
              return (
                <button
                  key={`${themeMode}-${neutralLevel}`}
                  ref={(node) => { optionRefs.current[index] = node; }}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-label={`${themeMode} neutral ${neutralLevel}${isDefault ? ', default' : ''}`}
                  tabIndex={index === activeIndex ? 0 : -1}
                  onClick={() => onSelect(themeMode, neutralLevel)}
                  onKeyDown={(event) => {
                    if (event.key.startsWith('Arrow')) {
                      event.preventDefault();
                      moveFocus(index, event.key);
                    }
                  }}
                  className={`relative h-7 rounded-[5px] border transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--selection)] ${checked ? 'border-[var(--selection)]' : 'border-[var(--border-default)] hover:border-[var(--text-tertiary)]'}`}
                  style={{ background: EDITOR_NEUTRAL_SWATCHES[themeMode][neutralLevel] }}
                >
                  {checked && (
                    <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                      <span className={`w-2 h-2 rounded-full border ${themeMode === 'dark' ? 'bg-white border-black/30' : 'bg-black border-white/50'}`} />
                    </span>
                  )}
                  {isDefault && (
                    <span
                      aria-hidden
                      className={`absolute bottom-[2px] left-1/2 -translate-x-1/2 w-[8px] h-px ${themeMode === 'dark' ? 'bg-white/55' : 'bg-black/45'}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="pt-1.5 text-[9px] leading-none text-center text-[var(--text-tertiary)]">
        Middle tone is Default
      </div>
    </div>
  );
}
