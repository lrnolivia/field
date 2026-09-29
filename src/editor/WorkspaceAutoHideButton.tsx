import { useAtom, useAtomValue, useSetAtom } from 'jotai';
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
      aria-pressed={enabled} title={label}
      onClick={() => {
        if (side === 'right') { setRightOpen(false); setTemporaryReveal(false); setExplicitCollapse(false); }
        setEnabled(!enabled);
      }}
      className={`${PANE_CONTROL_BASE} ${enabled ? PANE_CONTROL_ACTIVE : PANE_CONTROL_NEUTRAL} ${entrance ? 'animate-pulse ring-1 ring-[var(--accent)]' : ''}`}>
      <AutoHideEyeIcon enabled={enabled} />
    </button>
    {entrance && <span role="tooltip" className={`pointer-events-none absolute bottom-0 z-20 w-44 rounded-[6px] border border-[var(--border-light)] bg-[var(--bg-panel)] px-2 py-1.5 text-[11px] leading-4 text-[var(--text-primary)] shadow-[var(--shadow-md)] ${side === 'left' ? 'left-9' : 'right-9'}`}>
      {uiCase(enabled ? 'Auto-hide on' : 'Auto-hide off')}
    </span>}
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
