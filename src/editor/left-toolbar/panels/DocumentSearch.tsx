import { useId } from 'react';
import SearchBar from '@/design-system/SearchBar';

/** One query filters the existing navigation trees; typing never opens a page. */
export default function DocumentSearch({ value, onChange }: {
  value: string;
  onChange: (query: string) => void;
}) {
  const scopeId = useId();
  return <div data-document-search className="px-2 pt-2 pb-1 shrink-0">
    <SearchBar value={value} onChange={onChange} placeholder="Search pages and layers…"
      onClear={() => onChange('')}
      onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
          event.preventDefault();
          onChange('');
        }
      }}
      inputProps={{ 'aria-describedby': scopeId }} />
    <span id={scopeId} className="sr-only">Filter project pages and the layers in the current page, template or component. Matching layers keep their parent hierarchy.</span>
  </div>;
}
