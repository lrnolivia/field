// FIELD_SCROLL_INTEGRITY_CONTRACT_TEST_20260925
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('field scroll integrity outside Inspector font picker', () => {
  it('bounds shared dropdown menus and makes them scrollable', () => {
    const file = read('src/design-system/DropdownMenu.tsx');
    expect(file).toContain('FIELD_SCROLL_INTEGRITY_DROPDOWN_20260925');
    expect(file).toContain('data-scroll-surface="dropdown-menu"');
    expect(file).toContain("maxHeight: 'min(360px, calc(100dvh - 16px))'");
    expect(file).toContain("overflowY: 'auto'");
    expect(file).toContain("overflowX: 'hidden'");
    expect(file).toContain("overscrollBehavior: 'contain'");
    expect(file).toContain('onWheel={(event) => event.stopPropagation()}');
  });

  it('keeps shared modal content shrinkable and independently scrollable', () => {
    const file = read('src/design-system/Modal.tsx');
    expect(file).toContain('data-scroll-surface="modal-content"');
    expect(file).toContain('flex-1 min-h-0 overflow-auto overscroll-contain');
    expect(file).toContain('onWheel={(e) => e.stopPropagation()}');
  });

  it('keeps the dashboard project surface scrollable', () => {
    const file = read('src/styles/dashboard.css');
    expect(file).toContain('.field-dashboard-content');
    expect(file).toContain('min-height: 0');
    expect(file).toContain('overflow: auto');
    expect(file).toContain('overscroll-behavior: contain');
  });

  it('preserves scroll contracts on other audited product surfaces', () => {
    const settings = read('src/editor/overlays/SettingsOverlay.tsx');
    const templates = read('src/cloud/NewWebsiteTemplatesModal.tsx');
    const comments = read('src/editor/CommentsListPanel.tsx');
    const collab = read('src/editor/collab/CollaboratorsModal.tsx');
    const component = read('src/editor/component-editor/ComponentEditorOverlay.tsx');

    expect(settings).toContain('overflow-y-auto overscroll-contain');
    expect(templates).toContain('overflow-auto overscroll-contain');
    expect(comments).toContain('overflow-y-auto overscroll-contain');
    expect(collab).toContain('overflow-y-auto overscroll-contain');
    expect(component).toContain('overflow-y-auto overscroll-contain');
  });

  it('stays scoped outside Inspector font scrolling', () => {
    const dropdown = read('src/design-system/DropdownMenu.tsx');
    const modal = read('src/design-system/Modal.tsx');
    expect(dropdown).toContain('FIELD_SCROLL_INTEGRITY_DROPDOWN_20260925');
    expect(modal).toContain('FIELD_SCROLL_INTEGRITY_MODAL_20260925');
    expect(dropdown).not.toContain('FontFamilyPopup');
    expect(modal).not.toContain('FontFamilyPopup');
  });
});
