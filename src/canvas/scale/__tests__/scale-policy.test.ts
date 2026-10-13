import { describe, expect, it } from 'vitest';
import { planScaledStyles, scalableBoundProperties, unsafeScaleChannelProperties } from '../scale-policy';

describe('Scale authored-property policy', () => {
  it('scales geometry, typography, stroke and corner metrics', () => {
    const result = planScaledStyles({
      width: '100px',
      height: '50px',
      fontSize: '20px',
      lineHeight: '28px',
      letterSpacing: '1px',
      borderWidth: '2px',
      borderRadius: '10px',
    }, 0.5);
    expect(result.blocked).toEqual([]);
    expect(result.styles).toMatchObject({
      width: '50px',
      height: '25px',
      fontSize: '10px',
      lineHeight: '14px',
      letterSpacing: '0.5px',
      borderWidth: '1px',
      borderRadius: '5px',
    });
  });

  it('preserves relative font-size semantics instead of double-scaling descendants', () => {
    const result = planScaledStyles({ fontSize: '1.25em' }, 2);
    expect(result.styles.fontSize).toBeUndefined();
    expect(result.preserved).toContain('fontSize:relative');
  });

  it('can emit a complete immutable live projection at factor 1', () => {
    const result = planScaledStyles({ width: '100px', gap: '8px', lineHeight: '1.4' }, 1, { includeUnchanged: true });
    expect(result.styles).toMatchObject({ width: '100px', gap: '8px', lineHeight: '1.4' });
  });

  it('keeps unitless line-height proportional while font size scales', () => {
    const result = planScaledStyles({ fontSize: '20px', lineHeight: '1.4' }, 2);
    expect(result.styles.fontSize).toBe('40px');
    expect(result.styles.lineHeight).toBeUndefined();
    expect(result.preserved).toContain('lineHeight:unitless-ratio');
  });

  it('scales effect geometry without changing color semantics', () => {
    const result = planScaledStyles({
      boxShadow: '4px 6px 8px 2px rgba(0, 0, 0, 0.35)',
      filter: 'blur(6px) brightness(1.2)',
    }, 1.5);
    expect(result.styles.boxShadow).toBe('6px 9px 12px 3px rgba(0, 0, 0, 0.35)');
    expect(result.styles.filter).toBe('blur(9px) brightness(1.2)');
  });

  it('scales fixed Auto Layout spacing while preserving percentages', () => {
    const result = planScaledStyles({ padding: '16px 8px', gap: '8px', width: '100%' }, 2);
    expect(result.styles.padding).toBe('32px 16px');
    expect(result.styles.gap).toBe('16px');
    expect(result.styles.width).toBeUndefined();
    expect(result.preserved).toContain('width:percentage');
  });

  it('scales transform translations but preserves rotation/skew channels', () => {
    const result = planScaledStyles({ transform: 'translateX(12px) rotate(35deg) skewX(8deg)' }, 2);
    expect(result.styles.transform).toBe('translateX(24px) rotate(35deg) skewX(8deg)');
  });

  it('fails closed for variable/calc dimensional values', () => {
    const result = planScaledStyles({ width: 'var(--card-width)', gap: 'calc(8px + 1vw)' }, 2);
    expect(result.blocked).toContain('width:variable');
    expect(result.blocked).toContain('gap:calc');
  });

  it('identifies bound and responsive/variant dimensional properties', () => {
    expect(scalableBoundProperties({ width: 'sizeToken', backgroundColor: 'colorToken' })).toEqual(['width']);
    expect(unsafeScaleChannelProperties({
      motionVariants: { open: { width: '200px', opacity: '1' } },
      conditionalStyles: { fontSize: { a: '20px' } },
      responsivePropStyles: null,
    })).toEqual(expect.arrayContaining(['motion:width', 'conditional:fontSize']));
  });
});
