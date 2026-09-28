import type { CanvasNode } from '@/code/parsing/parser';
import { isTextTag } from '@/shared/constants';

const DEFAULT_TEXT_NAMES = new Set(['text', 'heading', 'paragraph']);

/** Legacy imports often store the HTML tag itself as the layer name. */
export function isGeneratedTextName(node: CanvasNode): boolean {
  const name = (node.name || node.type).toLowerCase();
  return DEFAULT_TEXT_NAMES.has(name) || name === node.type.toLowerCase();
}

/** Keep authored names, but let the default label of a plain text layer follow its content. */
export function getLayerDisplayName(node: CanvasNode, showTextContent = true): string {
  const name = node.name || node.type;
  if (!showTextContent) return name;
  if (!isTextTag(node.type) || !isGeneratedTextName(node)) return name;
  // Rich JSX and bindings can contain code or markup that should never be shown
  // as a layer name. Literal text is safe even if it contains angle brackets.
  if (node.hasMixedContent || node.textVariable || node.binding || node.richTranslation) return name;
  const content = node.textContent?.replace(/\s+/g, ' ').trim();
  if (!content) return name;
  if (!node.textIsLiteral && /[<>]/.test(content)) return name;
  return content;
}
