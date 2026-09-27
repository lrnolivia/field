import type {
  InspectorMultiPropertyResolution,
  InspectorPropertyResolution,
  InspectorWriteTarget,
} from './types';

function targetSignature(target: InspectorWriteTarget): string {
  switch (target.kind) {
    case 'responsive-band':
      return target.kind + ':' + (target.maxWidth ?? 'unknown');
    case 'component-variant-style':
    case 'component-variant-conditional':
      return target.kind + ':' + target.variant;
    case 'variable-binding':
    case 'preset-binding':
      return target.kind + ':' + target.ref;
    case 'cms-binding':
      return target.kind + ':' + (target.ref ?? 'unknown');
    case 'locale-override':
      return target.kind + ':' + (target.locale ?? 'unknown');
    case 'read-only':
      return target.kind;
    case 'node-base-style':
    case 'component-instance-override':
      return target.kind;
  }
}

export function resolveMultiSelection(
  members: InspectorPropertyResolution[],
): InspectorMultiPropertyResolution {
  if (members.length === 0) {
    return {
      property: '',
      value: '',
      mixed: false,
      editable: false,
      targetKind: null,
      reason: 'No selected properties to resolve.',
      members,
    };
  }

  const property = members[0].property;
  const values = new Set(members.map((m) => m.read.value));
  const mixed = values.size > 1;
  const signatures = new Set(members.map((m) => targetSignature(m.write.target)));
  const sameTargetClass = signatures.size === 1;
  const allEditable = members.every((m) => m.write.editable);

  let reason: string | undefined;
  if (!sameTargetClass) {
    reason = 'Selected objects resolve this property to incompatible write targets.';
  } else if (!allEditable) {
    reason = members.find((m) => !m.write.editable)?.write.reason
      ?? 'At least one selected value is read-only.';
  }

  return {
    property,
    value: mixed ? '' : members[0].read.value,
    mixed,
    editable: sameTargetClass && allEditable,
    targetKind: sameTargetClass ? members[0].write.target.kind : null,
    reason,
    members,
  };
}
