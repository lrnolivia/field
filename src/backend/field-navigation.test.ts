import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  openFieldProject,
  registerFieldNavigationHandler,
  releaseFieldProjectReveal,
  showFieldDashboard,
  type FieldNavigationHandler,
} from './field-navigation';

describe('field same-document navigation', () => {
  let unregister: (() => void) | null = null;

  afterEach(() => {
    unregister?.();
    unregister = null;
  });

  it('routes project/dashboard requests through the live shell handler', async () => {
    const openProject = vi.fn(async () => {});
    const showDashboard = vi.fn(async () => {});
    const releaseProjectReveal = vi.fn();
    const handler: FieldNavigationHandler = { openProject, showDashboard, releaseProjectReveal };
    unregister = registerFieldNavigationHandler(handler);

    await openFieldProject('abc 123', { holdReveal: true });
    await showFieldDashboard();
    releaseFieldProjectReveal('abc 123');

    expect(openProject).toHaveBeenCalledWith('abc 123', { holdReveal: true });
    expect(showDashboard).toHaveBeenCalledWith({});
    expect(releaseProjectReveal).toHaveBeenCalledWith('abc 123');
  });

  it('unregisters only the handler that registered itself', async () => {
    const first = {
      openProject: vi.fn(async () => {}),
      showDashboard: vi.fn(async () => {}),
      releaseProjectReveal: vi.fn(),
    };
    const second = {
      openProject: vi.fn(async () => {}),
      showDashboard: vi.fn(async () => {}),
      releaseProjectReveal: vi.fn(),
    };

    const stopFirst = registerFieldNavigationHandler(first);
    unregister = registerFieldNavigationHandler(second);
    stopFirst();

    await openFieldProject('project-b');
    expect(first.openProject).not.toHaveBeenCalled();
    expect(second.openProject).toHaveBeenCalledTimes(1);
  });
});
