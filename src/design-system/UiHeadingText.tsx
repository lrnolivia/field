import { useAtomValue } from 'jotai';
import { lowercaseHeadingsAtom } from '@/code/stores/user-preferences-store';
import { formatUiHeading } from '@/shared/ui-heading-case';

/** Text-only renderer for interface headings/feature names.
 *  Intentionally renders no wrapper so callers retain their semantic element. */
export default function UiHeadingText({ children }: { children: string }) {
  const lowercase = useAtomValue(lowercaseHeadingsAtom);
  return <>{formatUiHeading(children, lowercase)}</>;
}
