// BindButton.tsx — Small bind/unbind button for CMS field binding.
// FIGUI3_HIERARCHY_CMS_BINDING_20260925
// Shows a quiet field-native binding control with semantic line icons.
// Click opens a dropdown of fields from the parent collection.
// Only shown when selected node is inside a collection template (.map()).

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAtomValue } from 'jotai';
import { collectionSchemasAtom } from '@/code/stores/cms-store';
import { getCollectionSchema } from '@/code/project/cms-ops';
import { queueMutation } from '@/code/mutation/mutation-queue';
import { trace } from '@/shared/debug-trace';

interface BindButtonProps {
  nodeId: string;
  /** The property being bound: 'text', 'src', 'href', 'alt' */
  property: 'text' | 'src' | 'href' | 'alt';
  /** Current binding field ID, or undefined if unbound */
  currentBinding?: string;
  /** Collection slug the template belongs to */
  collectionSlug: string;
  /** The .map() item variable name (e.g. 'item', 'post') */
  itemVar: string;
}

export function BindButton({ nodeId, property, currentBinding, collectionSlug, itemVar }: BindButtonProps) {
  const schemas = useAtomValue(collectionSchemasAtom);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ x: 0, y: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const schema = schemas.get(collectionSlug) ?? getCollectionSchema(collectionSlug);
  const fields = schema?.fields ?? [];
  const isBound = !!currentBinding;
  const boundField = fields.find(f => f.id === currentBinding);

  trace.fn('BindButton.render', { nodeId, property, currentBinding, collectionSlug, isBound });

  // Open dropdown
  const openDropdown = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuWidth = 160;
    const padding = 12;

    let x = rect.right + 4;
    if (x + menuWidth > window.innerWidth - padding) {
      x = rect.left - menuWidth - 4;
    }
    let y = rect.top;
    if (y + 200 > window.innerHeight - padding) {
      y = window.innerHeight - 200 - padding;
    }

    setDropdownPos({ x, y });
    setDropdownOpen(true);
    trace.action('bind-button:open-dropdown', { nodeId, property, collectionSlug });
  }, [nodeId, property, collectionSlug]);

  const closeDropdown = useCallback(() => setDropdownOpen(false), []);

  // Close on Escape
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeDropdown(); }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [dropdownOpen, closeDropdown]);

  // Bind a field
  const handleBind = useCallback((fieldId: string) => {
    trace.action('bind-button:bind', { nodeId, property, fieldId, itemVar });
    queueMutation({ type: 'bindField', nodeId, property, fieldId, itemVar });
    closeDropdown();
  }, [nodeId, property, itemVar, closeDropdown]);

  // Unbind
  const handleUnbind = useCallback(() => {
    trace.action('bind-button:unbind', { nodeId, property });
    // Replace with empty placeholder text
    const staticValue = property === 'text' ? 'Text' : '';
    queueMutation({ type: 'unbindField', nodeId, property, staticValue });
    closeDropdown();
  }, [nodeId, property, closeDropdown]);

  return (
    <>
      <button
        ref={btnRef}
        data-cms-bind-button
        onClick={openDropdown}
        title={isBound ? `Bound to ${currentBinding}` : `Bind ${property} to collection field`}
        className={`shrink-0 inline-flex items-center gap-1 rounded-[var(--control-radius)] px-1.5 py-0.5 text-[10px] font-medium cursor-pointer border border-transparent transition-colors ${
          isBound
            ? 'bg-[var(--bg-active)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            : 'text-[var(--text-disabled)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
        }`}
      >
        {isBound ? (
          <>
            <svg data-cms-binding-icon width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--selection)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 10 10 6" />
              <path d="M5.2 11.8 3.7 13.3a2.1 2.1 0 0 1-3-3l2.6-2.6a2.1 2.1 0 0 1 3 0" transform="translate(2 -1)" />
              <path d="m10.8 4.2 1.5-1.5a2.1 2.1 0 0 1 3 3l-2.6 2.6a2.1 2.1 0 0 1-3 0" transform="translate(-2 1)" />
            </svg>
            <span className="truncate max-w-[60px]">{boundField?.name ?? currentBinding}</span>
          </>
        ) : (
          <svg data-cms-binding-icon width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5.5 2.5v4M10.5 2.5v4M4 6.5h8v1.25A4 4 0 0 1 8 11.75v1.75" />
          </svg>
        )}
      </button>

      {/* Dropdown portal */}
      {dropdownOpen && createPortal(
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-50" onClick={closeDropdown} />

          {/* Menu */}
          <div
            className="fixed bg-[var(--dropdown-bg)] shadow-[var(--shadow-lg)] cut-corners cut-lg cut-border [--cut-border-color:var(--border-light)] py-1.5 z-51 min-w-[160px] border border-[var(--border-light)]"
            style={{ left: dropdownPos.x, top: dropdownPos.y }}
          >
            {/* Header */}
            <div className="px-3 py-1.5 text-[10px] font-medium text-[var(--text-tertiary)]">
              Bind {property}
            </div>

            {/* Field options */}
            {fields.map(field => (
              <button
                key={field.id}
                onClick={() => handleBind(field.id)}
                className={`w-[calc(100%-8px)] mx-1 flex items-center gap-2 px-2.5 py-1.5 cut-corners text-left cursor-pointer transition-colors ${
                  currentBinding === field.id
                    ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
                    : 'hover:bg-[var(--bg-hover)] text-[var(--text-primary)]'
                }`}
              >
                <span className="text-xs font-medium">{field.name}</span>
                <span className="text-[10px] text-[var(--text-disabled)] ml-auto">{field.type}</span>
              </button>
            ))}

            {/* Unbind option */}
            {isBound && (
              <>
                <div className="h-px bg-[var(--border-light)] mx-2 my-1" />
                <button
                  onClick={handleUnbind}
                  className="w-[calc(100%-8px)] mx-1 flex items-center gap-2 px-2.5 py-1.5 cut-corners text-left cursor-pointer transition-colors hover:bg-red-600/20 text-red-400"
                >
                  <span className="text-xs font-medium">Unbind</span>
                </button>
              </>
            )}

            {fields.length === 0 && (
              <div className="px-3 py-2 text-[10px] text-[var(--text-disabled)]">
                No fields in collection
              </div>
            )}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

