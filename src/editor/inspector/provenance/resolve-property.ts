import type {
  InspectorPropertyResolution,
  InspectorPropertyResolutionFacts,
  InspectorReadSource,
  InspectorResetAction,
  InspectorSourceScope,
  InspectorWriteTarget,
} from './types';

export function presetRefFromValue(value: string): string | null {
  const match = value.trim().match(/^var\(\s*--([^) ,]+)\s*(?:,[^)]+)?\)$/);
  return match?.[1] ?? null;
}

/** Short provenance hint for a property label without exposing mutation internals. */
export function inspectorPropertyTooltip(resolution: InspectorPropertyResolution): string | undefined {
  const { source, inherited } = resolution.read;
  const label = (() => {
    switch (source.kind) {
      case 'responsive': return `Responsive ${source.maxWidth ?? ''}`.trim();
      case 'component-variant': return `Component variant ${source.variant}`;
      case 'conditional-variant': return `Variant condition ${source.variant}`;
      case 'component-instance': return 'Component instance';
      case 'variable': return `Variable ${source.ref}`;
      case 'preset': return `Preset ${source.ref}`;
      case 'cms': return `CMS field ${source.ref ?? ''}`.trim();
      case 'locale': return `Locale ${source.locale ?? ''}`.trim();
      case 'animation-bound': return `Animation ${source.ref}`;
      case 'computed-only': return 'Computed CSS';
      default: return undefined;
    }
  })();
  if (!label) return undefined;
  if (!resolution.write.editable) return `${label} · ${resolution.write.reason ?? 'Read only'}`;
  return inherited ? `${label} · Inherited here` : label;
}

function currentScope(facts: InspectorPropertyResolutionFacts): InspectorSourceScope {
  if (facts.componentVariant?.active) return { kind: 'component-variant', variant: facts.componentVariant.variant };
  if (facts.responsive?.active) return { kind: 'responsive', maxWidth: facts.responsive.maxWidth };
  if (facts.locale?.active) return { kind: 'locale', locale: facts.locale.locale };
  if (facts.componentInstance?.active) return { kind: 'component-instance', instanceId: facts.componentInstance.instanceId };
  return { kind: 'base' };
}

function result(
  facts: InspectorPropertyResolutionFacts,
  source: InspectorReadSource,
  target: InspectorWriteTarget,
  reset: InspectorResetAction | null,
  binding: InspectorPropertyResolution['binding'],
  value = facts.effectiveValue,
  inherited = false,
  editable = facts.editable !== false && target.kind !== 'read-only',
  reason?: string,
): InspectorPropertyResolution {
  return {
    property: facts.property,
    read: { value, source, inherited, mixed: false },
    write: {
      target,
      editable,
      ...(reason ? { reason } : {}),
    },
    reset,
    binding,
  };
}

