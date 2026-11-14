import * as t from '@babel/types';
import { findAttribute, getAttributeValue, parseJSX, traverse } from '@/code/parsing/ast-utils';
import { generate } from '@/code/generation/generator-utils';
import {
  buildPatternFillStyles,
  decodePatternStyleBackup,
  isLegacyGridMask,
  LEGACY_GRID_MASK,
  parsePatternFillConfig,
  PATTERN_STYLE_BACKUP,
} from '@/editor/ui/pattern-fill-utils';

function styleKey(property: t.ObjectProperty): string | undefined {
  if (property.computed) return;
  if (t.isIdentifier(property.key)) return property.key.name;
  if (t.isStringLiteral(property.key)) return property.key.value;
}

/** Update only builder-generated legacy paint, leaving later code and Mask edits in place. */
export function migrateGridMaskInCode(code: string): string {
  if (!code.includes('data-field-pattern') || !code.includes('gridMask')) return code;
  const ast = parseJSX(code);
  if (!ast) return code;
  const edits: { start: number; end: number; value: string }[] = [];

  traverse(ast, {
    JSXOpeningElement({ node }) {
      const pattern = findAttribute(node, 'data-field-pattern');
      if (!pattern) return;
      const config = parsePatternFillConfig(getAttributeValue(pattern));
      const style = findAttribute(node, 'style')?.value;
      if (!t.isJSXExpressionContainer(style) || !t.isObjectExpression(style.expression)) return;
      const expression = style.expression;
      const styleAt = new Map<string, t.ObjectProperty>();
      for (const property of expression.properties) {
        if (!t.isObjectProperty(property)) continue;
        const key = styleKey(property);
        if (key) styleAt.set(key, property);
      }
      const background = styleAt.get('backgroundImage')?.value;
      if (!t.isStringLiteral(background) || !isLegacyGridMask(config, background.value)) return;
      if (expression.start == null || expression.end == null) return;

      const backupAttr = findAttribute(node, PATTERN_STYLE_BACKUP);
      const backup = decodePatternStyleBackup(backupAttr && getAttributeValue(backupAttr));
      for (const key of ['maskImage', 'WebkitMaskImage']) {
        const property = styleAt.get(key);
        if (!property || !t.isStringLiteral(property.value, { value: LEGACY_GRID_MASK })) continue;
        const prior = backup[key];
        if (typeof prior === 'string' && prior) {
          property.value = t.stringLiteral(prior);
        } else {
          expression.properties.splice(expression.properties.indexOf(property), 1);
        }
      }
      const { backgroundColor, ...paint } = buildPatternFillStyles(config);
      const previousColor = styleAt.get('backgroundColor')?.value;
      // If source changed the solid background independently, retain it.
      const updates = t.isStringLiteral(previousColor, { value: config.background })
        ? { ...paint, backgroundColor }
        : paint;
      for (const [key, value] of Object.entries(updates)) {
        const property = styleAt.get(key);
        if (property) property.value = t.stringLiteral(value);
        else expression.properties.push(t.objectProperty(t.identifier(key), t.stringLiteral(value)));
      }
      edits.push({ start: expression.start, end: expression.end, value: generate(expression, { concise: true }).code });
      if (backupAttr?.start != null && backupAttr.end != null) edits.push({ start: backupAttr.start, end: backupAttr.end, value: '' });
    },
  });

  if (!edits.length) return code;
  let output = code;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.value + output.slice(edit.end);
  }
  // A nested JSX literal in a style may overlap a second edit. Leave those
  // files intact if a partial rewrite would produce invalid source.
  return parseJSX(output) ? output : code;
}

export function migrateGridMaskFiles(files: Map<string, string>): void {
  for (const [path, code] of files) {
    if (!/\.[jt]sx$/.test(path)) continue;
    const migrated = migrateGridMaskInCode(code);
    if (migrated !== code) files.set(path, migrated);
  }
}
