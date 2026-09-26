import { afterEach, describe, expect, it } from 'vitest';
import {
  getProjectId,
  getFieldProjectIdOverride,
  setFieldProjectIdOverride,
} from './project-id';

describe('project id runtime override', () => {
  afterEach(() => {
    setFieldProjectIdOverride(null);
    window.history.replaceState(null, '', '/');
  });

  it('keeps the live builder id authoritative while Dashboard owns the URL', () => {
    window.history.replaceState(null, '', '/');
    setFieldProjectIdOverride('live-project');
    expect(getProjectId()).toBe('live-project');
    expect(getFieldProjectIdOverride()).toBe('live-project');
  });

  it('falls back to the builder URL when there is no runtime override', () => {
    window.history.replaceState(null, '', '/builder/url-project');
    expect(getProjectId()).toBe('url-project');
  });
});
