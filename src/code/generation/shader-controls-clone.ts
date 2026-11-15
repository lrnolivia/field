import type { JSXAttribute } from '@babel/types';
import { parseComponentControlsMeta } from '@/code/components/controls-parser';
import { findAttribute, getAttributeValue, parseJSX, traverse } from '@/code/parsing/ast-utils';
import { projectFS } from '@/code/project/project-fs';

type ControlValues = Record<string, string | number | boolean>;

function literalValue(attr: JSXAttribute): string | number | boolean | undefined {
  const value = attr.value;
  if (value == null) return true;
  if (value.type === 'StringLiteral') return value.value;
  if (value.type !== 'JSXExpressionContainer') return;
  const expr = value.expression;
  if (expr.type === 'StringLiteral' || expr.type === 'NumericLiteral' || expr.type === 'BooleanLiteral') return expr.value;
  if (expr.type === 'UnaryExpression' && expr.operator === '-' && expr.argument.type === 'NumericLiteral') {
    return -expr.argument.value;
  }
}

/** Retain the actual authored JSX types for Inspector controls. */
export function readShaderControlLiterals(
  code: string, layers: ReadonlyMap<string, { type: string }>,
): Map<string, ControlValues> {
  const result = new Map<string, ControlValues>();
  if (layers.size === 0) return result;
  const ast = parseJSX(code);
  if (!ast) return result;
  const namesByTag = new Map<string, Set<string>>();
  traverse(ast, {
    JSXOpeningElement({ node }) {
      const idAttr = findAttribute(node, 'data-id');
      const id = idAttr ? getAttributeValue(idAttr) : null;
      const layer = id ? layers.get(id) : undefined;
      if (!id || !layer) return;
      let controlNames = namesByTag.get(layer.type);
      if (!controlNames) {
        const source = projectFS.readFile(`components/${layer.type}.tsx`);
        const definitions = (source && parseComponentControlsMeta(source)?.controls) || {};
        controlNames = new Set(Object.entries(definitions).flatMap(([name, definition]) =>
          definition.type === 'group' ? Object.keys(definition.controls ?? {}) : [name]));
        namesByTag.set(layer.type, controlNames);
      }
      const values: ControlValues = Object.create(null);
      for (const attr of node.attributes) {
        if (attr.type !== 'JSXAttribute' || attr.name.type !== 'JSXIdentifier' || !controlNames.has(attr.name.name)) continue;
        const value = literalValue(attr);
        if (value !== undefined) values[attr.name.name] = value;
      }
      if (Object.keys(values).length > 0) result.set(id, values);
    },
  });
  return result;
}
