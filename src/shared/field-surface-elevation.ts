// field floating-surface elevation contract.
// The order is semantic, not decorative: each child interaction surface must
// render above the surface that spawned it without random one-off z-index bumps.

export type FieldSurfaceScope = 'workspace' | 'modal';
export type FieldSurfaceKind =
  | 'rich-popup'
  | 'menu-backdrop'
  | 'menu'
  | 'submenu'
  | 'select';

export const FIELD_SURFACE_Z = {
  inspector: 5000,

  richPopup: 90000,
  menuBackdrop: 99997,
  menu: 99998,
  submenu: 99999,
  select: 100000,

  modal: 100010,
  modalRichPopup: 100020,
  modalMenuBackdrop: 100027,
  modalMenu: 100028,
  modalSubmenu: 100029,
  modalSelect: 100030,
} as const;

export function fieldSurfaceScopeFor(anchor: Element | null | undefined): FieldSurfaceScope {
  if (!anchor) return 'workspace';
  if (anchor.closest('[data-field-surface-scope="modal"], [data-modal-root]')) return 'modal';
  return 'workspace';
}

export function fieldSurfaceZ(kind: FieldSurfaceKind, anchor: Element | null | undefined): number {
  const modal = fieldSurfaceScopeFor(anchor) === 'modal';
  if (modal) {
    if (kind === 'rich-popup') return FIELD_SURFACE_Z.modalRichPopup;
    if (kind === 'menu-backdrop') return FIELD_SURFACE_Z.modalMenuBackdrop;
    if (kind === 'menu') return FIELD_SURFACE_Z.modalMenu;
    if (kind === 'submenu') return FIELD_SURFACE_Z.modalSubmenu;
    return FIELD_SURFACE_Z.modalSelect;
  }

  if (kind === 'rich-popup') return FIELD_SURFACE_Z.richPopup;
  if (kind === 'menu-backdrop') return FIELD_SURFACE_Z.menuBackdrop;
  if (kind === 'menu') return FIELD_SURFACE_Z.menu;
  if (kind === 'submenu') return FIELD_SURFACE_Z.submenu;
  return FIELD_SURFACE_Z.select;
}
