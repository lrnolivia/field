// StylesTool — Pure composition of ToolAtoms. Zero inline control logic.
// Each atom is self-contained: reads its own value, handles binding detection,
// renders "Used by X" when scroll/animation bound, manages its own popup state.
//
// Some atoms render UNCONDITIONALLY (Fill, Radius, Padding, Margin, Overflow,
// Opacity, Hide, Border, Shadow, Transform) — they're staple controls every
// node may want to tweak. Others (OverflowX/Y, Mask, ClipPath, Filter,
// ZIndex, Backface, Pseudo) are DYNAMIC: they only show up when the underlying CSS
// property has a value somewhere on the node — directly, in a media-query
// override, or in a variant — so the panel doesn't drown the user in 20+
// rows of unused defaults. Currently-hidden dynamics surface in the Styles
// section's `+` dropdown for quick add.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { AppearanceHeaderActions, StyleSectionActions } from './InspectorSectionActions';
import { parseBackgroundLayers, formatBackgroundLayers, createDefaultLayer } from '../../ui/background-layer-utils';
import { ToolSection, ToolDivider } from '../../controls';
import { useControl } from '../../controls/ControlProvider';
import { isTextTag } from '@/shared/constants';
import { pseudoStylesAtom } from '@/code/stores/pseudo-store';
import { useNodesComputed } from '@/code/stores/node-family';
import { isVectorSetComponentFile } from '@/code/project/active-file-store';
import { trace } from '@/shared/debug-trace';
import {
  FillControl, RadiusControl, MarginControl,
  OverflowControl, OverflowXControl, OverflowYControl, OpacityControl,
  BorderControl, ShadowControl, MaskControl,
  ClipPathControl, TransformControl, FilterControl, BackdropFilterControl, ZIndexControl,
  VariantTransitionControl, PseudoElementControl,
  PointerEventsControl, UserSelectControl, BackfaceControl, FormStateControl,
  GroupFillControl,
} from './atoms';
import { DYNAMIC_STYLES, type DynamicStyleSpec } from './dynamic-styles';

// ─── StylesTool ────────────────────────────────────────────────────────────

type StylesToolScope = 'all' | 'appearance' | 'advanced';

