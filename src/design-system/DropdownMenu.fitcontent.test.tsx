// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import DropdownMenu, { type DropdownMenuEntry } from './DropdownMenu';

afterEach(cleanup);

const items: DropdownMenuEntry[] = [
  { id: 'one', label: 'One', onClick: () => {} },
  { id: 'two', label: 'Two', onClick: () => {} },
];

const panel = () => document.querySelector('[role="menu"]') as HTMLElement;

describe('DropdownMenu fitContentHeight', () => {
  test('keeps the shared 360px cap by default', () => {
    render(<DropdownMenu isOpen onClose={() => {}} items={items} anchorPoint={{ x: 10, y: 10 }} />);
    expect(panel().style.maxHeight).toBe('min(360px, calc(100dvh - 16px))');
  });

  test('lets an opted-in root menu grow to content while still clamping to the viewport', () => {
    render(
      <DropdownMenu
        isOpen
        onClose={() => {}}
        items={items}
        anchorPoint={{ x: 10, y: 10 }}
        fitContentHeight
      />,
    );
    expect(panel().style.maxHeight).toBe('calc(100dvh - 16px)');
    expect(panel().style.overflowY).toBe('auto');
  });
});
