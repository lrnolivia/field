// AdjustControl.tsx — vertical alignment of text inside its box.
import { ToolSegmentedControl } from '../../../controls';
import { useControl } from '../../../controls/ControlProvider';
import { trace } from '@/shared/debug-trace';

export function AdjustControl({ compact = false }: { compact?: boolean } = {}) {
  const { styles, updateMultipleStyles } = useControl();
  const isFlexCol =
    styles.display === 'flex' && (styles.flexDirection === 'column' || styles.flexDirection === 'column-reverse');
  const rawJustify = isFlexCol ? styles.justifyContent : '';
  const value = rawJustify === 'center' ? 'center' : rawJustify === 'flex-end' ? 'flex-end' : 'flex-start';

  const setAdjust = (next: string) => {
    updateMultipleStyles({
      display: 'flex',
      flexDirection: 'column',
      justifyContent: next === 'flex-start' ? '' : next,
    });
  };

  const control = (
    <ToolSegmentedControl
      value={value}
      onChange={setAdjust}
      options={[
        { value: 'flex-start', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg> },
        { value: 'center', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg> },
        { value: 'flex-end', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg> },
      ]}
      size="compact"
    />
  );

  trace.fn('AdjustControl:render', { value, compact, display: styles.display, justifyContent: styles.justifyContent });
  if (compact) return control;
  return (
    <div className="flex items-center justify-between w-full">
      <span className="w-3/4 text-xs font-bold text-[var(--text-secondary)] pl-[18px] -ml-[18px]">Adjust</span>
      {control}
    </div>
  );
}
