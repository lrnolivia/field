import { useAtom } from 'jotai';
import { websitePreviewThemeAtom } from '@/code/stores/user-preferences-store';
import { FigmaMoonIcon, FigmaSunIcon } from '@/shared/loew-figma-icons';
import { refreshCanvasTokens } from '@/canvas/node-ops';
import { trace } from '@/shared/debug-trace';

/** Controls which existing website theme variant Canvas + Preview display.
 *  This is a viewing preference only; it never mutates project source. */
export default function WebsitePreviewAppearanceControl() {
  const [mode, setMode] = useAtom(websitePreviewThemeAtom);
  const nextMode = mode === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      data-website-preview-appearance
      aria-label={`site appearance: ${mode}. switch to ${nextMode}`}
      title={`site appearance: ${mode === 'dark' ? 'dark' : 'light'} · switch to ${nextMode}`}
      onClick={() => {
        setMode(nextMode);
        requestAnimationFrame(() => refreshCanvasTokens());
        trace.action('website-preview-theme:changed', { mode: nextMode });
      }}
      className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
    >
      <span className="flex h-4 w-4 items-center justify-center">
        {mode === 'dark'
          ? <FigmaMoonIcon className="h-[13px] w-[13px] translate-x-[1px]" size={13} />
          : <FigmaSunIcon className="h-[13px] w-[13px]" size={13} />
        }
      </span>
    </button>
  );
}
