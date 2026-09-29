import { useAtom } from 'jotai';
import { useCallback, useRef, useState } from 'react';
import ThemeNeutralPopover from '@/editor/ui/ThemeNeutralPopover';
import { editorNeutralLevelAtom, editorThemeModeAtom } from '@/code/stores/user-preferences-store';
import type { EditorNeutralLevel, EditorThemeMode } from '@/shared/editor-neutral-theme';
import { FigmaMoonIcon, FigmaSunIcon } from '@/shared/loew-figma-icons';
import { trace } from '@/shared/debug-trace';
import { applyEditorChromePreferences } from '@/editor/builder-theme';

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
    // Apply immediately instead of waiting on the global store subscriber.
    // This control owns FIELD CHROME only; website Canvas/Preview appearance
    // is a separate view preference.
    applyEditorChromePreferences();
    window.setTimeout(() => root.classList.remove('theme-transition'), 200);
    setOpen(false);
    trace.action('editor:theme-neutral', { mode: nextMode, level: nextLevel });
  }, [setMode, setNeutralLevel]);

  return (
    <div ref={anchorRef} className="relative z-10">
      <button
        type="button"
        data-editor-appearance
        aria-expanded={open}
        aria-label={'field appearance: ' + mode + ', neutral ' + neutralLevel}
        title={'field appearance: ' + mode + ' · neutral ' + neutralLevel}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-7 w-7 items-center justify-center rounded-[5px] border-none transition-colors ${
          open
            ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
        }`}
      >
        <span className="flex h-4 w-4 items-center justify-center">
          {mode === 'dark'
            ? <FigmaMoonIcon className="h-[13px] w-[13px] translate-x-[1px]" size={13} />
            : <FigmaSunIcon className="h-[13px] w-[13px]" size={13} />
          }
        </span>
      </button>
      {open && (
        <ThemeNeutralPopover
          mode={mode}
          level={neutralLevel}
          anchorRef={anchorRef}
          placement="right"
          onSelect={applyChoice}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
