import { generateInternalName } from '@/code/components/component-ops';
import { MESH_GRADIENT_COMPONENT } from '@/code/project/default-code-components/MeshGradient';
import { projectFS } from '@/code/project/project-fs';

const SHADER_MARKER = '/** @fieldCustomShader */';

export function addProjectShader(displayName: string): string {
  let tag: string;
  do {
    tag = generateInternalName();
  } while (projectFS.readFile(`components/${tag}.tsx`));
  // The starter is the same working, adjustable shader as the built-in entry.
  // Sanitize the annotation so names cannot terminate its enclosing comment.
  const label = displayName.trim().replace(/\*\//g, '* /').replace(/[\r\n]+/g, ' ');
  const source = MESH_GRADIENT_COMPONENT
    .replace('/** @label "Mesh Gradient" */', () => `${SHADER_MARKER}\n/** @label ${JSON.stringify(label)} */`);
  projectFS.writeFile(`components/${tag}.tsx`, source);
  return tag;
}

export function listProjectShaders(): Array<{ tag: string; label: string }> {
  return projectFS.listFiles('components').flatMap(path => {
    const tag = /^components\/([A-Z][a-zA-Z0-9]*)\.tsx$/.exec(path)?.[1];
    if (!tag) return [];
    const source = projectFS.readFile(path);
    if (!source?.includes(SHADER_MARKER)) return [];
    const value = /@label\s+("(?:[^"\\]|\\.)*")/.exec(source)?.[1];
    return [{ tag, label: value ? JSON.parse(value) as string : tag }];
  });
}
