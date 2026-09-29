// ToolSection.tsx — Collapsible section wrapper.
// Title row: mixed-case label on left, optional action button on right.
// Content: flex column with consistent spacing, reused by every tool.
// When hasContent=false (or collapsed): no bottom margin, no separator.

import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { fieldMotion, fieldSpatialTransition, useFieldReducedMotion } from '@/editor/motion';
import { trace } from '@/shared/debug-trace';
import UiHeadingText from '@/design-system/UiHeadingText';

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

type SectionVisualKind = 'geometry' | 'appearance' | 'content' | 'behavior' | 'system';

function sectionVisualKind(title: string): SectionVisualKind {
  const value = title.toLowerCase();
  if (/position|layout|size|dimension|scale|grid|spacing|padding|curve|path/.test(value)) return 'geometry';
  if (/appearance|fill|stroke|effect|typography|color|shadow|selection|style/.test(value)) return 'appearance';
  if (/image|video|audio|form|input|content|component|icon|collection|gallery|text/.test(value)) return 'content';
  if (/interaction|animation|overlay|link|navigation|cursor|scroll|accessibility|prototype/.test(value)) return 'behavior';
  return 'system';
}

function SectionGlyph({ kind }: { kind: SectionVisualKind }) {
  const common = {
    width: 13,
    height: 13,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.25,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (kind === 'geometry') return <svg {...common}><path d="M3 4h10M3 12h10M4 3v10M12 3v10" /><path d="m6 6 2-2 2 2M6 10l2 2 2-2" /></svg>;
  if (kind === 'appearance') return <svg {...common}><circle cx="8" cy="8" r="5" /><path d="M8 3a5 5 0 0 1 0 10Z" fill="currentColor" stroke="none" opacity=".55" /></svg>;
  if (kind === 'content') return <svg {...common}><rect x="3" y="3" width="10" height="10" rx="1.5" /><path d="m5 10 2-2 1.5 1.5L11 7l2 3" /></svg>;
  if (kind === 'behavior') return <svg {...common}><path d="M4 3v10M12 3v10M4 8h8" /><path d="m9.5 5.5 2.5 2.5-2.5 2.5" /></svg>;
  return <svg {...common}><path d="M3 5h10M3 11h10" /><circle cx="6" cy="5" r="1.5" fill="currentColor" stroke="none" /><circle cx="10" cy="11" r="1.5" fill="currentColor" stroke="none" /></svg>;
}

export default function ToolSection({ title, children, defaultOpen = true, collapsible = true, action, hasContent = true, renderWhenEmpty = false, bare = false }: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const reducedMotion = useFieldReducedMotion();
  const actionRef = useRef<HTMLSpanElement>(null);

  // Right-click anywhere on the title row opens the SAME menu the `+` (or
  // toggle) button opens — the action's first button is clicked
  // programmatically, so every section's add-menu stays the single source of
  // its items (user request 2026-09-09). No action → the native menu is left
  // alone.
  const onHeaderContextMenu = (e: React.MouseEvent) => {
    const btn = actionRef.current?.querySelector('button:not(:disabled)');
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
      data-inspector-section-card
      data-inspector-section-kind={sectionVisualKind(title)}
      className="mx-2 my-0.5 overflow-hidden rounded-[10px] border border-[var(--border-light)] bg-[var(--bg-surface)]"
    >
      {/* Canonical inspector section header. ToolSection remains the compatibility
          surface for existing tools while exposing one Figma-shaped DOM grammar. */}
      <div
        data-inspector-section-header
        className={`${showContent ? 'border-b border-[var(--border-light)]' : ''} min-h-9 px-2.5 flex items-center justify-between py-1.5 bg-[var(--bg-hover)]/10`}
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
          className={`min-h-0 p-0 bg-transparent border-0 text-xs font-semibold text-[var(--text-primary)] text-left inline-flex items-center gap-1.5 transition-colors ${collapsible && hasContent ? 'cursor-pointer hover:text-[var(--accent)]' : 'cursor-default'} ${collapsible && !isOpen ? 'opacity-50' : ''} focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]`}
        >
          <span
            data-inspector-section-glyph
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border border-[var(--border-light)] bg-[var(--accent-surface)] text-[var(--accent)]"
          >
            <SectionGlyph kind={sectionVisualKind(title)} />
          </span>
          <span><UiHeadingText>{title}</UiHeadingText></span>
        </button>
        <span ref={actionRef} className="flex items-center">{action}</span>
      </div>
      <AnimatePresence initial={false}>
        {showContent && (
          <motion.div
            key="content"
            data-inspector-section-content
            data-field-motion="section-content"
            initial={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0.45, y: -8 }}
            animate={reducedMotion ? { opacity: 1 } : { height: 'auto', opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0.45, y: -8 }}
            transition={fieldSpatialTransition(reducedMotion, fieldMotion.disclosure)}
            className="flex flex-col px-2.5 py-2.5 gap-2 overflow-hidden bg-[var(--bg-hover)]/[0.035]"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
