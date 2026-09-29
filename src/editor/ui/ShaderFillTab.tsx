import { useMemo } from 'react';
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
import { SHADER_THUMBS } from '@/shared/insert-items/shader-thumb-map';
import { getToolbarItemConfig } from '@/canvas/drag/toolbar-item-config';
import { trace } from '@/shared/debug-trace';

interface Props {
  node: CanvasNode | null;
  libraryOnly?: boolean;
}

function managedShaderChild(node: CanvasNode | null): CanvasNode | null {
  if (!node) return null;
  for (const id of node.children || []) {
    const child = getNodeFromCache(id);
    if (child?.attrs?.['data-field-shader-layer'] === 'true') return child;
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

export default function ShaderFillTab({ node, libraryOnly = false }: Props) {
  const activeFilePath = useAtomValue(activeFilePathAtom);
  useAtomValue(projectVersionAtom);
  const bumpProjectVersion = useSetAtom(projectVersionAtom);
  const child = managedShaderChild(node);
  const activeTag = node?.attrs?.['data-field-shader-fill'] || child?.type || '';

  const controlsMeta = useMemo(() => {
    if (!child?.type) return null;
    const source = projectFS.readFile(`components/${child.type}.tsx`);
    return source ? parseComponentControlsMeta(source) : null;
  }, [child?.type]);

  const controls = useMemo(
    () => controlsMeta ? flattenControls(controlsMeta.controls) : [],
    [controlsMeta],
  );

  const applyShader = (itemId: string) => {
    if (!node) return;
    const toolbarItem = getToolbarItemConfig(itemId);
    if (!toolbarItem || !/^[A-Z]/.test(toolbarItem.elementType)) return;
    const tag = toolbarItem.elementType;
    const installed = installBuiltInCodeComponent(projectFS, tag);
    if (installed === null) return;
    if (installed) bumpProjectVersion(version => version + 1);

    const prior = managedShaderChild(node);
    const shaderId = `${node.id}__shader_fill`;
    const hostPosition = (node.styles?.position || '').trim();
    const mutations: Parameters<typeof queueMutations>[0] = [];
    if (prior) mutations.push({ type: 'removeNode', nodeId: prior.id });
    mutations.push({
      type: 'updateStyles',
      nodeId: node.id,
      styles: {
        ...(hostPosition === '' || hostPosition === 'static' ? { position: 'relative' } : {}),
        overflow: 'hidden',
        isolation: 'isolate',
      },
    });
    mutations.push({
      type: 'updateHtmlAttrs',
      nodeId: node.id,
      attrs: { 'data-field-shader-fill': tag },
    });
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
          zIndex: '-1',
          pointerEvents: 'none',
        },
      },
    });
    queueMutations(mutations);
    flushNow();
    trace.action('fill:shader-applied', { nodeId: node.id, tag, itemId, installed: installed === true });
  };

  const updateProp = (name: string, def: ComponentControlDef, value: string) => {
    if (!child || !activeFilePath) return;
    modifyProjectFile(activeFilePath, code =>
      setInstanceProp(code, child.id, child.type, name, value, expressionControl(def)),
    );
    trace.action('fill:shader-prop', { nodeId: node?.id, shader: child.type, prop: name });
  };

  if (libraryOnly) {
    return (
      <div className="flex flex-col gap-2 pt-1">
        <div className="grid grid-cols-2 gap-1.5">
          {SHADER_LIBRARY_ITEMS.map(item => {
            const cfg = getToolbarItemConfig(item.id);
            const tag = cfg?.elementType || '';
            const active = tag !== '' && activeTag === tag;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => applyShader(item.id)}
                className={`overflow-hidden text-left cut-corners cut-border border transition-colors cursor-pointer ${active
                  ? 'border-[var(--accent)] [--cut-border-color:var(--accent)] bg-[var(--bg-hover)]'
                  : 'border-[var(--control-border)] [--cut-border-color:var(--control-border)] hover:[--cut-border-color:var(--control-border-hover)]'}`}
                aria-pressed={active}
                title={item.name}
              >
                {SHADER_THUMBS[item.id] ? (
                  <img src={SHADER_THUMBS[item.id]} alt="" className="block w-full h-20 object-cover" />
                ) : (
                  <span className="block w-full h-20 bg-[var(--canvas-bg)]" />
                )}
                <span className="block px-1.5 py-1 text-[10px] text-[var(--text-secondary)] truncate">{item.name}</span>
              </button>
            );
          })}
        </div>
        <div className="text-[10px] text-[var(--text-disabled)] px-0.5">
          Existing field shader components · Paper shader GLSL retains Apache-2.0 provenance in source.
        </div>
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

  let section = '';
  return (
    <div className="flex flex-col gap-1.5">
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
