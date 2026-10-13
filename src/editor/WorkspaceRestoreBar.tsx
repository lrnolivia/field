// Legacy compatibility seam.
//
// The project/page title used to swap between LeftHeader (embedded) and a
// second restore-bar tree (compact/full pill). That remounted ProjectChip and
// its menus every time the workspace preset changed, producing a visible
// re-render. LeftHeader is now the single persistent title surface and morphs
// between embedded / compact-pill / full-pill geometry in place.
export default function WorkspaceRestoreBar() {
  return null;
}
