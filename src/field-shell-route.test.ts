import { describe, expect, it } from 'vitest';
import { fieldBuilderProjectId, fieldPathIsDashboard, fieldProjectUrl } from './field-shell-route';

describe('field shell routes', () => {
  it('recognizes canonical and legacy Dashboard routes', () => {
    expect(fieldPathIsDashboard('/')).toBe(true);
    expect(fieldPathIsDashboard('/dashboard')).toBe(true);
    expect(fieldPathIsDashboard('/dashboard/')).toBe(true);
    expect(fieldPathIsDashboard('/builder/a')).toBe(false);
    expect(fieldPathIsDashboard('/work/a')).toBe(false);
  });

  it('extracts builder ids without treating Dashboard as a project', () => {
    expect(fieldBuilderProjectId('/builder/abc123')).toBe('abc123');
    expect(fieldBuilderProjectId('/builder/hello%20world')).toBe('hello world');
    expect(fieldBuilderProjectId('/work/abc123')).toBe('abc123');
    expect(fieldBuilderProjectId('/work/hello%20world')).toBe('hello world');
    expect(fieldBuilderProjectId('/builder')).toBe('local');
    expect(fieldBuilderProjectId('/work')).toBe('local');
    expect(fieldBuilderProjectId('/')).toBeNull();
  });

  it('uses the clean work route for field while keeping builder links readable', () => {
    expect(fieldProjectUrl('abc 123')).toBe('/work/abc%20123');
  });
});
