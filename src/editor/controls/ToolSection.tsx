// ToolSection.tsx — Collapsible section wrapper.
// Title row: mixed-case label on left, optional action button on right.
// Content: flex column with consistent spacing, reused by every tool.
// When hasContent=false (or collapsed): no bottom margin, no separator.

import React, { useRef, useState } from 'react';
import { trace } from '@/shared/debug-trace';

interface Props {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
  /** Action button rendered on the right side of the title row */
  action?: React.ReactNode;
  /** When false, section renders compact with no bottom spacing/separator.
   *  Useful for sections like Animation/Layout that may have no entries. */
  hasContent?: boolean;
  /** Keep the section header mounted even when every child is currently absent.
   *  Figma uses this for addable property stacks such as Stroke / Effects / Export. */
  renderWhenEmpty?: boolean;
  /** Render only the section content. Used when a mature tool is composed
   *  into another canonical inspector section (for example Size inside an
   *  active Auto layout section) without inventing a second visible header. */
  bare?: boolean;
}

export default function ToolSection({ title, children, defaultOpen = true, collapsible = true, action, hasContent = true, renderWhenEmpty = false, bare = false }: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const actionRef = useRef<HTMLSpanElement>(null);

  // Right-click anywhere on the title row opens the SAME menu the `+` (or
  // toggle) button opens — the action's first button is clicked
  // programmatically, so every section's add-menu stays the single source of
  // its items (user request 2026-09-09). No action → the native menu is left
  // alone.
  const onHeaderContextMenu = (e: React.MouseEvent) => {
    const btn = actionRef.current?.querySelector('button');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    trace.action('tool-section:context-open-action', { title });
    btn.click();
  };

  const validChildren = React.Children.toArray(children).filter(Boolean);
  if (validChildren.length === 0 && !renderWhenEmpty) return null;

  if (bare) {
    return (
      <div data-inspector-section-content data-inspector-bare className="flex flex-col gap-[var(--control-gap)]">
        {validChildren}
      </div>
    );
  }

  const showContent = isOpen && hasContent && validChildren.length > 0;
  const sectionId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return (
    <div
      data-inspector-section={sectionId}
      data-inspector-section-title={title}
      data-inspector-section-empty={validChildren.length === 0 ? 'true' : undefined}
      className="w-full"
    >
      {/* Canonical inspector section header. ToolSection remains the compatibility
          surface for existing tools while exposing one Figma-shaped DOM grammar. */}
      <div
        data-inspector-section-header
        className={`${showContent ? 'mb-0.5' : 'mb-0'} min-h-7 px-3 flex items-center justify-between py-1`}
        onContextMenu={onHeaderContextMenu}
      >
        <button
          type="button"
          disabled={!collapsible || !hasContent}
          aria-expanded={collapsible && hasContent ? isOpen : undefined}
          onClick={() => { setIsOpen(!isOpen); trace.action('tool-section:toggle', { title, isOpen: !isOpen }); }}
          // Eyebrow, not a heading. Bold sentence-case at body size makes the
          // titles compete with the controls for attention and produces the
          // ruled-list rhythm this panel shares with every other builder. Small
          // + uppercase + tracked reads as a spec sheet: the titles recede and
          // the controls become the content.
          //
          // --text-PRIMARY, same as the row labels. Dimming the title looked
          // right in isolation but inverted the hierarchy in place: the labels
          // below it use --text-primary, so a grey title read as LESS important
          // than the rows it heads. The recession comes from size, case and
          // tracking instead — 10px uppercase tracked against 12px sentence
          // case is unmistakably a different role at the same colour.
          // Sentence case in the default UI stack (the display-font experiment
          // was retired 2026-08-20) — same face as the row labels, one size up
          // and semibold so the heading role still reads.
          className={`min-h-0 p-0 bg-transparent border-0 text-xs font-semibold text-[var(--text-primary)] text-left ${collapsible && hasContent ? 'cursor-pointer' : 'cursor-default'} ${collapsible && !isOpen ? 'opacity-50' : ''} focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]`}
        >
          {title}
        </button>
        <span ref={actionRef} className="flex items-center">{action}</span>
      </div>
      {isOpen && showContent && (
        <div
          data-inspector-section-content
          className="flex flex-col px-3 pb-1.5 gap-[var(--control-gap)]"
        >
          {children}
        </div>
      )}
    </div>
  );
}
