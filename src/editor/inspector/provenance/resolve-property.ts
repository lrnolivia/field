import type { CanvasNode } from '@/code/parsing/parser';
import type { ContainerOverrideMap } from '@/code/stores/container-query-store';
import { getOverridesAtWidth } from '@/code/stores/container-query-store';

export type InspectorReadSource =
  | 'local' | 'responsive' | 'component-variant' | 'conditional-variant'
  | 'component-instance' | 'variable' | 'preset' | 'cms' | 'locale'
  | 'inherited' | 'computed-only' | 'animation-bound';

export type InspectorWriteTarget =
  | 'node-base-style' | 'responsive-band' | 'component-variant-style'
  | 'component-variant-conditional' | 'component-instance-override'
  | 'variable-binding' | 'preset-binding' | 'cms-binding'
  | 'locale-override' | 'read-only';

export interface InspectorPropertyResolution {
  property: string;
  read: { value: string; source: InspectorReadSource; inherited: boolean; mixed: boolean; detail?: string };
  write: { target: InspectorWriteTarget; editable: boolean; reason?: string; detail?: string };
  reset: { target: InspectorWriteTarget; detail?: string } | null;
  binding: { kind: 'variable' | 'preset' | 'cms'; ref: string } | null;
}

export interface PropertyResolutionInput {
  property: string;
  node: CanvasNode | null;
  /** The provider's already merged value is authoritative; this resolver does not rebuild its cascade. */
  effectiveValue: string | undefined;
  computedValue?: string;
  overrides?: ContainerOverrideMap;
  isReplica?: boolean;
  viewportWidth?: number;
  isComponentFile?: boolean;
  variant?: string | null;
  locale?: string | null;
  localeValue?: string;
  cmsField?: string | null;
  animationOwner?: string | null;
  /** Existing getValueSource result, which already accounts for variable detach/override rules. */
  valueSource?: { source: 'inline' | 'prop' | 'token'; ref: string | null };
}

function bandEntry<T>(values: Record<number, T> | undefined | null, floors: Record<number, number> | undefined | null, width: number): { width: number; value: T } | null {
  if (!values) return null;
  for (const max of Object.keys(values).map(Number).sort((a, b) => a - b)) {
    if (width <= max && width >= (floors?.[max] ?? 0)) return { width: max, value: values[max] };
  }
  return null;
}

