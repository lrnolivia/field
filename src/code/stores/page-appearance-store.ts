import { atom } from 'jotai';
import { activeFilePathAtom } from '@/code/project/active-file-store';
import { projectFS, projectVersionAtom } from '@/code/project/project-fs';
import { bumpProjectVersion } from '@/code/project/modify-file';
import {
  PAGE_APPEARANCE_FILE_PATH,
  hasPageAppearanceEntries,
  parsePageAppearanceDocument,
  patchPageAppearance,
  removePageAppearance,
  serializePageAppearanceDocument,
  type PageAppearance,
} from '@/code/project/page-appearance-config';
import { trace } from '@/shared/debug-trace';

export interface ActivePageAppearanceState {
  filePath: string;
  appearance: PageAppearance | null;
}

export const activePageAppearanceAtom = atom<ActivePageAppearanceState>((get) => {
  get(projectVersionAtom);
  const filePath = get(activeFilePathAtom);
  const document = parsePageAppearanceDocument(projectFS.readFile(PAGE_APPEARANCE_FILE_PATH));
  return { filePath, appearance: document.pages[filePath] ?? null };
});

function writeDocument(next: ReturnType<typeof parsePageAppearanceDocument>): void {
  if (hasPageAppearanceEntries(next)) {
    projectFS.writeFile(PAGE_APPEARANCE_FILE_PATH, serializePageAppearanceDocument(next));
  } else if (projectFS.exists(PAGE_APPEARANCE_FILE_PATH)) {
    projectFS.deleteFile(PAGE_APPEARANCE_FILE_PATH);
  }
  bumpProjectVersion();
}

export const pageAppearanceOps = {
  patch(filePath: string, patch: Partial<PageAppearance>): void {
    const current = parsePageAppearanceDocument(projectFS.readFile(PAGE_APPEARANCE_FILE_PATH));
    writeDocument(patchPageAppearance(current, filePath, patch));
    trace.action('page-appearance:patch', { filePath, patch });
  },

  reset(filePath: string): void {
    const current = parsePageAppearanceDocument(projectFS.readFile(PAGE_APPEARANCE_FILE_PATH));
    writeDocument(removePageAppearance(current, filePath));
    trace.action('page-appearance:reset', { filePath });
  },
};
