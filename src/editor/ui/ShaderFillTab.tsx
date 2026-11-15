import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAtomValue, useSetAtom } from 'jotai';
import type { CanvasNode } from '@/code/parsing/parser';
import { activeFilePathAtom } from '@/code/project/active-file-store';
import { modifyProjectFile } from '@/code/project/modify-file';
import { installBuiltInCodeComponent, projectFS, projectVersionAtom } from '@/code/project/project-fs';
import { parseComponentControlsMeta, type ComponentControlDef } from '@/code/components/controls-parser';
import { queueMutations, flushNow } from '@/code/mutation/mutation-queue';
import { getNodeFromCache } from '@/code/stores/store';
import { setInstanceProp } from '@/editor/tools/ComponentPropsTool/instance-props';
import { CodeComponentControlField } from '@/editor/tools/ComponentPropsTool/CodeComponentControlField';
import { ToolRow } from '@/editor/controls';
import { SHADER_LIBRARY_ITEMS } from '@/shared/insert-items/element-data';
import InsertItemPreview from '@/editor/media/InsertItemPreview';
import { getToolbarItemConfig } from '@/canvas/drag/toolbar-item-config';
import { trace } from '@/shared/debug-trace';
import { fieldSurfaceZ } from '@/shared/field-surface-elevation';
import { shaderFillHostMutations } from './managed-fill-styles';
import { shaderLayerVisible } from '@/shared/managed-fill-breakpoints';
import { addProjectShader, listProjectShaders } from './create-shader-fill';
import { updateScopedFill, type ManagedFillScope } from './responsive-managed-fill';

interface Props {
  node: CanvasNode | null;
  scope?: ManagedFillScope | null;
  libraryOnly?: boolean;
  onSelected?: () => void;
  onDismissLibrary?: () => void;
}

function managedShaderChild(node: CanvasNode | null, scope?: ManagedFillScope | null): CanvasNode | null {
  if (!node) return null;
  for (const id of node.children || []) {
    const child = getNodeFromCache(id);
    if (child?.attrs?.['data-field-shader-layer'] === 'true' && shaderLayerVisible(node, child, scope?.target.id ?? '')) return child;
  }
  return null;
}

function propValue(node: CanvasNode, name: string, def: ComponentControlDef): string {
  const explicit = node.componentProps?.[name] ?? node.attrs?.[name];
  if (explicit != null) return String(explicit);
  if (def.default == null) return '';
  return typeof def.default === 'object' ? JSON.stringify(def.default) : String(def.default);
}

function expressionControl(def: ComponentControlDef): boolean {
  return def.type === 'slider' || def.type === 'number' || def.type === 'toggle';
}

function flattenControls(
  controls: Record<string, ComponentControlDef>,
): Array<{ name: string; def: ComponentControlDef; section?: string }> {
  const out: Array<{ name: string; def: ComponentControlDef; section?: string }> = [];
  for (const [name, def] of Object.entries(controls)) {
    if (def.type === 'group' && def.controls) {
      for (const [nestedName, nestedDef] of Object.entries(def.controls)) {
        out.push({ name: nestedName, def: nestedDef, section: def.label });
      }
    } else if (def.type !== 'slot' && def.type !== 'objectList' && def.type !== 'transition') {
      out.push({ name, def });
    }
  }
  return out;
}

