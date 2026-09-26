// FIELD_INSPECTOR_COMMAND_MENU_006
// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import React, { useRef, useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DropdownMenu, { type DropdownMenuEntry } from './DropdownMenu';

afterEach(cleanup);

const item = (id: string, label: string, extra: Partial<Extract<DropdownMenuEntry, { id: string }>> = {}): DropdownMenuEntry => ({
  id,
  label,
  onClick: () => {},
  ...extra,
});

function Host({
  items,
  searchable = false,
  preferredFocusItemId,
}: {
  items: DropdownMenuEntry[];
  searchable?: boolean;
  preferredFocusItemId?: string;
}) {
  const [open, setOpen] = useState(true);
  const anchorRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={anchorRef} type="button">Trigger</button>
      <DropdownMenu
        isOpen={open}
        onClose={() => setOpen(false)}
        items={items}
        anchorRef={anchorRef}
        searchable={searchable}
        preferredFocusItemId={preferredFocusItemId}
      />
      <span data-testid="open-state">{open ? 'open' : 'closed'}</span>
    </>
  );
}

const navigationItems: DropdownMenuEntry[] = [
  item('disabled-a', 'Disabled A', { disabled: true }),
  { type: 'separator' },
  item('first', 'First'),
  item('disabled-b', 'Disabled B', { disabled: true }),
  item('middle', 'Middle'),
  { type: 'separator' },
  item('last', 'Last'),
];

describe('DropdownMenu keyboard contract', () => {
  test('ordinary trigger-anchored menus focus the first enabled item and expose menu semantics', () => {
    render(<Host items={navigationItems} />);
    expect(screen.getByRole('menu')).toBeTruthy();
    const first = screen.getByRole('menuitem', { name: 'First' });
    expect(document.activeElement).toBe(first);
    expect((screen.getByRole('menuitem', { name: 'Disabled A' }) as HTMLButtonElement).disabled).toBe(true);
  });

  test('preferredFocusItemId selects the initial enabled keyboard target', () => {
    render(<Host items={navigationItems} preferredFocusItemId="middle" />);
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Middle' }));
  });

  test('Arrow Down and Arrow Up wrap while skipping disabled rows and separators', () => {
    render(<Host items={navigationItems} />);
    const first = screen.getByRole('menuitem', { name: 'First' });
    const middle = screen.getByRole('menuitem', { name: 'Middle' });
    const last = screen.getByRole('menuitem', { name: 'Last' });

    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(middle);
    fireEvent.keyDown(middle, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(last, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(last);
  });

  test('Home and End move to the first and last enabled rows', () => {
    render(<Host items={navigationItems} preferredFocusItemId="middle" />);
    const middle = screen.getByRole('menuitem', { name: 'Middle' });
    fireEvent.keyDown(middle, { key: 'Home' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'First' }));
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'End' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Last' }));
  });

  test('Enter and Space activate the focused command', () => {
    const firstAction = vi.fn();
    const secondAction = vi.fn();
    const items: DropdownMenuEntry[] = [
      item('first', 'First', { keepOpen: true, onClick: firstAction }),
      item('second', 'Second', { keepOpen: true, onClick: secondAction }),
    ];
    render(<Host items={items} />);
    const first = screen.getByRole('menuitem', { name: 'First' });
    fireEvent.keyDown(first, { key: 'Enter' });
    expect(firstAction).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    const second = screen.getByRole('menuitem', { name: 'Second' });
    fireEvent.keyDown(second, { key: ' ' });
    expect(secondAction).toHaveBeenCalledTimes(1);
  });

  test('Escape closes the hierarchy and restores focus to the trigger', async () => {
    render(<Host items={navigationItems} />);
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'First' }), { key: 'Escape' });
    await waitFor(() => expect(screen.getByTestId('open-state').textContent).toBe('closed'));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Trigger' })));
  });

  test('Right Arrow opens a submenu and focuses its first enabled item; Left Arrow returns to the parent', async () => {
    const items: DropdownMenuEntry[] = [
      item('more', 'More', {
        submenuItems: [
          item('child-disabled', 'Child disabled', { disabled: true }),
          item('child-one', 'Child one'),
          item('child-two', 'Child two'),
        ],
      }),
      item('other', 'Other'),
    ];
    render(<Host items={items} />);
    const parent = screen.getByRole('menuitem', { name: 'More' });
    fireEvent.keyDown(parent, { key: 'ArrowRight' });
    const child = await screen.findByRole('menuitem', { name: 'Child one' });
    await waitFor(() => expect(document.activeElement).toBe(child));
    fireEvent.keyDown(child, { key: 'ArrowLeft' });
    await waitFor(() => expect(document.activeElement).toBe(parent));
    expect(screen.queryByRole('menuitem', { name: 'Child one' })).toBeNull();
  });

  test('searchable menus keep the search field as primary focus and Arrow Down can enter the menu rows', () => {
    render(<Host items={navigationItems} searchable />);
    const search = screen.getByPlaceholderText('Type to search...');
    expect(document.activeElement).toBe(search);
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'First' }));
  });
});
