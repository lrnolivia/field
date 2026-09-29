import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const settings = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/overlays/SettingsOverlay.tsx'), 'utf8');

describe('field settings tab split', () => {
  it('gives core field preferences first-class sidebar destinations', () => {
    expect(settings).toContain("{ id: 'appearance', label: 'Appearance'");
    expect(settings).toContain("{ id: 'workspace', label: 'Workspace'");
    expect(settings).toContain("{ id: 'canvas', label: 'Canvas'");
    expect(settings).toContain("{ id: 'localization', label: 'Localization'");
  });

  it('keeps General compact and routes deeper preferences to their own tabs', () => {
    const generalStart = settings.indexOf("if (activeSection === 'website')");
    const appearanceStart = settings.indexOf("if (activeSection === 'appearance')");
    const general = settings.slice(generalStart, appearanceStart);
    expect(general).toContain('data-general-settings-overview');
    expect(general).toContain("setActiveSection('appearance')");
    expect(general).toContain("setActiveSection('workspace')");
    expect(general).toContain("setActiveSection('canvas')");
    expect(general).toContain('Case management');
    expect(general).not.toContain('data-general-theme-display');
    expect(general).not.toContain('Panel widths');
    expect(general).not.toContain('Smooth zoom');
  });

  it('moves each existing settings group without duplicating the preference state', () => {
    const appearanceStart = settings.indexOf("if (activeSection === 'appearance')");
    const workspaceStart = settings.indexOf("if (activeSection === 'workspace')");
    const canvasStart = settings.indexOf("if (activeSection === 'canvas')");
    const registryStart = settings.indexOf('// Look up registered section');

    const appearance = settings.slice(appearanceStart, workspaceStart);
    const workspace = settings.slice(workspaceStart, canvasStart);
    const canvas = settings.slice(canvasStart, registryStart);

    expect(appearance).toContain('data-general-theme-display');
    expect(appearance).toContain('Website preview');
    expect(workspace).toContain('Panel widths');
    expect(workspace).toContain('Auto-hide Inspector');
    expect(canvas).toContain('Show rulers');
    expect(canvas).toContain('Smooth zoom');
    expect(canvas).toContain('Auto pan');
  });
});
