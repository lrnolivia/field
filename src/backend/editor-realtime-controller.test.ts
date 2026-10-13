import { describe, expect, it, vi } from 'vitest';
import type { ProjectData } from './types';
import type { FieldProjectEvent } from './project-events';
import { createEditorRealtimeController, type EditorRealtimeStatus } from './editor-realtime-controller';

const project = (text: string): ProjectData => ({
  format: 'revyme-v1',
  files: { 'app/page.client.tsx': text },
});

const event = (overrides: Partial<FieldProjectEvent> = {}): FieldProjectEvent => ({
  type: 'project-change',
  projectId: 'site',
  kind: 'document',
  changedAt: '2026-09-26T06:00:00.000Z',
  revision: '"r2"',
  sourceSessionId: 'other-session',
  ...overrides,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup() {
  let knownRevision = '"r1"';
  let dirty = false;
  const statuses: EditorRealtimeStatus[] = [];
  const applyRemoteProject = vi.fn((_data: ProjectData, revision: string) => {
    knownRevision = revision;
  });
  const enterConflict = vi.fn();
  const refreshMetadata = vi.fn(async () => {});
  const peekRemoteProject = vi.fn(async () => ({ data: project('remote'), revision: '"r2"' }));

  const controller = createEditorRealtimeController({
    projectId: 'site',
    sessionId: 'this-session',
    getKnownRevision: () => knownRevision,
    peekRemoteProject,
    isDirty: () => dirty,
    applyRemoteProject,
    enterConflict,
    refreshMetadata,
    setStatus: (status) => statuses.push(status),
  });

  return {
    controller,
    statuses,
    applyRemoteProject,
    enterConflict,
    refreshMetadata,
    peekRemoteProject,
    setDirty(value: boolean) { dirty = value; },
    setKnownRevision(value: string) { knownRevision = value; },
    getKnownRevision() { return knownRevision; },
  };
}

describe('editor realtime controller', () => {
  it('ignores own-session document events and other projects', async () => {
    const ctx = setup();

    await ctx.controller.handleEvent(event({ sourceSessionId: 'this-session' }));
    await ctx.controller.handleEvent(event({ projectId: 'other-site' }));

    expect(ctx.peekRemoteProject).not.toHaveBeenCalled();
    expect(ctx.applyRemoteProject).not.toHaveBeenCalled();
    expect(ctx.enterConflict).not.toHaveBeenCalled();
  });

  it('adopts a clean newer document revision', async () => {
    const ctx = setup();

    await ctx.controller.handleEvent(event());

    expect(ctx.peekRemoteProject).toHaveBeenCalledTimes(1);
    expect(ctx.applyRemoteProject).toHaveBeenCalledWith(project('remote'), '"r2"');
    expect(ctx.getKnownRevision()).toBe('"r2"');
    expect(ctx.enterConflict).not.toHaveBeenCalled();
    expect(ctx.statuses).toEqual(['refreshing', 'idle']);
  });

  it('does nothing when the event already names the known revision', async () => {
    const ctx = setup();
    ctx.setKnownRevision('"r2"');

    await ctx.controller.handleEvent(event());

    expect(ctx.peekRemoteProject).not.toHaveBeenCalled();
    expect(ctx.applyRemoteProject).not.toHaveBeenCalled();
  });

  it('turns a remote document event into immediate conflict while local work is dirty', async () => {
    const ctx = setup();
    ctx.setDirty(true);

    await ctx.controller.handleEvent(event());

    expect(ctx.peekRemoteProject).not.toHaveBeenCalled();
    expect(ctx.applyRemoteProject).not.toHaveBeenCalled();
    expect(ctx.enterConflict).toHaveBeenCalledTimes(1);
    expect(ctx.statuses[ctx.statuses.length - 1]).toBe('conflict');
  });

  it('fails closed if local work starts while the authoritative fetch is in flight', async () => {
    const gate = deferred<{ data: ProjectData; revision: string } | null>();
    let dirty = false;
    const applyRemoteProject = vi.fn();
    const enterConflict = vi.fn();
    const controller = createEditorRealtimeController({
      projectId: 'site',
      sessionId: 'this-session',
      getKnownRevision: () => '"r1"',
      peekRemoteProject: () => gate.promise,
      isDirty: () => dirty,
      applyRemoteProject,
      enterConflict,
    });

    const handling = controller.handleEvent(event());
    dirty = true;
    gate.resolve({ data: project('remote'), revision: '"r2"' });
    await handling;

    expect(applyRemoteProject).not.toHaveBeenCalled();
    expect(enterConflict).toHaveBeenCalledTimes(1);
  });

  it('prevents an older remote fetch from overwriting a newer event result', async () => {
    const first = deferred<{ data: ProjectData; revision: string } | null>();
    const second = deferred<{ data: ProjectData; revision: string } | null>();
    const peeks = [first.promise, second.promise];
    let peekIndex = 0;
    let known = '"r1"';
    const applied: string[] = [];
    const controller = createEditorRealtimeController({
      projectId: 'site',
      sessionId: 'this-session',
      getKnownRevision: () => known,
      peekRemoteProject: () => peeks[peekIndex++],
      isDirty: () => false,
      applyRemoteProject: (_data, revision) => {
        known = revision;
        applied.push(revision);
      },
      enterConflict: vi.fn(),
    });

    const older = controller.handleEvent(event({ revision: '"r2"' }));
    const newer = controller.handleEvent(event({ revision: '"r3"', changedAt: '2026-09-26T06:00:01.000Z' }));

    second.resolve({ data: project('newest'), revision: '"r3"' });
    await newer;
    first.resolve({ data: project('older'), revision: '"r2"' });
    await older;

    expect(applied).toEqual(['"r3"']);
  });

  it('reconciles a missed revision but no-ops when the revision still matches', async () => {
    const ctx = setup();

    ctx.peekRemoteProject.mockResolvedValueOnce({ data: project('same'), revision: '"r1"' });
    await ctx.controller.reconcile();
    expect(ctx.applyRemoteProject).not.toHaveBeenCalled();

    ctx.peekRemoteProject.mockResolvedValueOnce({ data: project('missed'), revision: '"r9"' });
    await ctx.controller.reconcile();
    expect(ctx.applyRemoteProject).toHaveBeenCalledWith(project('missed'), '"r9"');
  });

  it('reconnect reconciliation preserves dirty local work instead of applying a missed revision', async () => {
    const ctx = setup();
    ctx.setDirty(true);
    ctx.peekRemoteProject.mockResolvedValueOnce({ data: project('missed'), revision: '"r9"' });

    await ctx.controller.reconcile();

    expect(ctx.applyRemoteProject).not.toHaveBeenCalled();
    expect(ctx.enterConflict).toHaveBeenCalledTimes(1);
  });

  it('refreshes editor metadata without replacing the document model', async () => {
    const ctx = setup();

    await ctx.controller.handleEvent(event({ kind: 'metadata', revision: undefined }));

    expect(ctx.refreshMetadata).toHaveBeenCalledTimes(1);
    expect(ctx.peekRemoteProject).not.toHaveBeenCalled();
    expect(ctx.applyRemoteProject).not.toHaveBeenCalled();
  });
});
