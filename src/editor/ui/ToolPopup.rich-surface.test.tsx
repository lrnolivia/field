// FIGUI3_RICH_TOOL_POPUP_CONTRACT_20260926
import { useRef, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { FIELD_SURFACE_Z } from '@/shared/field-surface-elevation';

vi.mock('motion/react', async () => {
  const ReactModule = await import('react');
  return {
    motion: {
      div: ReactModule.forwardRef<HTMLDivElement, any>(
        ({ children, initial: _initial, animate: _animate, transition: _transition, ...props }, ref) => (
          <div ref={ref} {...props}>{children}</div>
        ),
      ),
    },
  };
});

import ToolPopup, { useToolPopup } from './ToolPopup';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function NestedButton() {
  const { pushPanel } = useToolPopup();
  return (
    <button
      type="button"
      onClick={() => pushPanel('Nested editor', <button type="button">Nested content</button>)}
    >
      Push nested
    </button>
  );
}

function Harness({
  modal = false,
  outsidePointerMode = 'none',
}: {
  modal?: boolean;
  outsidePointerMode?: 'none' | 'close' | 'shield';
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const focusRef = useRef<HTMLInputElement>(null);

  const content = (
    <>
      <button ref={anchorRef} type="button" onClick={() => setOpen(true)}>Open rich editor</button>
      <ToolPopup
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Rich editor"
        ariaLabel="Rich inspector editor"
        anchorRef={anchorRef}
        initialFocusRef={focusRef}
        outsidePointerMode={outsidePointerMode}
      >
        <input ref={focusRef} aria-label="Initial rich field" />
        <NestedButton />
      </ToolPopup>
    </>
  );

  return modal ? <div data-modal-root>{content}</div> : content;
}

let originalResizeObserver: typeof globalThis.ResizeObserver | undefined;
let originalRaf: typeof requestAnimationFrame | undefined;
let originalCancelRaf: typeof cancelAnimationFrame | undefined;

beforeAll(() => {
  originalResizeObserver = globalThis.ResizeObserver;
  originalRaf = globalThis.requestAnimationFrame;
  originalCancelRaf = globalThis.cancelAnimationFrame;
  globalThis.ResizeObserver = ResizeObserverStub as any;
  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    return setTimeout(() => callback(0), 0) as unknown as number;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as typeof cancelAnimationFrame;
});

afterAll(() => {
  globalThis.ResizeObserver = originalResizeObserver as any;
  globalThis.requestAnimationFrame = originalRaf as any;
  globalThis.cancelAnimationFrame = originalCancelRaf as any;
});

describe('ToolPopup canonical rich Inspector surface', () => {
  it('renders a labelled non-modal dialog above Inspector and below child menus', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open rich editor' }));

    const dialog = await screen.findByRole('dialog', { name: 'Rich inspector editor' });
    expect(dialog.getAttribute('aria-modal')).toBe('false');
    expect((dialog as HTMLElement).style.zIndex).toBe(String(FIELD_SURFACE_Z.richPopup));
    expect((dialog as HTMLElement).dataset.fieldSurfaceScope).toBe('workspace');

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Initial rich field' }));
    });
  });

  it('inherits modal scope and uses the modal rich-popup band', async () => {
    render(<Harness modal />);
    fireEvent.click(screen.getByRole('button', { name: 'Open rich editor' }));
    const dialog = await screen.findByRole('dialog', { name: 'Rich inspector editor' });
    expect((dialog as HTMLElement).style.zIndex).toBe(String(FIELD_SURFACE_Z.modalRichPopup));
    expect((dialog as HTMLElement).dataset.fieldSurfaceScope).toBe('modal');
  });

  it('pops a nested panel before Escape closes the root and restores trigger focus', async () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open rich editor' });
    fireEvent.click(trigger);
    await screen.findByRole('dialog', { name: 'Rich inspector editor' });

    fireEvent.click(screen.getByRole('button', { name: 'Push nested' }));
    expect(await screen.findByText('Nested content')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Rich inspector editor' })).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Rich inspector editor' })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('can shield outside pointer sequences so clicks do not fall through', async () => {
    render(<Harness outsidePointerMode="shield" />);
    fireEvent.click(screen.getByRole('button', { name: 'Open rich editor' }));
    await screen.findByRole('dialog', { name: 'Rich inspector editor' });

    const backdrop = document.querySelector('[data-tool-popup-backdrop]');
    expect(backdrop).toBeTruthy();
    fireEvent.pointerDown(backdrop!);
    fireEvent.pointerUp(backdrop!);
    fireEvent.click(backdrop!);

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Rich inspector editor' })).toBeNull());
  });
});