/** Describe the current provider value and the existing mutation route without writing source. */
export function resolveInspectorProperty(input: PropertyResolutionInput): InspectorPropertyResolution {
  const { property, node } = input;
  const authoredValue = input.effectiveValue;
  const value = authoredValue ?? input.computedValue ?? '';
  const make = (
    source: InspectorReadSource, target: InspectorWriteTarget, detail?: string,
    binding: InspectorPropertyResolution['binding'] = null,
    reset: InspectorPropertyResolution['reset'] = null,
    reason?: string,
  ): InspectorPropertyResolution => ({
    property,
    read: { value, source, inherited: source === 'inherited', mixed: false, ...(detail ? { detail } : {}) },
    write: { target, editable: target !== 'read-only' && target !== 'variable-binding' && target !== 'preset-binding' && target !== 'cms-binding', ...(detail ? { detail } : {}), ...(reason ? { reason } : {}) },
    reset,
    binding,
  });

  if (!node) return make('computed-only', 'read-only', undefined, null, null, 'Selection has no resolved node');
  if (input.animationOwner) return make('animation-bound', 'read-only', input.animationOwner, null, null, 'Edit the animation that owns this property');

  const variant = input.isComponentFile ? input.variant : null;
  const variantStyle = variant ? node.motionVariants?.[variant] : undefined;
  const conditional = variant ? node.conditionalStyles?.[property] : undefined;
  const variantCms = variant && variant !== 'default' ? node.variantBindings?.style?.[variant]?.[property] : undefined;
  const responsive = input.isReplica && input.viewportWidth
    ? bandEntry(node.responsiveStyleValues?.[property], node.responsiveStyleBands?.[property], input.viewportWidth)
    : null;
  const mediaValue = input.isReplica && input.viewportWidth && input.overrides
    ? getOverridesAtWidth(input.overrides, node.id, input.viewportWidth).get(property)
    : undefined;
  const localeOwns = input.localeValue !== undefined;
  const variable = input.valueSource?.source === 'prop' && input.valueSource.ref;
  const preset = input.valueSource?.source === 'token' && input.valueSource.ref;

  // A binding is still the owner when the provider displays its resolved literal.
  // Explicit variant/media literals detach a base binding on just that scope.
  if (variantCms && 'field' in variantCms) return make('cms', 'cms-binding', variantCms.field, { kind: 'cms', ref: variantCms.field }, { target: 'cms-binding', detail: variant ?? undefined });
  if (input.cmsField && !variantCms) return make('cms', 'cms-binding', input.cmsField, { kind: 'cms', ref: input.cmsField }, null);
  if (variable) return make('variable', 'variable-binding', variable, { kind: 'variable', ref: variable }, null);
  if (preset) return make('preset', 'preset-binding', preset, { kind: 'preset', ref: preset }, null);

  if (variantCms && 'value' in variantCms) return make('cms', 'component-variant-style', variant ?? undefined, null, { target: 'component-variant-style', detail: variant ?? undefined });
  if (conditional && variant && variant in conditional) return make('conditional-variant', 'component-variant-conditional', variant, null, { target: 'component-variant-conditional', detail: variant });
  if (variantStyle && property in variantStyle) return make('component-variant', 'component-variant-style', variant!, null, variant !== 'default' ? { target: 'component-variant-style', detail: variant! } : null);
  if (mediaValue !== undefined || responsive) return make('responsive', 'responsive-band', String(input.viewportWidth), null, { target: 'responsive-band', detail: String(input.viewportWidth) });
  if (localeOwns) return make('locale', 'locale-override', input.locale ?? undefined, null, { target: 'locale-override', detail: input.locale ?? undefined });

  // An instance's resolved style may originate in its master. Do not claim it is locally authored.
  if (node.componentInstanceId || node.isComponentInstance) {
    return make('component-instance', 'component-instance-override', node.componentInstanceId ?? node.id);
  }
  if (variant && variant !== 'default') return make('inherited', 'component-variant-style', variant);
  if (input.isReplica && input.viewportWidth) return make('inherited', 'responsive-band', String(input.viewportWidth));
  if (authoredValue !== undefined && property in node.styles) return make('local', 'node-base-style');
  if (authoredValue !== undefined && property in (node.motionVariants?.default ?? {})) return make('component-variant', 'component-variant-style', 'default');
  if (authoredValue !== undefined) return make('inherited', 'read-only', undefined, null, null, 'Authored source for the effective value is unresolved');
  if (input.computedValue !== undefined) return make('computed-only', 'read-only', undefined, null, null, 'Computed CSS has no resolved authored owner');
  return make('local', 'node-base-style'); // empty field: creating a new local property is intentional
}

export function resolveMultiSelection(property: string, members: InspectorPropertyResolution[]): InspectorPropertyResolution {
  if (members.length === 0) return resolveInspectorProperty({ property, node: null, effectiveValue: undefined });
  const first = members[0];
  const mixed = members.some(member => member.read.value !== first.read.value);
  const compatible = members.every(member => member.write.editable && member.write.target === first.write.target && member.write.detail === first.write.detail);
  return {
    property,
    read: { ...first.read, value: mixed ? '' : first.read.value, mixed },
    write: compatible ? first.write : { target: 'read-only', editable: false, reason: 'Selection has incompatible or read-only write targets' },
    reset: compatible && members.every(member => member.reset?.target === first.reset?.target) ? first.reset : null,
    binding: members.every(member => member.binding?.kind === first.binding?.kind && member.binding?.ref === first.binding?.ref) ? first.binding : null,
  };
}
