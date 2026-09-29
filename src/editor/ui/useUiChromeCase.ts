import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { uiHeadingCaseAtom } from '@/code/stores/user-preferences-store';
import { formatUiChromeText } from '@/shared/ui-heading-case';

/** Format field-owned chrome according to the current Brand / Original preference. */
export function useUiChromeCase() {
  const mode = useAtomValue(uiHeadingCaseAtom);
  return useCallback((value: string | undefined | null) => {
    if (value == null) return value;
    return formatUiChromeText(value, mode);
  }, [mode]);
}
