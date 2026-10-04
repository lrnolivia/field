import { describe, expect, it } from 'vitest';
import { updateNodeInCode } from '@/code/generation/generator-crud';
import { parseJSXToNodes } from '@/code/parsing/parser';
import { validateGeneratedCode } from '@/code/mutation/mutation-queue';
import { buildPatternFillStyles, defaultPatternMonsterFill } from './pattern-fill-utils';
import { findPatternMonsterDefinition } from './patterns/pattern-monster-catalog';

const source = `export default function Page() { return <div data-id="box" style={{backgroundColor: 'transparent', backgroundImage: 'linear-gradient(red, blue)', backgroundSize: '20px 20px', backgroundRepeat: 'repeat', width: '120px'}} />; }`;

describe('Pattern/image fill source persistence', () => {
  it('writes actual Waves-1 SVG CSS without breaking the JSX string literal', () => {
    const definition = findPatternMonsterDefinition('waves-1')!;
    const css = buildPatternFillStyles(defaultPatternMonsterFill(definition), definition);
    const output = updateNodeInCode(source, 'box', { ...css });
    expect(validateGeneratedCode(output)).toBeNull();
    expect(parseJSXToNodes(output).get('box')?.styles.backgroundImage).toBe(css.backgroundImage);
  });
  it('keeps a serialized SVG intact through later edits and removal', () => {
    const definition = findPatternMonsterDefinition('waves-1')!;
    const css = buildPatternFillStyles(defaultPatternMonsterFill(definition), definition);
    const applied = updateNodeInCode(source, 'box', { ...css });
    const resized = updateNodeInCode(applied, 'box', { width: '240px' });
    expect(validateGeneratedCode(resized)).toBeNull();
    expect(parseJSXToNodes(resized).get('box')?.styles.backgroundImage).toBe(css.backgroundImage);
    expect(parseJSXToNodes(resized).get('box')?.styles.width).toBe('240px');
    const removed = updateNodeInCode(resized, 'box', { backgroundImage: '' });
    expect(validateGeneratedCode(removed)).toBeNull();
    expect(parseJSXToNodes(removed).get('box')?.styles.backgroundImage).toBeUndefined();
    expect(parseJSXToNodes(removed).get('box')?.styles.width).toBe('240px');
  });
  it.each([
    `url("https://example.com/artist's-image.png")`,
    `"Artist's Font", sans-serif`,
    'url("C:\\images\\art.png")',
  ])('preserves mixed quote/backslash values exactly: %s', value => {
    const output = updateNodeInCode(source, 'box', { backgroundImage: value });
    expect(validateGeneratedCode(output)).toBeNull();
    expect(parseJSXToNodes(output).get('box')?.styles.backgroundImage).toBe(value);
  });
});
