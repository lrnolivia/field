import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropertiesPanel from './PropertiesPanel';
import { SectionGlyph, type SectionVisualKind } from './controls/ToolSection';
import { useUiChromeCase } from './ui/useUiChromeCase';

type Section = { id: string; title: string; kind: SectionVisualKind };

/** The full Inspector is unmounted while collapsed. Keep its existing tool
 * composition as the availability source, so conditional tools, component
 * properties and addable stacks stay identical in both presentations. */
export default function CompactInspectorSections({ active, onOpen }: { active: boolean; onOpen: () => void }) {
  const uiCase = useUiChromeCase();
  const probe = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [target, setTarget] = useState<Element | null>(null);

  useEffect(() => {
    if (!active || !probe.current) { setTarget(null); return; }
    setTarget(document.querySelector('[data-inspector-compact-categories]'));
    const root = probe.current;
    const collect = () => {
      const found = new Map<string, Section>();
      root.querySelectorAll<HTMLElement>('[data-inspector-section]').forEach(el => {
        const id = el.dataset.inspectorSection!;
        if (!found.has(id)) found.set(id, { id, title: el.dataset.inspectorSectionTitle!, kind: el.dataset.inspectorSectionKind as SectionVisualKind });
      });
      const next = [...found.values()];
      setSections(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    collect();
    const observer = new MutationObserver(collect);
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-inspector-section', 'data-inspector-section-title'] });
    return () => observer.disconnect();
  }, [active]);

  useEffect(() => {
    if (active || !pending) return;
    const navigate = () => {
      const section = [...document.querySelectorAll<HTMLElement>('[data-properties-panel] [data-inspector-section]')]
        .find(el => el.dataset.inspectorSection === pending && !el.closest('[data-inspector-category-source]'));
      if (!section) return false;
      const button = section.querySelector<HTMLButtonElement>('[data-inspector-section-header] button');
      if (button?.getAttribute('aria-expanded') === 'false') button.click();
      section.scrollIntoView({ block: 'start' });
      button?.focus({ preventScroll: true });
      setPending(null);
      return true;
    };
    if (navigate()) return;
    const observer = new MutationObserver(() => { if (navigate()) observer.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => { observer.disconnect(); setPending(null); }, 2000);
    return () => { observer.disconnect(); window.clearTimeout(timeout); };
  }, [active, pending]);

  return <>
    {active && <div ref={probe} data-inspector-category-source hidden inert aria-hidden="true">
      <PropertiesPanel categorySource />
    </div>}
    {active && target && createPortal(sections.map(section => <button
      key={section.id}
      type="button"
      data-inspector-compact-category={section.id}
      aria-label={uiCase(`Open ${section.title} inspector`) ?? undefined}
      title={uiCase(section.title) ?? undefined}
      onClick={() => { setPending(section.id); onOpen(); }}
      className="flex w-8 shrink-0 flex-col items-center gap-1 rounded-[5px] py-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-1 focus-visible:outline-[var(--accent)]"
    ><span className="text-[var(--accent-text)]"><SectionGlyph kind={section.kind} /></span>
      <span className="w-full truncate text-center text-[8px]">{uiCase(section.title)}</span>
    </button>), target)}
  </>;
}
