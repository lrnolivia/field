import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { AnimatePresence, motion } from 'motion/react';
import { floatingEntranceAtom, workspaceAutoHideAtom } from './workspace-mode-store';
import { rightInspectorAutoHideAtom, rightInspectorExplicitCollapseAtom, rightInspectorTemporaryRevealAtom, rightPaneOpenAtom } from '@/code/stores/workspace-panels-store';
import { FieldGlyph, FieldMorphGlyph, glyphIcons } from '@/editor/glyph';
import { useUiChromeCase } from '@/editor/ui/useUiChromeCase';

export function AutoHideEyeIcon({ enabled }: { enabled: boolean }) {
  return (
    <FieldGlyph behavior="eye">
      <FieldMorphGlyph
        active={enabled}
        from={glyphIcons.eye}
        to={glyphIcons.eyeOff}
        size={13}
        strokeWidth={1.5}
      />
    </FieldGlyph>
  );
}

const PANE_CONTROL_BASE = 'flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-[var(--bg-hover)] p-0 transition-colors';
const PANE_CONTROL_NEUTRAL = 'text-[var(--text-secondary)] hover:bg-[var(--text-secondary)] hover:text-[var(--bg-hover)]';
const PANE_CONTROL_ACTIVE = 'text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg-hover)]';

export default function WorkspaceAutoHideButton({ side = 'left', className = '' }: { side?: 'left' | 'right'; className?: string }) {
  const [enabled, setEnabled] = useAtom(side === 'right' ? rightInspectorAutoHideAtom : workspaceAutoHideAtom);
  const setRightOpen = useSetAtom(rightPaneOpenAtom);
  const setTemporaryReveal = useSetAtom(rightInspectorTemporaryRevealAtom);
  const setExplicitCollapse = useSetAtom(rightInspectorExplicitCollapseAtom);
  const entrance = useAtomValue(floatingEntranceAtom);
  const uiCase = useUiChromeCase();
  const rawLabel = `${enabled ? 'Turn off' : 'Turn on'} ${side === 'right' ? 'Inspector' : 'left panel'} auto-hide`;
  const label = uiCase(rawLabel) ?? rawLabel;
  return <div className={`z-10 ${className || 'relative'}`}>
    <button type="button" data-workspace-autohide data-side={side} aria-label={label}
      aria-pressed={enabled}
      onClick={() => {
        if (side === 'right') { setRightOpen(false); setTemporaryReveal(false); setExplicitCollapse(false); }
        setEnabled(!enabled);
      }}
      className={`${PANE_CONTROL_BASE} ${enabled ? PANE_CONTROL_ACTIVE : PANE_CONTROL_NEUTRAL} ${entrance ? 'animate-pulse ring-1 ring-[var(--accent)]' : ''}`}>
      <AutoHideEyeIcon enabled={enabled} />
    </button>
    <AnimatePresence initial={false}>
      {entrance && (
        <div
          className={`pointer-events-none absolute top-1/2 z-30 -translate-y-1/2 ${side === 'left' ? 'left-[calc(100%+6px)]' : 'right-[calc(100%+6px)]'}`}
        >
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, x: side === 'left' ? -2 : 2, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1, transition: { duration: 0.12, ease: 'easeOut' } }}
            exit={{ opacity: 0, x: side === 'left' ? -2 : 2, scale: 0.98, transition: { duration: 0.09, ease: 'easeIn' } }}
            className="block whitespace-nowrap rounded-[5px] border border-[var(--border-light)] bg-[var(--bg-panel)] px-1.5 py-1 text-[10px] leading-none text-[var(--text-primary)] shadow-[0_4px_12px_rgba(0,0,0,0.16)]"
          >
            {uiCase(enabled ? 'Auto-hide on' : 'Auto-hide off')}
          </motion.span>
        </div>
      )}
    </AnimatePresence>
  </div>;
}


export function WorkspaceCollapseButton({
  side = 'left',
  collapsed,
  onClick,
  actionLabel,
  className = '',
}: {
  side?: 'left' | 'right';
  collapsed: boolean;
  onClick: () => void;
  actionLabel?: string;
  className?: string;
}) {
  const uiCase = useUiChromeCase();
  const rawLabel = actionLabel ?? (collapsed
    ? (side === 'right' ? 'Expand Inspector' : 'Expand panel')
    : (side === 'right' ? 'Collapse Inspector' : 'Collapse panel'));
  const label = uiCase(rawLabel) ?? rawLabel;
  const path = side === 'right'
    ? (collapsed ? 'M2 2v12M11 4 7 8l4 4' : 'M14 2v12M5 4l4 4-4 4')
    : (collapsed ? 'M14 2v12M5 4l4 4-4 4' : 'M2 2v12M11 4 7 8l4 4');
  return (
    <button
      type="button"
      data-workspace-collapse
      data-side={side}
      aria-label={label}
      aria-pressed={collapsed}
      title={label}
      onClick={onClick}
      className={`${PANE_CONTROL_BASE} ${PANE_CONTROL_NEUTRAL} ${className}`}
    >
      <svg aria-hidden viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <path d={path} />
      </svg>
    </button>
  );
}
