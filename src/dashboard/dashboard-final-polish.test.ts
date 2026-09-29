import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Dashboard final visual polish contract', () => {
  const card = fs.readFileSync(path.join(process.cwd(), 'src/dashboard/ProjectCard.tsx'), 'utf8');
  const dashboard = fs.readFileSync(path.join(process.cwd(), 'src/Dashboard.tsx'), 'utf8');
  const header = fs.readFileSync(path.join(process.cwd(), 'src/dashboard/DashboardHeader.tsx'), 'utf8');
  const backfill = fs.readFileSync(path.join(process.cwd(), 'src/dashboard/dashboard-thumbnail-backfill.ts'), 'utf8');
  const dashboardCss = fs.readFileSync(path.join(process.cwd(), 'src/styles/dashboard.css'), 'utf8');
  const shellCss = fs.readFileSync(path.join(process.cwd(), 'src/styles/field-shell.css'), 'utf8');

  it('keeps existing card content mounted during slow realtime refreshes', () => {
    expect(card).not.toContain('if (props.refreshing)');
    expect(card).toContain('aria-busy={props.refreshing || undefined}');
    expect(card).toContain("data-refreshing={props.refreshing ? 'true' : undefined}");
    expect(dashboardCss).toContain(".field-project-card[data-refreshing='true'] .field-project-preview::before");
  });

  it('uses a small stacked field mark instead of the old grid and orbit artwork', () => {
    expect(dashboardCss).toContain('FIELD_DASHBOARD_CUTE_PLACEHOLDER_20260926');
    expect(dashboardCss).toContain('.field-project-placeholder-grid');
    expect(dashboardCss).not.toContain('background-size: 18px 18px');
    expect(dashboardCss).not.toContain('width: 92px;\n  height: 92px;');
  });

  it('makes New Project page one compact rather than card-heavy', () => {
    expect(shellCss).toContain('FIELD_DASHBOARD_FINAL_WIZARD_POLISH_20260926');
    expect(shellCss).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))');
    expect(shellCss).toContain('.field-new-project-style-option small {\n  display: none;');
    expect(shellCss).toContain('.field-new-project-actions-right .field-new-project-secondary');
    expect(shellCss).toContain('width: 168px;');
  });
  it('offers an explicit server-truth refresh that force rebuilds thumbnails', () => {
    expect(header).toContain('FigmaReloadIcon');
    expect(header).toContain('Refresh projects and thumbnails');
    expect(dashboard).toContain('const fresh = await listFieldProjects()');
    expect(dashboard).toContain('{ ...project, thumbnail: null }');
    expect(dashboard).toContain('force={manualRefreshGeneration > 0}');
    expect(backfill).toContain('force = false');
    expect(backfill).toContain('if (!force)');
    expect(dashboardCss).toContain(".field-dashboard-refresh[data-refreshing='true'] svg");
    expect(dashboardCss).toContain('field-dashboard-refresh-spin');
  });

});
