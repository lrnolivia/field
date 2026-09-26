import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('left header Dashboard navigation contract', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/editor/header/LeftHeader.tsx'),
    'utf8',
  );

  it('routes Go to Dashboard through the live FieldShell instead of a hard page navigation', () => {
    expect(source).toContain("import { showFieldDashboard } from '@/backend/field-navigation';");
    expect(source).toContain("void showFieldDashboard();");
    expect(source).not.toContain("leaveBuilderTo('/dashboard', 'logo-dashboard')");
  });

  it('keeps account/settings navigation on the save-before-hard-nav path', () => {
    expect(source).toContain("await leaveBuilderTo(`/dashboard?${params.toString()}`, 'logo-account');");
  });
});
