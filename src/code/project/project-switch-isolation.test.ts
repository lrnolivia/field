import { beforeEach, describe, expect, it } from 'vitest';
import { getDefaultStore } from 'jotai';
import {
  InMemoryProjectFS,
  MAIN_BRANCH_ID,
  projectFS,
  projectVersionAtom,
  resetProjectFS,
  stableProjectVersionAtom,
} from '@/code/project/project-fs';
import { activeCodeAtom, activeFilePathAtom, componentBreadcrumbAtom } from '@/code/project/active-file-store';
import { nodesAtom, selectedIdsAtom } from '@/code/stores/store';
import { getCurrentCode } from '@/code/mutation/mutation-queue';
import { resetProjectSession } from '@/code/project/project-session';

const HOME = 'app/page.client.tsx';
const page = (id: string, text: string) => `export default function Page(){ return <div data-id="${id}">${text}</div>; }`;

describe('same-document project switch isolation', () => {
  beforeEach(() => {
    resetProjectFS(new Map([[HOME, page('project-a', 'A')]]));
    const store = getDefaultStore();
    store.set(activeFilePathAtom, HOME);
    store.set(componentBreadcrumbAtom, []);
    store.set(selectedIdsAtom, []);
    store.set(projectVersionAtom, 0);
    store.set(stableProjectVersionAtom, 0);
    resetProjectSession(HOME, projectFS.readFile(HOME) ?? '');
  });

  it('replaces old branches and lands the new envelope on its own main', () => {
    const fs = new InMemoryProjectFS(new Map([[HOME, 'A-main']]));
    expect(fs.createBranch('stale-a')).toBeNull();
    expect(fs.switchBranch('stale-a')).toBeNull();
    fs.writeFile(HOME, 'A-branch');

    const error = fs.fromEnvelope({
      format: 'revyme-v2',
      files: { [HOME]: 'B-main' },
      branches: {
        'b-work': {
          files: { [HOME]: 'B-branch' },
          baseSnapshot: { [HOME]: 'B-main' },
          status: 'dirty',
          parentId: MAIN_BRANCH_ID,
          order: 0,
          createdAt: 1,
          lastEditedAt: 1,
        },
      },
      activeBranchId: 'b-work',
      mainBranchId: MAIN_BRANCH_ID,
    });

    expect(error).toBeNull();
    expect(fs.listBranches().map((branch) => branch.id)).toEqual([MAIN_BRANCH_ID, 'b-work']);
    expect(fs.getActiveBranchId()).toBe('b-work');
    expect(fs.readFile(HOME)).toBe('B-branch');
    expect(fs.readBranchFile(MAIN_BRANCH_ID, HOME)).toBe('B-main');
    expect(fs.readBranchFile('stale-a', HOME)).toBeNull();
  });

  it('invalidates cached code/nodes and re-seeds mutation state for project B', () => {
    const store = getDefaultStore();

    expect(store.get(activeCodeAtom)).toContain('project-a');
    expect(store.get(nodesAtom).has('project-a')).toBe(true);
    store.set(selectedIdsAtom, ['project-a']);
    store.set(componentBreadcrumbAtom, ['components/Old.tsx']);

    const b = page('project-b', 'B');
    const error = projectFS.fromEnvelope({
      format: 'revyme-v1',
      files: { [HOME]: b },
    });
    expect(error).toBeNull();

    resetProjectSession(HOME, b);

    expect(store.get(activeCodeAtom)).toBe(b);
    expect(store.get(nodesAtom).has('project-a')).toBe(false);
    expect(store.get(nodesAtom).has('project-b')).toBe(true);
    expect(store.get(selectedIdsAtom)).toEqual([]);
    expect(store.get(componentBreadcrumbAtom)).toEqual([]);
    expect(getCurrentCode()).toBe(b);
  });

  it('hydrateBranches replaces rather than accumulates branch state', () => {
    const fs = new InMemoryProjectFS(new Map([[HOME, 'main']]));
    fs.createBranch('old');
    fs.hydrateBranches({
      fresh: {
        files: { [HOME]: 'fresh' },
        baseSnapshot: { [HOME]: 'main' },
        status: 'dirty',
      },
    }, 'fresh');

    expect(fs.listBranches().map((branch) => branch.id)).toEqual([MAIN_BRANCH_ID, 'fresh']);
    expect(fs.getActiveBranchId()).toBe('fresh');
  });
});
