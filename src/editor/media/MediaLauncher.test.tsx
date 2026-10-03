import { act, cleanup, render, waitFor } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backend } from '@/backend';
import MediaLauncher from './MediaLauncher';
import { sessionMediaAssetsAtom, setMediaProjectIdAtom } from './media-state';

const context = vi.hoisted(() => ({ projectId: 'project-a' }));
vi.mock('@/backend', () => ({ backend: { listAssets: vi.fn() } }));
vi.mock('@/backend/project-id', () => ({ getProjectId: () => context.projectId }));
vi.mock('@/editor/ui/useUiChromeCase', () => ({ useUiChromeCase: () => (text: string) => text }));

beforeEach(() => { context.projectId = 'project-a'; vi.mocked(backend.listAssets).mockReset(); });
afterEach(cleanup);

describe('Media launcher previews', () => {
  it('shows the newest three images across session and saved inventory, without duplicates or videos', async () => {
    vi.mocked(backend.listAssets).mockResolvedValue([
      { url: '/older.png', kind: 'image', lastModified: '2026-10-01' },
      { url: '/newest.png', kind: 'image', lastModified: '2026-10-05' },
      { url: '/clip.mp4', kind: 'video', lastModified: '2026-10-06' },
      { url: '/middle.png', kind: 'image', lastModified: '2026-10-03' },
    ]);
    const store = createStore();
    store.set(sessionMediaAssetsAtom, [{ id: 'new', projectId: 'project-a', url: '/newest.png', kind: 'image', name: 'Newest', createdAt: '2026-10-05' }, { id: 'second', projectId: 'project-a', url: '/second.png', kind: 'image', name: 'Second', createdAt: '2026-10-04' }]);
    const { container } = render(<Provider store={store}><MediaLauncher onNavigate={vi.fn()} onUpload={vi.fn()} onPaste={vi.fn()} /></Provider>);
    await waitFor(() => expect(Array.from(container.querySelectorAll('[data-media-launcher-preview] img')).map(img => img.getAttribute('src'))).toEqual(['/newest.png', '/second.png', '/middle.png']));
    expect(container.querySelector('[data-media-launcher]')?.lastElementChild?.hasAttribute('data-media-launcher-featured')).toBe(true);
  });

  it('keeps empty-slot glyphs and prevents a late inventory response from leaking across projects', async () => {
    let finish!: (assets: Awaited<ReturnType<typeof backend.listAssets>>) => void;
    vi.mocked(backend.listAssets).mockReturnValueOnce(new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce([]);
    const store = createStore();
    const launcher = <Provider store={store}><MediaLauncher onNavigate={vi.fn()} onUpload={vi.fn()} onPaste={vi.fn()} /></Provider>;
    const { container, rerender } = render(launcher);
    expect(container.querySelectorAll('[data-media-launcher-preview] svg')).toHaveLength(3);
    context.projectId = 'project-b';
    act(() => store.set(setMediaProjectIdAtom, 'project-b'));
    rerender(launcher);
    await act(async () => { finish([{ url: '/project-a.png', kind: 'image' }]); });
    expect(container.querySelectorAll('[data-media-launcher-preview] img')).toHaveLength(0);
    expect(container.querySelectorAll('[data-media-launcher-preview] svg')).toHaveLength(3);
  });
});
