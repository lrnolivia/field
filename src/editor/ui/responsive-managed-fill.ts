import { useAtomValue } from 'jotai';
import type { CanvasNode } from '@/code/parsing/parser';
import { activeComponentVariantAtom, interactingViewportIdAtom, visibleViewportsAtom } from '@/code/stores/viewport-store';
import { queueMutation } from '@/code/mutation/mutation-queue';
import type { BreakpointFillEdit, FillBreakpoint } from '@/code/generation/responsive-managed-fill';
import { breakpointFill, breakpointVideo } from '@/shared/managed-fill-breakpoints';

export interface ManagedFillScope {
  target: FillBreakpoint;
  replicas: FillBreakpoint[];
}

export function useManagedFillScope(node: CanvasNode | null | undefined): ManagedFillScope | null {
  const viewports = useAtomValue(visibleViewportsAtom);
  const activeId = useAtomValue(interactingViewportIdAtom);
  const variant = useAtomValue(activeComponentVariantAtom);
  const primary = viewports.find(viewport => viewport.isPrimary) ?? viewports[0];
  const active = viewports.find(viewport => viewport.id === activeId);
  if (!node || !primary || !active || variant !== null || node.isCanvasNode || primary.width === 0) return null;
  if (viewports.length < 2 && !breakpointFill(node, '')) return null;
  return {
    target: { id: active === primary ? '' : active.id, width: active.width },
    replicas: viewports.filter(viewport => viewport !== primary).map(({ id, width }) => ({ id, width })),
  };
}

export function resolveManagedFillNode(node: CanvasNode | null | undefined, scope: ManagedFillScope | null): CanvasNode | null {
  if (!node) return null;
  const fill = scope ? breakpointFill(node, scope.target.id) : undefined;
  if (!fill || !scope) return node;
  const attrs = { ...node.attrs };
  delete attrs['data-field-pattern'];
  delete attrs['data-field-shader-fill'];
  if (fill.kind === 'pattern') attrs['data-field-pattern'] = fill.recipe;
  if (fill.kind === 'shader') attrs['data-field-shader-fill'] = 'true';
  return { ...node, attrs, bgVideo: breakpointVideo(node, scope.target.id) };
}

export function updateScopedFill(nodeId: string, scope: ManagedFillScope, edit: BreakpointFillEdit): void {
  queueMutation({ type: 'editBreakpointFill', nodeId, ...scope, edit });
}
