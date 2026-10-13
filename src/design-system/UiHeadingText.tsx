import { useAtomValue } from 'jotai';
import { caseManagementAtom } from '@/code/stores/user-preferences-store';
import { formatUiHeading } from '@/shared/ui-heading-case';

/** Text-only renderer for interface headings/feature names.
 *  Intentionally renders no wrapper so callers retain their semantic element. */
export default function UiHeadingText({ children }: { children: string }) {
  const enabled = useAtomValue(caseManagementAtom);
  return <>{formatUiHeading(children, enabled)}</>;
}
