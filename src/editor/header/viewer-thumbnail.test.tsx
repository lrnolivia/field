import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setViewerMode } from '@/code/stores/viewer-mode-store';
import { usePreviewThumbnail } from './usePreviewThumbnail';
import ProjectThumbnailCaptureHost from './ProjectThumbnailCaptureHost';

const mocks = vi.hoisted(() => ({
  upload: vi.fn(() => Promise.resolve('/thumbnail.png')),
  freshness: vi.fn(() => Promise.resolve({ exists: false, stale: true })),
  write: null as null | ((event: { kind: string; path: string; content: string }) => void),
}));
vi.mock('@/backend', () => ({ BACKEND_KIND: 'field' }));
vi.mock('@/backend/field-projects', () => ({
  uploadFieldProjectThumbnail: mocks.upload,
  getFieldProjectThumbnailState: mocks.freshness,
}));
vi.mock('@/backend/revyme-backend', () => ({ uploadPreviewThumbnail: vi.fn() }));
vi.mock('@/backend/project-id', () => ({ getProjectId: () => 'project-1' }));
vi.mock('@/backend/save-store', async () => ({ saveStatusAtom: (await import('jotai')).atom('saved') }));
vi.mock('@/code/stores/locale-store', async () => ({ activeLocaleAtom: (await import('jotai')).atom('en') }));
vi.mock('@/code/project/active-file-store', () => ({ filePathToSlug: () => '/' }));
vi.mock('@/code/project/project-fs', () => ({ projectFS: {
  isMainActive: () => true,
  listFiles: () => ['app/page.tsx'],
  subscribe: () => () => {},
  subscribeWrites: (listener: typeof mocks.write) => { mocks.write = listener; return () => { mocks.write = null; }; },
} }));
vi.mock('@/preview/preview-project-payload', () => ({
  collectPreviewProjectPayload: () => ({ files: [] }),
  postPreviewProjectPayload: vi.fn(),
}));
vi.mock('@/preview/dashboard-thumbnail-page', () => ({
  chooseDashboardThumbnailPage: () => 'app/page.tsx',
  dashboardThumbnailPageUrl: () => '/',
}));
vi.mock('@/preview/preview-frame-url', () => ({ previewFrameUrl: () => 'about:blank' }));
vi.mock('@/shared/debug-trace', () => ({ trace: { action: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

function message(source: Window, data: object) {
  window.dispatchEvent(new MessageEvent('message', { source, data }));
}
function previewOptions(source: Window) {
  return {
    open: true, iframeReady: true, isThumbnailPage: true, projectVersion: 1,
    iframeRef: { current: { contentWindow: source } as HTMLIFrameElement }, postMessageTarget: '*',
  };
}
async function beginBackgroundCapture(container: HTMLElement) {
  await act(async () => {});
  const iframe = container.querySelector('iframe')!;
  expect(iframe).not.toBeNull();
  const source = iframe.contentWindow!;
  const post = vi.spyOn(source, 'postMessage');
  act(() => message(source, { type: 'preview:ready' }));
  const session = post.mock.calls.find(([data]) => data.type === 'preview:thumbnail-session')![0];
  act(() => message(source, { type: 'preview:rendered', requestId: session.requestId, generation: 0, url: '/' }));
  act(() => vi.advanceTimersByTime(120));
  const capture = post.mock.calls.find(([data]) => data.type === 'preview:capture-thumbnail')![0];
  expect(capture).toBeDefined();
  return { source, requestId: capture.requestId };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  setViewerMode(false);
});
afterEach(() => {
  cleanup();
  setViewerMode(false);
  vi.useRealTimers();
});

describe('visible Preview thumbnail role gate', () => {
  it('does not request or upload a thumbnail as a viewer, and captures after becoming editable', () => {
    setViewerMode(true);
    const post = vi.spyOn(window, 'postMessage');
    renderHook(() => usePreviewThumbnail(previewOptions(window)));
    expect(post).not.toHaveBeenCalled();
    act(() => message(window, { type: 'preview:thumbnail', dataUrl: 'data:image/png;base64,AA==' }));
    expect(mocks.upload).not.toHaveBeenCalled();
    act(() => setViewerMode(false));
    expect(post).toHaveBeenCalledWith({ type: 'preview:capture-thumbnail' }, '*');
    act(() => message(window, { type: 'preview:thumbnail', dataUrl: 'data:image/png;base64,AA==' }));
    expect(mocks.upload).toHaveBeenCalledOnce();
    post.mockRestore();
  });

  it('discards a response if the role becomes viewer before effects clean up', () => {
    renderHook(() => usePreviewThumbnail(previewOptions(window)));
    act(() => {
      setViewerMode(true);
      message(window, { type: 'preview:thumbnail', dataUrl: 'data:image/png;base64,AA==' });
    });
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});

describe('background thumbnail role gate', () => {
  it('does not probe or mount a capture renderer for viewers, even on project writes', async () => {
    setViewerMode(true);
    const { container } = render(<ProjectThumbnailCaptureHost suspended={false} />);
    await act(async () => {});
    act(() => {
      mocks.write?.({ kind: 'write', path: 'app/page.tsx', content: 'changed' });
      vi.advanceTimersByTime(500);
    });
    expect(container.querySelector('iframe')).toBeNull();
    expect(mocks.freshness).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
    act(() => setViewerMode(false));
    await act(async () => {});
    expect(container.querySelector('iframe')).not.toBeNull();
    expect(mocks.freshness).toHaveBeenCalledOnce();
  });

  it('still uploads a captured thumbnail for editable projects', async () => {
    const { container } = render(<ProjectThumbnailCaptureHost suspended={false} />);
    const { source, requestId } = await beginBackgroundCapture(container);
    await act(async () => message(source, { type: 'preview:thumbnail', requestId, dataUrl: 'data:image/png;base64,AA==' }));
    expect(mocks.upload).toHaveBeenCalledWith('project-1', 'data:image/png;base64,AA==');
  });

  it('discards an in-flight response immediately on a viewer-role transition', async () => {
    const { container } = render(<ProjectThumbnailCaptureHost suspended={false} />);
    const { source, requestId } = await beginBackgroundCapture(container);
    act(() => {
      setViewerMode(true);
      message(source, { type: 'preview:thumbnail', requestId, dataUrl: 'data:image/png;base64,AA==' });
    });
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(container.querySelector('iframe')).toBeNull();
  });
});
