import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const leftHeader = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/header/LeftHeader.tsx'), 'utf8');
const projectChip = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/header/ProjectChip.tsx'), 'utf8');
const menuBuilders = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/header/menu-builders.tsx'), 'utf8');
const settings = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/overlays/SettingsOverlay.tsx'), 'utf8');
const projectModal = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/overlays/ProjectSettingsModal.tsx'), 'utf8');

describe('settings surface routing', () => {
  it('keeps main-menu Settings on the full-screen General surface', () => {
    const start = leftHeader.indexOf("id: 'logo-settings'");
    const block = leftHeader.slice(start, start + 600);
    expect(block).toContain("setSettingsSection('website')");
    expect(block).toContain('setSettingsOpen(true)');
  });

  it('routes project-scoped settings to one compact modal', () => {
    expect(projectChip).toContain("label: 'Project settings…'");
    expect(projectChip).toContain('setProjectSettingsOpen(true)');
    expect(menuBuilders).toContain("label: 'Project settings…'");
    expect(menuBuilders).toContain('projectSettingsModalOpenAtom');
    expect(projectModal).toContain('data-project-settings-modal');
    expect(projectModal).toContain('width={640}');
  });

  it('keeps project source controls out of field General Settings', () => {
    const start = settings.indexOf("if (activeSection === 'website')");
    const end = settings.indexOf('// Look up registered section', start);
    const block = settings.slice(start, end);
    expect(block).toContain('field preferences that follow you across projects');
    expect(block).toContain('Lowercase headings');
    expect(block).not.toContain('Site metadata');
    expect(block).not.toContain('Custom code');
    expect(block).not.toContain('Default theme');
  });
});
