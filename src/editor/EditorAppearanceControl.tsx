import { useAtom } from 'jotai';
import { useCallback, useRef, useState } from 'react';
import ThemeNeutralPopover from '@/editor/ui/ThemeNeutralPopover';
import { editorNeutralLevelAtom, editorThemeModeAtom } from '@/code/stores/user-preferences-store';
import type { EditorNeutralLevel, EditorThemeMode } from '@/shared/editor-neutral-theme';
import { FigmaMoonIcon, FigmaSunIcon } from '@/shared/loew-figma-icons';
import { refreshCanvasTokens } from '@/canvas/node-ops';
import { trace } from '@/shared/debug-trace';

export default function EditorAppearanceControl() {
  const [mode, setMode] = useAtom(editorThemeModeAtom);
  const [neutralLevel, setNeutralLevel] = useAtom(editorNeutralLevelAtom);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const applyChoice = useCallback((nextMode: EditorThemeMode, nextLevel: EditorNeutralLevel) => {
    const root = document.documentElement;
    root.classList.add('theme-transition');
    setMode(nextMode);
    setNeutralLevel(nextLevel);
    window.setTimeout(() => root.classList.remove('theme-transition'), 200);
    requestAnimationFrame(() => refreshCanvasTokens());
    setOpen(false);
    trace.action('editor:theme-neutral', { mode: nextMode, level: nextLevel });
  }, [setMode, setNeutralLevel]);

  return (
    <div ref={anchorRef} className="relative z-10">
      <button
        type="button"
        data-editor-appearance
        aria-expanded={open}
        aria-label={'Editor appearance: ' + mode + ', neutral ' + neutralLevel}
        title={'Editor appearance: ' + mode + ' · Neutral ' + neutralLevel}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-7 w-7 items-center justify-center rounded-[5px] border-none transition-colors ${
          open
            ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
        }`}
      >
        {mode === 'dark'
          ? <FigmaMoonIcon className="h-3.5 w-3.5" size={14} />
          : <FigmaSunIcon className="h-3.5 w-3.5" size={14} />
        }
      </button>
      {open && (
        <ThemeNeutralPopover
          mode={mode}
          level={neutralLevel}
          anchorRef={anchorRef}
          placement="above"
          onSelect={applyChoice}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