export default function StylesTool({ scope = 'all' }: { scope?: StylesToolScope } = {}) {
  const { node, styles, hasOverride, updateStyle, updateMultipleStyles } = useControl();
  const pseudoStyles = useAtomValue(pseudoStylesAtom);
  const isText = !!node && isTextTag(node.type);
  // SVG GROUP — a <svg> wrapper whose children are themselves <svg> shape
  // wrappers (vs a single-shape <svg> whose child is a polygon/path). A
  // group has no fill/border/radius of its own; its visible color lives on
  // each leaf shape's `fill` attr. So it gets a focused panel: Opacity +
  // group-Fill (fans out to every child, "Mixed" when they differ) + Hide +
  // Rotate — and skips the ~15 box-model rows that don't apply to a vector
  // group. Detected here (not in PropertiesPanel) so the Styles surface stays
  // self-describing: one tool, conditioned on what's selected.
  const isSvgGroup = useNodesComputed(
    (nodes) => !!node && node.type === 'svg' && Array.isArray(node.children)
      && node.children.some((cid) => nodes.get(cid)?.type === 'svg'),
    [node],
  );
  // The viewport frame (`root` on bare pages, `layout::root` on templated
  // pages) hides Margin + Hide: a viewport can't sit inside a flex/grid
  // parent (so margin doesn't paint), and hiding the page root would just
  // blank the canvas — neither control has a meaningful effect here.
  const isViewportFrame = !!node && (node.id === 'root' || node.id === 'layout::root');
  // Two related flags drive how the StylesTool collapses for component
  // instances. Both matter — see below.
  //
  //   - `isComponentInstanceWrapper` — the selected node IS the
  //     `<MyComponent />` JSX instance tag (top-level OR nested,
  //     stamped by `expandComponent` regardless of depth). For this
  //     case we render Opacity + Hide bound to the WRAPPER's own
  //     styles (the user can set wrapper-level overrides).
  //
  //   - `isInsideComponentInstance` — the selected node is an INNER
  //     element of an expansion (`componentInstanceId` points back to
  //     the wrapper). The styles on this node belong to the
  //     component's MASTER file, not to the consuming page; surfacing
  //     them here would let the user "edit" master content from the
  //     wrong file. Worse, the inner element legitimately carries
  //     `styleVariables` (the master's `style={{ opacity: opacity }}`
  //     resolved into a binding) — if we mount OpacityControl with
  //     this node, the row paints as a same-named purple pill that
  //     the user never created. Visible bug: after hoisting a prop on
  //     a nested instance, "opacity / hide" show as purple `T opacity`
  //     / `T hide` pills in the Styles section even though the user
  //     hoisted something totally different.
  //
  // The user is expected to select the WRAPPER itself (the visible
  // bounding box) to edit instance-level styles. Click redirection
  // already takes care of this for fresh clicks via
  // `redirectToComponentInstance`; this gate handles the case where
  // a stale `selectedId` left over from before a re-parse points at
  // an inner element.
  const isComponentInstanceWrapper = !!node && !!node.isComponentInstance;
  const isInsideComponentInstance = !!node && !isComponentInstanceWrapper && !!node.componentInstanceId;
  const isComponentInstance = isComponentInstanceWrapper || isInsideComponentInstance;
  // A VECTOR SET instance (imported icon/vector). It's an opaque, live-rendered
  // code component, NOT an expanded instance, so it gets the SAME stripped panel
  // as a component-instance wrapper PLUS a standalone Rotate: Opacity, Visible,
  // Rotate — no box-model (padding/radius/margin/border/shadow), no Transform
  // tool, no anchor (the vector fills its own aspect-locked box; those would just
  // fight the master). The + offers only the wrapper-safe extras.
  const isVectorSet = !!node && isVectorSetComponentFile(node.componentFile);

  // ─── Detection ────────────────────────────────────────────────────────
  // A style is considered "set on this node" when any of its candidate
  // CSS keys is present:
  //   1. in the resolved styles for the current viewport (covers direct
  //      base-state writes AND the active replica's @media override),
  //   2. via `hasOverride` (any breakpoint at all, even ones we're not
  //      currently viewing — switching tablet/mobile shouldn't make the
  //      row disappear),
  //   3. inside a variant override (component master files only).
  // We check 1+2+3 so the row stays visible regardless of which
  // viewport/variant the user is currently on — otherwise switching the
  // active viewport would yank the row from under their cursor.
  const hasStyleAnywhere = useCallback(
    (keys: string[]): boolean => {
      for (const k of keys) {
        if (styles[k]) return true;
        if (hasOverride(k)) return true;
        if (node?.motionVariants) {
          for (const variantStyles of Object.values(node.motionVariants)) {
            if (variantStyles[k]) return true;
          }
        }
      }
      return false;
    },
    [styles, hasOverride, node],
  );

  const visibleIds = useMemo(() => {
    const set = new Set<string>();
    for (const spec of DYNAMIC_STYLES) {
      if (spec.requiresFrame && isText) continue;
      if (hasStyleAnywhere(spec.keys)) set.add(spec.id);
    }
    return set;
  }, [hasStyleAnywhere, isText]);

  // Pseudo: detected via the pseudo-rules atom, which already keys by
  // node id. Either ::before or ::after counts.
  const hasPseudo = !!(node && pseudoStyles.get(node.id));

  // ─── +-dropdown picker ────────────────────────────────────────────────
  // Positioned via plain absolute (right-0 + top-full) inside a relative
  // wrapper — matches the AnimationTool's AddEffectDropdown so the menu
  // appears directly under the +, not as a portal'd panel that sits to the
  // far left of the screen.
  const [pickerOpen, setPickerOpen] = useState(false);
  // Flip the picker ABOVE the + when there isn't room below, and fade it in on
  // the next frame (opacity 0 → 1) so the off-screen flip never shows as a
  // position jump — same behaviour as AnimationTool's AddEffectDropdown.
  const [pickerDir, setPickerDir] = useState<'up' | 'down'>('down');
  const [pickerVisible, setPickerVisible] = useState(false);
  const pickerBtnRef = useRef<HTMLButtonElement>(null);

  // Component instances get a curated subset of dynamic styles in the +
  // dropdown — only ones that compose cleanly with the master's internal
  // styling because they target the wrapper / render layer, not the
  // visual primitives the master owns (no Fill, Radius, Padding, Border,
  // Shadow, Transform → those would fight the master).
  const COMPONENT_INSTANCE_ALLOWED = new Set([
    'filter', 'backdropFilter', 'mask', 'pointerEvents', 'userSelect', 'zIndex', 'mixBlendMode',
  ]);

  // Only the styles that are currently hidden are addable — we don't want
  // a dropdown entry that just re-writes a value the row already shows.
  const addableSpecs = useMemo(
    () => DYNAMIC_STYLES.filter(s => {
      if (s.requiresFrame && isText) return false;
      // Vector sets get the same curated + as component instances (no Fill,
      // Radius, Padding, Border, Shadow, Transform — only wrapper-safe extras).
      if ((isComponentInstance || isVectorSet) && !COMPONENT_INSTANCE_ALLOWED.has(s.id)) return false;
      if (s.id === 'mixBlendMode') return false; // Appearance header owns blend mode.
      return !visibleIds.has(s.id);
    }),
    [visibleIds, isText, isComponentInstance, isVectorSet],
  );
  // Component instances also don't get the Pseudo-element entry — pseudo
  // rules attach to the master's children, not the wrapper. Hide it from
  // the + when an instance is selected.
  const showPseudoEntry = !isComponentInstance && !isVectorSet && !hasPseudo;
  const showAddButton = addableSpecs.length > 0 || showPseudoEntry;

  // Measure on open: pick up/down by available space (the Styles + sits low in a
  // tall panel and its menu can hold many entries), position, THEN fade in.
  useEffect(() => {
    if (!pickerOpen) { setPickerVisible(false); return; }
    if (!pickerBtnRef.current) return;
    const rect = pickerBtnRef.current.getBoundingClientRect();
    const itemCount = addableSpecs.length + (showPseudoEntry ? 1 : 0);
    const menuHeight = Math.min(itemCount * 32 + 12, 360); // matches max-h below
    setPickerDir(window.innerHeight - rect.bottom >= menuHeight ? 'down' : 'up');
    requestAnimationFrame(() => setPickerVisible(true));
  }, [pickerOpen, addableSpecs.length, showPseudoEntry]);

  const handleAdd = useCallback(
    (spec: DynamicStyleSpec) => {
      trace.action('styles-tool:add-dynamic', { id: spec.id });
      updateMultipleStyles(spec.defaultStyles);
      setPickerOpen(false);
    },
    [updateMultipleStyles],
  );

  // Pseudo entry triggers the PseudoElementControl's own popup — but we
  // need to ensure the row is visible first. Easiest: write a no-op
  // ::before rule. The pseudo control then shows the row with that rule
  // and the user can configure it from there.
  const handleAddPseudo = useCallback(() => {
    if (!node) return;
    trace.action('styles-tool:add-pseudo', { nodeId: node.id });
    // Mutation: updatePseudoStyle with an empty content rule so the row
    // appears. The PseudoElementControl picks up the new rule via
    // pseudoStylesAtom on the next flush.
    import('@/code/mutation/mutation-queue').then(({ queueMutation }) => {
      queueMutation({
        type: 'updatePseudoStyle',
        nodeId: node.id,
        pseudo: 'before',
        styles: { content: '""' },
      });
    });
    setPickerOpen(false);
  }, [node]);

  // ─── Figma inspector composition ───────────────────────────────────────
  const showAppearance = scope !== 'advanced';
  const showAdvanced = scope !== 'appearance';

  const addAction = showAddButton ? (
    <div className="relative">
      <button
        ref={pickerBtnRef}
        onClick={(e) => { e.stopPropagation(); setPickerOpen(o => !o); trace.action('styles-tool:toggle-picker', { open: !pickerOpen }); }}
        className="flex items-center justify-end pl-[80px] -ml-[80px] cursor-pointer group text-[var(--text-primary)]"
        title="Add property"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-opacity group-hover:opacity-80">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      {pickerOpen && (
        <>
          <div className="fixed inset-0 z-[10000]" onClick={() => setPickerOpen(false)} />
          <div
            className={`absolute right-[10px] ${pickerDir === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'} bg-[var(--dropdown-bg)] shadow-[var(--shadow-lg)] cut-corners cut-lg cut-border [--cut-border-color:var(--border-light)] py-1.5 z-[10001] w-max max-h-[360px] overflow-y-auto border border-[var(--border-light)] space-y-0.5 transition-opacity duration-150`}
            style={{ opacity: pickerVisible ? 1 : 0, scrollbarWidth: 'none' }}
          >
            {addableSpecs.length === 0 && !showPseudoEntry && (
              <div className="px-3 py-2 text-xs text-[var(--text-disabled)]">All properties already added</div>
            )}
            {addableSpecs.map(spec => (
              <button
                key={spec.id}
                onClick={() => handleAdd(spec)}
                className="group flex items-center mx-1.5 px-2.5 py-1.5 cut-corners w-[calc(100%-12px)] text-left cursor-pointer whitespace-nowrap hover:bg-[var(--accent)] transition-colors"
              >
                <span className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-fg)]">
                  {spec.label}
                </span>
              </button>
            ))}
            {showPseudoEntry && (
              <button
                onClick={handleAddPseudo}
                className="group flex items-center mx-1.5 px-2.5 py-1.5 cut-corners w-[calc(100%-12px)] text-left cursor-pointer whitespace-nowrap hover:bg-[var(--accent)] transition-colors"
              >
                <span className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-fg)]">
                  Pseudo Element
                </span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  ) : null;

  const addFill = useCallback(() => {
    const existing = parseBackgroundLayers(styles);
    if (existing.length > 0) {
      updateMultipleStyles(formatBackgroundLayers([createDefaultLayer('color'), ...existing]));
      return;
    }
    if (styles.backgroundColor && styles.backgroundColor !== 'transparent') {
      const current = createDefaultLayer('color');
      current.value = `linear-gradient(${styles.backgroundColor}, ${styles.backgroundColor})`;
      updateMultipleStyles(formatBackgroundLayers([createDefaultLayer('color'), current]));
      return;
    }
    updateStyle('backgroundColor', '#FFFFFF');
  }, [styles, updateStyle, updateMultipleStyles]);

  const hasStroke = !!(styles.border || styles.borderWidth || styles.borderColor);
  const addStroke = useCallback(() => {
    if (hasStroke) return;
    updateMultipleStyles({ borderWidth: '1px', borderStyle: 'solid', borderColor: '#000000' });
  }, [hasStroke, updateMultipleStyles]);

  const addEffect = useCallback(() => {
    const current = (styles.boxShadow || '').trim();
    const next = '0 4px 8px rgba(0, 0, 0, 0.25)';
    updateStyle('boxShadow', current && current !== 'none' ? `${current}, ${next}` : next);
  }, [styles.boxShadow, updateStyle]);

  // Inner nodes of an expanded component instance belong to the master.
  if (isInsideComponentInstance) return null;

  // SVG groups keep a deliberately small Figma-shaped surface.
  if (isSvgGroup) {
    if (!showAppearance) return null;
    trace.action('styles-tool:render-group', { nodeId: node!.id, childCount: node!.children?.length ?? 0 });
    return (
      <>
        <ToolSection title="Appearance" action={<AppearanceHeaderActions />}>
          <OpacityControl />
        </ToolSection>
        <ToolDivider />
        <ToolSection title="Fill">
          <GroupFillControl />
        </ToolSection>
      </>
    );
  }

  const isWrapper = isComponentInstanceWrapper || isVectorSet;

  return (
    <>
      {showAppearance && (
        <>
          <ToolSection title="Appearance" action={<AppearanceHeaderActions canHide={!isViewportFrame} />}>
            <OpacityControl />
            {!isText && !isWrapper && <RadiusControl />}
          </ToolSection>

          {!isText && !isWrapper && (
            <>
              <ToolDivider />
              <ToolSection title="Fill" action={<StyleSectionActions property="backgroundColor" onAdd={addFill} addTitle="Add fill" />}>
                <FillControl />
              </ToolSection>
              <ToolDivider />
              <ToolSection title="Stroke" action={<StyleSectionActions property="border" onAdd={addStroke} addDisabled={hasStroke} addTitle="Add stroke" />}>
                <BorderControl />
              </ToolSection>
              <ToolDivider />
              <ToolSection title="Effects" action={<StyleSectionActions property="boxShadow" onAdd={addEffect} addTitle="Add effect" />}>
                <ShadowControl />
                {visibleIds.has('mask') && <MaskControl />}
                {visibleIds.has('clipPath') && <ClipPathControl />}
                {visibleIds.has('filter') && <FilterControl />}
                {visibleIds.has('backdropFilter') && <BackdropFilterControl />}
              </ToolSection>
            </>
          )}

          {isWrapper && (
            <>
              {(visibleIds.has('mask') || visibleIds.has('filter') || visibleIds.has('backdropFilter')) && <ToolDivider />}
              {(visibleIds.has('mask') || visibleIds.has('filter') || visibleIds.has('backdropFilter')) && (
                <ToolSection title="Effects">
                  {visibleIds.has('mask') && <MaskControl />}
                  {visibleIds.has('filter') && <FilterControl />}
                  {visibleIds.has('backdropFilter') && <BackdropFilterControl />}
                </ToolSection>
              )}
            </>
          )}
        </>
      )}

      {showAdvanced && (
        <>
          <ToolSection title="Advanced" collapsible defaultOpen={false} action={addAction}>
            {!isWrapper && <VariantTransitionControl />}
            {!isViewportFrame && <MarginControl />}
            {!isWrapper && <OverflowControl />}
            {!isWrapper && visibleIds.has('overflowX') && <OverflowXControl />}
            {!isWrapper && visibleIds.has('overflowY') && <OverflowYControl />}
            {!isWrapper && <FormStateControl />}
            {isText && !isWrapper && <BorderControl />}
            {!isWrapper && <TransformControl />}
            {!isWrapper && visibleIds.has('backfaceVisibility') && <BackfaceControl />}
            {visibleIds.has('zIndex') && <ZIndexControl />}
            {visibleIds.has('pointerEvents') && <PointerEventsControl />}
            {visibleIds.has('userSelect') && <UserSelectControl />}
            {!isWrapper && hasPseudo && <PseudoElementControl />}
          </ToolSection>
        </>
      )}
    </>
  );
}