export function resolvePropertyResolution(
  facts: InspectorPropertyResolutionFacts,
): InspectorPropertyResolution {
  const scope = currentScope(facts);

  if (facts.animationBoundBy) {
    const reason = 'Controlled by ' + facts.animationBoundBy + '.';
    return result(
      facts,
      { kind: 'animation-bound', ref: facts.animationBoundBy },
      { kind: 'read-only', reason },
      null,
      { kind: 'animation', ref: facts.animationBoundBy },
      facts.effectiveValue,
      false,
      false,
      reason,
    );
  }

  if (facts.variableRef) {
    const reason = 'Value is variable-bound. Detach or edit the variable explicitly.';
    return result(
      facts,
      { kind: 'variable', ref: facts.variableRef, scope },
      { kind: 'variable-binding', ref: facts.variableRef, scope },
      { kind: 'detach-variable', ref: facts.variableRef },
      { kind: 'variable', ref: facts.variableRef },
      facts.effectiveValue,
      false,
      false,
      reason,
    );
  }

  const presetRef = facts.presetRef ?? presetRefFromValue(facts.effectiveValue);
  if (presetRef) {
    const reason = 'Value is preset-bound. Detach or edit the preset explicitly.';
    return result(
      facts,
      { kind: 'preset', ref: presetRef, scope },
      { kind: 'preset-binding', ref: presetRef, scope },
      { kind: 'detach-preset', ref: presetRef },
      { kind: 'preset', ref: presetRef },
      facts.effectiveValue,
      false,
      false,
      reason,
    );
  }

  if (facts.cms?.active) {
    const cmsScope: InspectorSourceScope = facts.cms.variantOverride && facts.cms.variant
      ? { kind: 'component-variant', variant: facts.cms.variant }
      : scope;
    const reset: InspectorResetAction = facts.cms.variantOverride && facts.cms.variant
      ? { kind: 'remove-cms-variant-override', variant: facts.cms.variant }
      : { kind: 'unbind-cms', ref: facts.cms.ref };
    const reason = 'Value is CMS-bound. Unbind or edit the CMS binding explicitly.';
    return result(
      facts,
      { kind: 'cms', ref: facts.cms.ref, scope: cmsScope },
      { kind: 'cms-binding', ref: facts.cms.ref, scope: cmsScope },
      reset,
      { kind: 'cms', ref: facts.cms.ref },
      facts.effectiveValue,
      false,
      false,
      reason,
    );
  }

  if (facts.componentVariant?.active && facts.componentVariant.hasOwnValue) {
    const variant = facts.componentVariant.variant;
    if (facts.componentVariant.conditional) {
      return result(
        facts,
        { kind: 'conditional-variant', variant },
        { kind: 'component-variant-conditional', nodeId: facts.nodeId ?? null, variant },
        { kind: 'remove-component-variant-override', variant },
        null,
      );
    }
    return result(
      facts,
      { kind: 'component-variant', variant },
      { kind: 'component-variant-style', nodeId: facts.nodeId ?? null, variant },
      { kind: 'remove-component-variant-override', variant },
      null,
    );
  }

  if (facts.responsive?.active) {
    const target: InspectorWriteTarget = {
      kind: 'responsive-band',
      nodeId: facts.nodeId ?? null,
      maxWidth: facts.responsive.maxWidth,
    };
    if (facts.responsive.hasOwnValue) {
      return result(
        facts,
        { kind: 'responsive', maxWidth: facts.responsive.maxWidth },
        target,
        { kind: 'remove-responsive-override', maxWidth: facts.responsive.maxWidth },
        null,
      );
    }
    return result(
      facts,
      { kind: 'inherited', from: 'base' },
      target,
      null,
      null,
      facts.effectiveValue,
      true,
    );
  }

  if (facts.componentVariant?.active && !facts.componentVariant.hasOwnValue) {
    const variant = facts.componentVariant.variant;
    const target: InspectorWriteTarget = facts.componentVariant.conditional
      ? { kind: 'component-variant-conditional', nodeId: facts.nodeId ?? null, variant }
      : { kind: 'component-variant-style', nodeId: facts.nodeId ?? null, variant };
    return result(
      facts,
      { kind: 'inherited', from: 'component-default' },
      target,
      null,
      null,
      facts.effectiveValue,
      true,
    );
  }

  if (facts.locale?.active) {
    return result(
      facts,
      { kind: 'locale', locale: facts.locale.locale },
      { kind: 'locale-override', nodeId: facts.nodeId ?? null, locale: facts.locale.locale },
      { kind: 'remove-locale-override', locale: facts.locale.locale },
      null,
    );
  }

  if (facts.componentInstance?.active) {
    const target: InspectorWriteTarget = {
      kind: 'component-instance-override',
      nodeId: facts.nodeId ?? null,
      instanceId: facts.componentInstance.instanceId,
    };
    if (facts.componentInstance.hasOwnValue) {
      return result(
        facts,
        {
          kind: 'component-instance',
          instanceId: facts.componentInstance.instanceId,
          inheritedFromMaster: false,
        },
        target,
        { kind: 'remove-instance-override', instanceId: facts.componentInstance.instanceId },
        null,
      );
    }
    return result(
      facts,
      { kind: 'inherited', from: 'component-master' },
      target,
      null,
      null,
      facts.effectiveValue,
      true,
    );
  }

  if (facts.hasAuthoredBase) {
    return result(
      facts,
      { kind: 'local' },
      { kind: 'node-base-style', nodeId: facts.nodeId ?? null },
      null,
      null,
      facts.baseValue ?? facts.effectiveValue,
    );
  }

  if (facts.inheritedValue != null) {
    const reason = 'Rendered value is inherited and its authored owner is outside the selected node.';
    return result(
      facts,
      { kind: 'inherited', from: facts.inheritedFrom ?? null },
      { kind: 'read-only', reason },
      null,
      null,
      facts.inheritedValue,
      true,
      false,
      reason,
    );
  }

  if (facts.computedValue != null) {
    const reason = facts.computedReason
      ?? 'Rendered value is computed, but field cannot identify a deterministic authored owner.';
    return result(
      facts,
      { kind: 'computed-only', reason },
      { kind: 'read-only', reason },
      null,
      null,
      facts.computedValue,
      false,
      false,
      reason,
    );
  }

  return result(
    facts,
    { kind: 'local' },
    { kind: 'node-base-style', nodeId: facts.nodeId ?? null },
    null,
    null,
  );
}
