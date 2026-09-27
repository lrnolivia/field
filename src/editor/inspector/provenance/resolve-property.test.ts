import { describe, expect, it } from 'vitest';
import type { CanvasNode } from '@/code/parsing/parser';
import { inspectorPropertyTooltip, resolveInspectorProperty, resolveMultiSelection, type PropertyResolutionInput } from './resolve-property';

const node = (styles: Record<string, string> = {}, extra: Partial<CanvasNode> = {}): CanvasNode => ({
  id: 'card', styles, motionVariants: null, conditionalStyles: null,
  componentInstanceId: null, isComponentInstance: false,
  ...extra,
} as CanvasNode);
const input = (extra: Partial<PropertyResolutionInput> = {}): PropertyResolutionInput => ({
  property: 'backgroundColor', node: node({ backgroundColor: '#fff' }), effectiveValue: '#fff', ...extra,
});

describe('Inspector property provenance', () => {
  it('identifies authored local styles and never mutates the input', () => {
    const selected = node({ backgroundColor: '#fff' });
    const before = JSON.stringify(selected);
    const result = resolveInspectorProperty(input({ node: selected }));
    expect(result.read.source).toBe('local');
    expect(result.write).toMatchObject({ target: 'node-base-style', editable: true });
    expect(JSON.stringify(selected)).toBe(before);
  });

  it('retains variable and preset identity over a resolved literal', () => {
    expect(resolveInspectorProperty(input({ valueSource: { source: 'prop', ref: 'brandColor' } })))
      .toMatchObject({ read: { source: 'variable', value: '#fff' }, write: { target: 'variable-binding', editable: false }, binding: { ref: 'brandColor' } });
    expect(resolveInspectorProperty(input({ valueSource: { source: 'token', ref: '--brand' } })))
      .toMatchObject({ read: { source: 'preset' }, write: { target: 'preset-binding', editable: false }, binding: { ref: '--brand' } });
  });

  it('marks active responsive values and inherited replica values separately', () => {
    const selected = node({ backgroundColor: '#fff' }, { responsiveStyleValues: { backgroundColor: { 768: '#333' } }, responsiveStyleBands: { backgroundColor: { 768: 376 } } });
    expect(resolveInspectorProperty(input({ node: selected, effectiveValue: '#333', isReplica: true, viewportWidth: 768 })))
      .toMatchObject({ read: { source: 'responsive' }, write: { target: 'responsive-band', editable: true }, reset: { target: 'responsive-band' } });
    expect(resolveInspectorProperty(input({ node: selected, isReplica: true, viewportWidth: 375 })))
      .toMatchObject({ read: { source: 'inherited', inherited: true }, write: { target: 'responsive-band' }, reset: null });
  });

  it('does not claim a tablet-only override belongs to the mobile band', () => {
    const overrides = new Map([['card', new Map([[768, new Map([['backgroundColor', '#333']])]])]]);
    const result = resolveInspectorProperty(input({ overrides, isReplica: true, viewportWidth: 375 }));
    expect(result.read).toMatchObject({ source: 'inherited', inherited: true });
    expect(result.write).toMatchObject({ target: 'responsive-band', editable: true });
    expect(result.reset).toBeNull();
  });

  it('distinguishes default, named, and conditional variants', () => {
    const selected = node({}, { motionVariants: { default: { backgroundColor: '#fff' }, active: { backgroundColor: '#333' } }, conditionalStyles: { gap: { active: '8px' } } });
    expect(resolveInspectorProperty(input({ node: selected, isComponentFile: true, variant: 'default' })).read.source).toBe('component-variant');
    expect(resolveInspectorProperty(input({ node: selected, effectiveValue: '#333', isComponentFile: true, variant: 'active' })))
      .toMatchObject({ read: { source: 'component-variant' }, reset: { target: 'component-variant-style', detail: 'active' } });
    expect(resolveInspectorProperty(input({ node: selected, property: 'gap', effectiveValue: '8px', isComponentFile: true, variant: 'active' })))
      .toMatchObject({ read: { source: 'conditional-variant' }, write: { target: 'component-variant-conditional' } });
  });

  it('distinguishes instance, locale, and CMS routes', () => {
    expect(resolveInspectorProperty(input({ node: node({ backgroundColor: '#fff' }, { componentInstanceId: 'instance:child' }) })))
      .toMatchObject({ read: { source: 'component-instance' }, write: { target: 'component-instance-override' } });
    expect(resolveInspectorProperty(input({ locale: 'fr', localeValue: '#fff' })))
      .toMatchObject({ read: { source: 'locale' }, reset: { target: 'locale-override' } });
    expect(resolveInspectorProperty(input({ cmsField: 'image' })))
      .toMatchObject({ read: { source: 'cms' }, write: { target: 'cms-binding', editable: false }, binding: { ref: 'image' } });
  });

  it('fails closed for computed CSS, unresolved effective values, and animation ownership', () => {
    expect(resolveInspectorProperty(input({ node: node(), effectiveValue: undefined, computedValue: 'red' })))
      .toMatchObject({ read: { source: 'computed-only' }, write: { target: 'read-only', editable: false } });
    expect(resolveInspectorProperty(input({ node: node(), effectiveValue: 'red' })))
      .toMatchObject({ read: { source: 'inherited' }, write: { target: 'read-only', editable: false } });
    expect(resolveInspectorProperty(input({ animationOwner: 'Hover animation' })))
      .toMatchObject({ read: { source: 'animation-bound' }, write: { target: 'read-only', editable: false } });
  });

  it('permits compatible mixed edits and blocks incompatible bulk targets', () => {
    const local = resolveInspectorProperty(input());
    const other = resolveInspectorProperty(input({ node: node({ backgroundColor: '#333' }), effectiveValue: '#333' }));
    expect(resolveMultiSelection('backgroundColor', [local, other]))
      .toMatchObject({ read: { mixed: true, value: '' }, write: { target: 'node-base-style', editable: true } });
    const responsive = resolveInspectorProperty(input({ isReplica: true, viewportWidth: 768 }));
    expect(resolveMultiSelection('backgroundColor', [local, responsive]).write)
      .toMatchObject({ target: 'read-only', editable: false });
  });

  it('explains confident sources in a small label tooltip', () => {
    expect(inspectorPropertyTooltip(resolveInspectorProperty(input()))).toBeUndefined();
    expect(inspectorPropertyTooltip(resolveInspectorProperty(input({ valueSource: { source: 'prop', ref: 'brandColor' } }))))
      .toContain('Variable brandColor');
    const responsive = node({ backgroundColor: '#fff' }, { responsiveStyleValues: { backgroundColor: { 768: '#333' } } });
    expect(inspectorPropertyTooltip(resolveInspectorProperty(input({ node: responsive, effectiveValue: '#333', isReplica: true, viewportWidth: 768 }))))
      .toContain('Responsive 768');
  });
});
