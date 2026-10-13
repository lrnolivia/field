import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { caseManagementAtom } from '@/code/stores/user-preferences-store';
import { formatUiChrome } from '@/shared/ui-heading-case';

export function useUiChromeCase() {
  const enabled = useAtomValue(caseManagementAtom);
  return useCallback((value: string | undefined | null) => {
    if (value == null) return value;
    return formatUiChrome(value, enabled);
  }, [enabled]);
}
