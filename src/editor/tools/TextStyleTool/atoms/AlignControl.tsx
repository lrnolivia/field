// AlignControl.tsx — compact Figma text alignment group.
import { ToolSegmentedControl } from '../../../controls';
import { useTextStyles } from '../../../hooks/useTextStyles';
import { trace } from '@/shared/debug-trace';

export function AlignControl({ compact = false, primary = false }: { compact?: boolean; primary?: boolean } = {}) {
  const text = useTextStyles();
  const { value, isMixed } = text.get('textAlign');
  const control = (
    <ToolSegmentedControl
      value={isMixed ? '' : (value || 'left')}
      onChange={(v) => text.set('textAlign', v)}
      options={[
        { value: 'left', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg> },
        { value: 'center', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg> },
        { value: 'right', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg> },
        ...(!primary ? [{ value: 'justify', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg> }] : []),
      ]}
      size="compact"
    />
  );
  trace.fn('AlignControl:render', { value, isMixed, compact, isEditing: text.isEditing });
  if (compact) return control;
  return (
    <div className="flex items-center justify-between w-full">
      <span className="w-3/4 text-xs font-bold text-[var(--text-secondary)] pl-[18px] -ml-[18px]">Align</span>
      {control}
    </div>
  );
}