export default function ShaderFillTab({ node, scope, libraryOnly = false, onSelected, onDismissLibrary }: Props) {
  const activeFilePath = useAtomValue(activeFilePathAtom);
  const projectVersion = useAtomValue(projectVersionAtom);
  const bumpProjectVersion = useSetAtom(projectVersionAtom);
  const child = managedShaderChild(node, scope);
  const activeTag = child?.type || node?.attrs?.['data-field-shader-fill'] || '';
  const sidecarAnchorRef = useRef<HTMLDivElement>(null);
  const [sidecarPos, setSidecarPos] = useState<{ left: number; top: number; zIndex: number } | null>(null);
  const [shaderSearch, setShaderSearch] = useState('');
  const [newShaderName, setNewShaderName] = useState<string | null>(null);
  const projectShaders = useMemo(() => listProjectShaders(), [projectVersion]);

  useLayoutEffect(() => {
    if (!libraryOnly) { setSidecarPos(null); return; }
    const anchor = sidecarAnchorRef.current;
    const popup = anchor?.closest<HTMLElement>('[data-tool-popup]');
    if (!popup) return;
    const place = () => {
      const rect = popup.getBoundingClientRect();
      const width = 360;
      const gap = 12;
      const left = rect.left >= width + gap + 12 ? rect.left - width - gap : Math.min(window.innerWidth - width - 12, rect.right + gap);
      setSidecarPos({ left: Math.max(12, left), top: Math.max(12, rect.top), zIndex: fieldSurfaceZ('rich-popup', popup) + 1 });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [libraryOnly]);

  const controlsMeta = useMemo(() => {
    if (!child?.type) return null;
    const source = projectFS.readFile(`components/${child.type}.tsx`);
    return source ? parseComponentControlsMeta(source) : null;
  }, [child?.type, projectVersion]);

  const controls = useMemo(
    () => controlsMeta ? flattenControls(controlsMeta.controls) : [],
    [controlsMeta],
  );

  const applyTag = (tag: string, installed = false) => {
    if (!node) return;
    if (scope) {
      updateScopedFill(node.id, scope, { kind: 'shader', tag });
      flushNow();
      if (installed) bumpProjectVersion(version => version + 1);
      onSelected?.();
      return;
    }
    const prior = managedShaderChild(node, scope);
    const shaderId = `${node.id}__shader_fill`;
    const mutations: Parameters<typeof queueMutations>[0] = [];
    if (prior) mutations.push({ type: 'removeNode', nodeId: prior.id });
    mutations.push(...shaderFillHostMutations(node, tag));
    mutations.push({
      type: 'addNode',
      parentId: node.id,
      index: 0,
      node: {
        id: shaderId,
        type: tag,
        name: 'Shader Fill',
        attrs: { 'data-field-shader-layer': 'true' },
        styles: {
          position: 'absolute',
          inset: '0',
          width: '100%',
          height: '100%',
          borderRadius: 'inherit',
          overflow: 'hidden',
          zIndex: '-1',
          pointerEvents: 'none',
        },
      },
    });
    queueMutations(mutations);
    flushNow();
    if (installed) bumpProjectVersion(version => version + 1);
    trace.action('fill:shader-applied', { nodeId: node.id, tag, installed });
    onSelected?.();
  };

  const applyShader = (itemId: string) => {
    if (!node) return;
    const tag = getToolbarItemConfig(itemId)?.elementType;
    if (!tag || !/^[A-Z]/.test(tag)) return;
    const installed = installBuiltInCodeComponent(projectFS, tag);
    if (installed !== null) applyTag(tag, installed);
  };

  const updateProp = (name: string, def: ComponentControlDef, value: string) => {
    if (!child || !activeFilePath) return;
    if (node && scope) {
      updateScopedFill(node.id, scope, { kind: 'shader-prop', name, value, expression: expressionControl(def) });
      return;
    }
    modifyProjectFile(activeFilePath, code =>
      setInstanceProp(code, child.id, child.type, name, value, expressionControl(def)),
    );
    trace.action('fill:shader-prop', { nodeId: node?.id, shader: child.type, prop: name });
  };

  if (libraryOnly) {
    const query = shaderSearch.trim().toLowerCase();
    const filteredItems = SHADER_LIBRARY_ITEMS.filter(item => item.name.toLowerCase().includes(query));
    const filteredProjectShaders = projectShaders.filter(item => item.label.toLowerCase().includes(query));
    return (
      <div ref={sidecarAnchorRef} className="min-h-[360px] flex items-center justify-center text-[12px] text-[var(--text-disabled)]">
        Choose a shader from the gallery.
        {sidecarPos && createPortal(
          <div
            data-field-floating-surface
            data-modal-root
            data-field-no-canvas-input
            data-shader-fill-gallery
            className="fixed w-[360px] max-h-[min(620px,calc(100vh-24px))] overflow-hidden rounded-[12px] border border-[var(--border-light)] bg-[var(--bg-surface)] shadow-[var(--shadow-lg)] flex flex-col"
            style={sidecarPos}
          >
            <div className="h-[48px] px-3 flex items-center justify-between border-b border-[var(--border-light)]">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-medium text-[var(--text-primary)]">Shader fills</span>
                <span className="px-2 py-0.5 rounded-[6px] border border-[var(--control-border)] text-[10px] text-[var(--text-secondary)]">Beta</span>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setNewShaderName('')} disabled={!node} className="w-9 h-9 rounded-[8px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]" title="Create shader" aria-label="Create shader">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                </button>
                <button type="button" onClick={onDismissLibrary} className="w-9 h-9 rounded-[8px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]" title="Close shader gallery" aria-label="Close shader gallery">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </div>
            </div>
            {newShaderName !== null && (
              <form
                className="p-4 border-b border-[var(--border-light)] flex flex-col gap-3"
                onSubmit={event => {
                  event.preventDefault();
                  if (!node || !newShaderName.trim()) return;
                  applyTag(addProjectShader(newShaderName), true);
                  setNewShaderName(null);
                }}
              >
                <label className="flex flex-col gap-2 text-[13px] text-[var(--text-primary)]">
                  Shader name
                  <input autoFocus required maxLength={80} value={newShaderName} onChange={event => setNewShaderName(event.target.value)} className="rounded-[7px] border border-[var(--control-border)] bg-[var(--control-bg)] px-3 py-2" />
                </label>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setNewShaderName(null)} className="rounded-[7px] px-3 py-2 hover:bg-[var(--bg-hover)] text-[13px]">Cancel</button>
                  <button type="submit" disabled={!newShaderName.trim()} className="rounded-[7px] bg-[var(--control-bg)] px-3 py-2 text-[13px]">Create</button>
                </div>
              </form>
            )}
            <div className="p-4 border-b border-[var(--border-light)]">
              <div className="h-9 rounded-[7px] border border-[var(--control-border)] bg-[var(--control-bg)] flex items-center gap-2 px-3">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
                <input value={shaderSearch} onChange={(event) => setShaderSearch(event.target.value)} placeholder="Search" className="min-w-0 flex-1 bg-transparent outline-none text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)]" />
              </div>
            </div>
            <div className="p-4 overflow-y-auto">
              {filteredProjectShaders.length > 0 && (
                <div className="mb-4">
                  <div className="mb-2 text-[12px] text-[var(--text-secondary)]">Project shaders</div>
                  {filteredProjectShaders.map(shader => (
                    <button type="button" key={shader.tag} aria-pressed={shader.tag === activeTag} onClick={() => applyTag(shader.tag)} className="block w-full rounded-[7px] hover:bg-[var(--bg-hover)] px-2 py-2 text-left text-[13px]">
                      {shader.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="mb-3 text-[12px] text-[var(--text-secondary)]">By field</div>
              <div className="grid grid-cols-2 gap-3">
                {filteredItems.map(item => {
                  const cfg = getToolbarItemConfig(item.id);
                  const tag = cfg?.elementType || '';
                  const active = tag !== '' && activeTag === tag;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => applyShader(item.id)}
                      className={`overflow-hidden text-left rounded-[10px] border transition-colors cursor-pointer ${active ? 'border-[var(--accent)] bg-[var(--bg-hover)]' : 'border-[var(--control-border)] hover:border-[var(--control-border-hover)]'}`}
                      aria-pressed={active}
                      title={item.name}
                    >
                      <span className="block w-full aspect-[1.25] overflow-hidden"><InsertItemPreview itemId={item.id} iconKey={item.iconKey} /></span>
                      <span className="block px-2 py-2 text-[12px] text-[var(--text-primary)] truncate">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}
      </div>
    );
  }

  if (!child) {
    return (
      <div className="py-8 text-center text-[11px] text-[var(--text-disabled)]">
        Choose a shader from Libraries.
      </div>
    );
  }

  if (!controlsMeta || controls.length === 0) {
    return (
      <div className="flex flex-col gap-1 py-2">
        <div className="text-[11px] text-[var(--text-primary)]">{controlsMeta?.label || child.type}</div>
        <div className="text-[10px] text-[var(--text-disabled)]">This shader uses its built-in defaults.</div>
      </div>
    );
  }

  const activeLibraryItem = SHADER_LIBRARY_ITEMS.find(item => getToolbarItemConfig(item.id)?.elementType === activeTag);
  let section = '';
  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full aspect-square max-h-[300px] overflow-hidden rounded-[10px] border border-[var(--control-border)] bg-[var(--canvas-bg)]">
        {activeLibraryItem ? (
          <InsertItemPreview itemId={activeLibraryItem.id} iconKey={activeLibraryItem.iconKey} />
        ) : null}
      </div>
      <div className="px-0.5 pb-1">
        <div className="text-[11px] text-[var(--text-primary)]">{controlsMeta.label || child.type}</div>
        {controlsMeta.comment && <div className="text-[10px] text-[var(--text-disabled)] mt-0.5">{controlsMeta.comment}</div>}
      </div>
      {controls.map(({ name, def, section: nextSection }) => {
        const showSection = !!nextSection && nextSection !== section;
        if (nextSection) section = nextSection;
        return (
          <div key={name} className="contents">
            {showSection && <div className="text-[10px] text-[var(--text-disabled)] px-0.5 pt-1">{nextSection}</div>}
            <ToolRow label={def.label || name} hideCreateVariable>
              <CodeComponentControlField
                controlDef={def}
                value={propValue(child, name, def)}
                onChange={(value) => updateProp(name, def, value)}
              />
            </ToolRow>
          </div>
        );
      })}
    </div>
  );
}
