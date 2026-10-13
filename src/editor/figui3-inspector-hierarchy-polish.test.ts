// FIGUI3_HIERARCHY_POLISH_TEST_20260925
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('FigUI3 corrective hierarchy polish', () => {
  it('reduces property row labels from bold to medium', () => {
    const row = read('src/editor/controls/ToolRow.tsx');
    const label = read('src/editor/controls/ControlLabel.tsx');
    expect(row).toContain('FIGUI3_HIERARCHY_TOOLROW_20260925');
    expect(label).toContain('FIGUI3_HIERARCHY_CONTROLLABEL_20260925');
    expect(row).not.toContain('text-xs font-bold');
    expect(label).not.toContain('text-xs font-bold');
    expect(row).toContain('text-xs font-medium');
    expect(label).toContain('text-xs font-medium');
  });

  it('uses neutral hover grammar for ordinary property label menus', () => {
    const row = read('src/editor/controls/ToolRow.tsx');
    const label = read('src/editor/controls/ControlLabel.tsx');
    expect(row).not.toContain('hover:bg-[var(--accent)] transition-colors');
    expect(label).not.toContain('hover:!bg-[var(--accent)]');
    expect(label).not.toContain("item.hoverColor === 'accent-secondary'");
    expect(label).toContain('hover:bg-[var(--bg-hover)]');
    expect(label).toContain('bg-[var(--border-light)]');
  });

  it('removes inherited purple pill and emoji CMS binding chrome', () => {
    const bind = read('src/editor/controls/BindButton.tsx');
    expect(bind).toContain('FIGUI3_HIERARCHY_CMS_BINDING_20260925');
    expect(bind).toContain('data-cms-bind-button');
    expect(bind).toContain('data-cms-binding-icon');
    expect(bind).toContain('stroke="var(--selection)"');
    expect(bind).not.toContain('purple');
    expect(bind).not.toContain('rounded-full');
    expect(bind).not.toContain('&#x26A1;');
    expect(bind).not.toContain('&#x1F50C;');
    expect(bind).not.toContain('hover:bg-[var(--accent)]');
  });
});
