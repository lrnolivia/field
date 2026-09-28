import { useLayoutEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { setWorkspaceModeAtom, workspaceModeAtom } from './workspace-mode-store';

/** Normalize older per-pane saved preferences before the editor first paints. */
export default function WorkspaceModeCoordinator() {
  const mode = useAtomValue(workspaceModeAtom);
  const setMode = useSetAtom(setWorkspaceModeAtom);
  useLayoutEffect(() => { setMode(mode); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
