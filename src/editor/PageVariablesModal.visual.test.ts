import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const modal = readFileSync('src/editor/ui/PageVariablesModal.tsx', 'utf8');

describe('Page Variables visual language', () => {
  it('uses the active field accent instead of the retired secondary graphite accent', () => {
    expect(modal).not.toContain('accent-secondary');
    expect(modal).not.toContain('accent-secondary-fg');
    expect(modal).toContain('bg-[var(--accent-surface)]');
    expect(modal).toContain('bg-[var(--accent)]');
    expect(modal).toContain('text-[var(--accent-fg)]');
    expect(modal).toContain('hover:bg-[var(--accent-hover)]');
  });

  it('uses the beautified settings-style hierarchy', () => {
    expect(modal).toContain('data-page-variables-editor-header');
    expect(modal).toContain('data-page-variable-section');
    expect(modal).toContain('data-page-variable-empty');
    expect(modal).toContain('rounded-[10px]');
    expect(modal).toContain('title="Identity"');
    expect(modal).toContain('title="Default value"');
    expect(modal).toContain('title="URL sync"');
    expect(modal).toContain('data-page-variables-footer');
  });

  it('adds variable type glyphs to the type selector', () => {
    expect(modal).toContain("icon: <VariableTypeIcon iconKey={resolveVariableIconKey({ pageVarType: 'number' })}");
    expect(modal).toContain("icon: <VariableTypeIcon iconKey={resolveVariableIconKey({ pageVarType: 'image' })}");
  });

  it('retires cut-corner controls inside this modal', () => {
    expect(modal).not.toContain('cut-corners');
    expect(modal).not.toContain('cut-border');
  });
});
