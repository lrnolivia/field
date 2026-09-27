import { describe, expect, it } from 'vitest';
import { resolveMultiSelection, resolvePropertyResolution } from '.';

const base = {
  property: 'backgroundColor',
  effectiveValue: '#111111',
  nodeId: 'node-1',
};

describe('Inspector property provenance', () => {
  it('resolves a local authored style to the base node write target', () => {
    const r = resolvePropertyResolution({ ...base, hasAuthoredBase: true, baseValue: '#111111' });
    expect(r.read.source.kind).toBe('local');
    expect(r.write.target.kind).toBe('node-base-style');
    expect(r.write.editable).toBe(true);
  });

  it('preserves variable identity even when the displayed value is already resolved', () => {
    const r = resolvePropertyResolution({ ...base, variableRef: 'brandColor' });
    expect(r.read.source).toMatchObject({ kind: 'variable', ref: 'brandColor' });
    expect(r.write.target.kind).toBe('variable-binding');
    expect(r.write.editable).toBe(false);
    expect(r.reset).toEqual({ kind: 'detach-variable', ref: 'brandColor' });
  });

  it('recognizes exact CSS custom-property preset references', () => {
    const r = resolvePropertyResolution({ ...base, effectiveValue: 'var(--color-brand)' });
    expect(r.read.source).toMatchObject({ kind: 'preset', ref: 'color-brand' });
    expect(r.write.target.kind).toBe('preset-binding');
    expect(r.write.editable).toBe(false);
  });

  it('resolves an active responsive literal override to its band', () => {
    const r = resolvePropertyResolution({
      ...base,
      responsive: { active: true, hasOwnValue: true, maxWidth: 768 },
    });
    expect(r.read.source).toEqual({ kind: 'responsive', maxWidth: 768 });
    expect(r.write.target).toMatchObject({ kind: 'responsive-band', maxWidth: 768 });
    expect(r.reset).toEqual({ kind: 'remove-responsive-override', maxWidth: 768 });
  });

  it('keeps an inherited responsive base local when the band has no own value', () => {
    const r = resolvePropertyResolution({
      ...base,
      hasAuthoredBase: true,
      responsive: { active: false, hasOwnValue: false, maxWidth: 768 },
    });
    expect(r.read.source.kind).toBe('local');
    expect(r.write.target.kind).toBe('node-base-style');
  });

  it('keeps replica read truth inherited while routing a new edit to the active responsive band', () => {
    const r = resolvePropertyResolution({
      ...base,
      responsive: { active: true, hasOwnValue: false, maxWidth: 768 },
      hasAuthoredBase: true,
    });
    expect(r.read.source).toEqual({ kind: 'inherited', from: 'base' });
    expect(r.read.inherited).toBe(true);
    expect(r.write.target).toMatchObject({ kind: 'responsive-band', maxWidth: 768 });
    expect(r.reset).toBeNull();
  });

  it('resolves component variant object ownership', () => {
    const r = resolvePropertyResolution({
      ...base,
      componentVariant: { active: true, variant: 'variant-2', hasOwnValue: true, conditional: false },
    });
    expect(r.read.source).toEqual({ kind: 'component-variant', variant: 'variant-2' });
    expect(r.write.target.kind).toBe('component-variant-style');
  });

  it('keeps a non-default variant inherited until the first scoped edit', () => {
    const r = resolvePropertyResolution({
      ...base,
      componentVariant: { active: true, variant: 'variant-2', hasOwnValue: false, conditional: false },
      hasAuthoredBase: true,
    });
    expect(r.read.source).toEqual({ kind: 'inherited', from: 'component-default' });
    expect(r.write.target).toMatchObject({ kind: 'component-variant-style', variant: 'variant-2' });
    expect(r.reset).toBeNull();
  });

  it('distinguishes conditional variant ownership', () => {
    const r = resolvePropertyResolution({
      ...base,
      componentVariant: { active: true, variant: 'variant-2', hasOwnValue: true, conditional: true },
    });
    expect(r.read.source).toEqual({ kind: 'conditional-variant', variant: 'variant-2' });
    expect(r.write.target.kind).toBe('component-variant-conditional');
  });

  it('treats an expanded component child as inherited read truth with an instance override write target', () => {
    const r = resolvePropertyResolution({
      ...base,
      componentInstance: { active: true, instanceId: 'card-1', hasOwnValue: false },
    });
    expect(r.read.source).toEqual({ kind: 'inherited', from: 'component-master' });
    expect(r.read.inherited).toBe(true);
    expect(r.write.target).toMatchObject({ kind: 'component-instance-override', instanceId: 'card-1' });
    expect(r.write.editable).toBe(true);
  });

  it('surfaces a literal instance override separately from component inheritance', () => {
    const r = resolvePropertyResolution({
      ...base,
      componentInstance: { active: true, instanceId: 'card-1', hasOwnValue: true },
    });
    expect(r.read.source).toMatchObject({ kind: 'component-instance', inheritedFromMaster: false });
    expect(r.reset).toEqual({ kind: 'remove-instance-override', instanceId: 'card-1' });
  });

  it('resolves locale overrides', () => {
    const r = resolvePropertyResolution({
      ...base,
      locale: { active: true, locale: 'fr' },
    });
    expect(r.read.source).toEqual({ kind: 'locale', locale: 'fr' });
    expect(r.write.target.kind).toBe('locale-override');
  });

  it('resolves CMS bindings without silently enabling literal edits', () => {
    const r = resolvePropertyResolution({
      ...base,
      cms: { active: true, ref: 'heroColor' },
    });
    expect(r.read.source).toMatchObject({ kind: 'cms', ref: 'heroColor' });
    expect(r.write.target.kind).toBe('cms-binding');
    expect(r.write.editable).toBe(false);
  });

  it('fails closed for inherited values whose authoring owner is outside the selected node', () => {
    const r = resolvePropertyResolution({
      ...base,
      effectiveValue: 'rgb(0, 0, 0)',
      inheritedValue: 'rgb(0, 0, 0)',
      inheritedFrom: 'parent',
    });
    expect(r.read.source.kind).toBe('inherited');
    expect(r.write.target.kind).toBe('read-only');
    expect(r.write.editable).toBe(false);
  });

  it('fails closed for computed-only values', () => {
    const r = resolvePropertyResolution({
      ...base,
      effectiveValue: '16px',
      computedValue: '16px',
    });
    expect(r.read.source.kind).toBe('computed-only');
    expect(r.write.target.kind).toBe('read-only');
  });

  it('makes animation-bound properties read-only', () => {
    const r = resolvePropertyResolution({ ...base, animationBoundBy: 'Scroll Transform' });
    expect(r.read.source).toEqual({ kind: 'animation-bound', ref: 'Scroll Transform' });
    expect(r.write.target.kind).toBe('read-only');
    expect(r.binding).toEqual({ kind: 'animation', ref: 'Scroll Transform' });
  });

  it('keeps compatible mixed base-style selections editable', () => {
    const a = resolvePropertyResolution({ ...base, hasAuthoredBase: true, effectiveValue: '#111' });
    const b = resolvePropertyResolution({ ...base, nodeId: 'node-2', hasAuthoredBase: true, effectiveValue: '#222' });
    const multi = resolveMultiSelection([a, b]);
    expect(multi.mixed).toBe(true);
    expect(multi.editable).toBe(true);
    expect(multi.targetKind).toBe('node-base-style');
  });

  it('fails closed for incompatible multi-selection write targets', () => {
    const a = resolvePropertyResolution({ ...base, hasAuthoredBase: true });
    const b = resolvePropertyResolution({
      ...base,
      nodeId: 'node-2',
      responsive: { active: true, hasOwnValue: true, maxWidth: 768 },
    });
    const multi = resolveMultiSelection([a, b]);
    expect(multi.editable).toBe(false);
    expect(multi.targetKind).toBeNull();
    expect(multi.reason).toContain('incompatible');
  });
});
