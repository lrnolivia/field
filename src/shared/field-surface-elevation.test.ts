import { describe, expect, it } from 'vitest';
import { FIELD_SURFACE_Z, fieldSurfaceScopeFor, fieldSurfaceZ } from './field-surface-elevation';

describe('field floating-surface elevation contract', () => {
  it('keeps workspace surfaces in strict parent -> child order', () => {
    expect(FIELD_SURFACE_Z.inspector).toBeLessThan(FIELD_SURFACE_Z.richPopup);
    expect(FIELD_SURFACE_Z.richPopup).toBeLessThan(FIELD_SURFACE_Z.menuBackdrop);
    expect(FIELD_SURFACE_Z.menuBackdrop).toBeLessThan(FIELD_SURFACE_Z.menu);
    expect(FIELD_SURFACE_Z.menu).toBeLessThan(FIELD_SURFACE_Z.submenu);
    expect(FIELD_SURFACE_Z.submenu).toBeLessThan(FIELD_SURFACE_Z.select);
    expect(FIELD_SURFACE_Z.select).toBeLessThan(FIELD_SURFACE_Z.modal);
  });

  it('keeps modal descendants above the modal and modal-hosted rich popup', () => {
    expect(FIELD_SURFACE_Z.modal).toBeLessThan(FIELD_SURFACE_Z.modalRichPopup);
    expect(FIELD_SURFACE_Z.modalRichPopup).toBeLessThan(FIELD_SURFACE_Z.modalMenuBackdrop);
    expect(FIELD_SURFACE_Z.modalMenuBackdrop).toBeLessThan(FIELD_SURFACE_Z.modalMenu);
    expect(FIELD_SURFACE_Z.modalMenu).toBeLessThan(FIELD_SURFACE_Z.modalSubmenu);
    expect(FIELD_SURFACE_Z.modalSubmenu).toBeLessThan(FIELD_SURFACE_Z.modalSelect);
  });

  it('inherits modal scope through a portalled rich-popup marker', () => {
    const modal = document.createElement('div');
    modal.dataset.modalRoot = '';
    const modalChild = document.createElement('button');
    modal.appendChild(modalChild);
    document.body.appendChild(modal);

    const portalledPopup = document.createElement('div');
    portalledPopup.dataset.fieldSurfaceScope = 'modal';
    const popupChild = document.createElement('button');
    portalledPopup.appendChild(popupChild);
    document.body.appendChild(portalledPopup);

    expect(fieldSurfaceScopeFor(modalChild)).toBe('modal');
    expect(fieldSurfaceScopeFor(popupChild)).toBe('modal');
    expect(fieldSurfaceZ('select', popupChild)).toBe(FIELD_SURFACE_Z.modalSelect);

    modal.remove();
    portalledPopup.remove();
  });
});
