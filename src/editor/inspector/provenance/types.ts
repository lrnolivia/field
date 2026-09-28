export type InspectorSourceScope =
  | { kind: 'base' }
  | { kind: 'responsive'; maxWidth: number | null }
  | { kind: 'component-variant'; variant: string }
  | { kind: 'component-instance'; instanceId: string }
  | { kind: 'locale'; locale: string | null };

export type InspectorReadSource =
  | { kind: 'local' }
  | { kind: 'responsive'; maxWidth: number | null }
  | { kind: 'component-variant'; variant: string }
  | { kind: 'conditional-variant'; variant: string }
  | { kind: 'component-instance'; instanceId: string; inheritedFromMaster: boolean }
  | { kind: 'variable'; ref: string; scope: InspectorSourceScope }
  | { kind: 'preset'; ref: string; scope: InspectorSourceScope }
  | { kind: 'cms'; ref: string | null; scope: InspectorSourceScope }
  | { kind: 'locale'; locale: string | null }
  | { kind: 'inherited'; from: string | null }
  | { kind: 'computed-only'; reason: string }
  | { kind: 'animation-bound'; ref: string };

export type InspectorWriteTarget =
  | { kind: 'node-base-style'; nodeId: string | null }
  | { kind: 'responsive-band'; nodeId: string | null; maxWidth: number | null }
  | { kind: 'component-variant-style'; nodeId: string | null; variant: string }
  | { kind: 'component-variant-conditional'; nodeId: string | null; variant: string }
  | { kind: 'component-instance-override'; nodeId: string | null; instanceId: string }
  | { kind: 'variable-binding'; ref: string; scope: InspectorSourceScope }
  | { kind: 'preset-binding'; ref: string; scope: InspectorSourceScope }
  | { kind: 'cms-binding'; ref: string | null; scope: InspectorSourceScope }
  | { kind: 'locale-override'; nodeId: string | null; locale: string | null }
  | { kind: 'read-only'; reason: string };

export type InspectorResetAction =
  | { kind: 'remove-responsive-override'; maxWidth: number | null }
  | { kind: 'remove-component-variant-override'; variant: string }
  | { kind: 'remove-instance-override'; instanceId: string }
  | { kind: 'remove-locale-override'; locale: string | null }
  | { kind: 'detach-variable'; ref: string }
  | { kind: 'detach-preset'; ref: string }
  | { kind: 'unbind-cms'; ref: string | null }
  | { kind: 'remove-cms-variant-override'; variant: string };

export interface InspectorBinding {
  kind: 'variable' | 'preset' | 'cms' | 'animation';
  ref: string | null;
}

export interface InspectorPropertyResolution {
  property: string;
  read: {
    value: string;
    source: InspectorReadSource;
    inherited: boolean;
    mixed: boolean;
  };
  write: {
    target: InspectorWriteTarget;
    editable: boolean;
    reason?: string;
  };
  reset: InspectorResetAction | null;
  binding: InspectorBinding | null;
}

export interface InspectorPropertyResolutionFacts {
  property: string;
  effectiveValue: string;
  nodeId?: string | null;
  hasAuthoredBase?: boolean;
  baseValue?: string;
  responsive?: { active: boolean; hasOwnValue: boolean; maxWidth: number | null };
  componentVariant?: {
    active: boolean;
    variant: string;
    hasOwnValue: boolean;
    conditional: boolean;
  };
  componentInstance?: {
    active: boolean;
    instanceId: string;
    hasOwnValue: boolean;
  };
  variableRef?: string | null;
  presetRef?: string | null;
  cms?: {
    ref: string | null;
    active: boolean;
    variantOverride?: boolean;
    variant?: string | null;
  };
  locale?: { active: boolean; locale: string | null };
  animationBoundBy?: string | null;
  inheritedValue?: string | null;
  inheritedFrom?: string | null;
  computedValue?: string | null;
  computedReason?: string;
  editable?: boolean;
}

export interface InspectorMultiPropertyResolution {
  property: string;
  value: string;
  mixed: boolean;
  editable: boolean;
  targetKind: InspectorWriteTarget['kind'] | null;
  reason?: string;
  members: InspectorPropertyResolution[];
}
