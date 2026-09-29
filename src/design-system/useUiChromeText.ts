import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { lowercaseHeadingsAtom } from '@/code/stores/user-preferences-store';
import { formatUiChromeText } from '@/shared/ui-heading-case';

/** Brand-cases field-owned chrome while keeping the persisted preference boolean. */
export function useUiChromeText() {
  const brand = useAtomValue(lowercaseHeadingsAtom);
  return useCallback((value: string | undefined | null) => {
    if (value == null) return value;
    return formatUiChromeText(value, brand);
  }, [brand]);
}
