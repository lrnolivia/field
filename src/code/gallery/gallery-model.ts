import type { CanvasNode } from '@/code/parsing/parser';
import { generateNodeId } from '@/shared/id-utils';
import {
  galleryAriaLabel,
  GALLERY_ITEM_STYLE_PROPERTY,
  GALLERY_VIEW_STYLE_PROPERTY,
  GALLERY_CAROUSEL_CONTROL_STYLE_PROPERTY,
  getGalleryCarouselControlPatch,
  getGalleryDefaultImageFit,
  getGalleryImagePatch,
  getGalleryItemPatch,
  isGalleryViewId,
  type GalleryCarouselControlRole,
  parseGalleryAriaLabel,
  type GalleryViewId,
} from './gallery-views';

export interface GalleryItemRef {
  item: CanvasNode;
  image: CanvasNode;
}

export interface GalleryCarouselControlRefs {
  previous?: CanvasNode;
  counter?: CanvasNode;
  next?: CanvasNode;
}

function isGalleryCarouselControlRole(value: string | undefined): value is GalleryCarouselControlRole {
  return value === 'previous' || value === 'counter' || value === 'next';
}

export function getGalleryCarouselControls(item: CanvasNode, nodes: Map<string, CanvasNode>): GalleryCarouselControlRefs {
  const result: GalleryCarouselControlRefs = {};
  for (const childId of item.children ?? []) {
    const child = nodes.get(childId);
    const role = child?.styles?.[GALLERY_CAROUSEL_CONTROL_STYLE_PROPERTY];
    if (!child || !isGalleryCarouselControlRole(role)) continue;
    result[role] = child;
  }
  return result;
}

export function galleryCarouselSlideDomId(itemId: string): string {
  return 'field-gallery-slide-' + itemId.replace(/[^A-Za-z0-9_-]+/g, '-');
}

export function isGalleryNode(node: CanvasNode | null | undefined): boolean {
  if (!node) return false;
  // Current source identity: a harmless, parsed CSS custom property. This
  // survives user-facing Layers renames and accessibility-label edits.
  if (isGalleryViewId(node.styles?.[GALLERY_VIEW_STYLE_PROPERTY])) return true;
  // Migration path for the first Gallery draft, which encoded view identity in
  // the ARIA label before the custom-property seam was chosen.
  return node.name === 'Gallery'
    && node.attrs?.role === 'region'
    && parseGalleryAriaLabel(node.attrs?.['aria-label']) !== null;
}

export function isGalleryItemNode(node: CanvasNode | null | undefined): boolean {
  if (!node || node.type.replace(/^motion\./, '') !== 'figure') return false;
  return node.styles?.[GALLERY_ITEM_STYLE_PROPERTY] === '1' || node.name === 'Gallery Item';
}

export function getGalleryView(node: CanvasNode | null | undefined): GalleryViewId {
  const sourceView = node?.styles?.[GALLERY_VIEW_STYLE_PROPERTY];
  if (isGalleryViewId(sourceView)) return sourceView;
  return parseGalleryAriaLabel(node?.attrs?.['aria-label']) ?? 'grid';
}

export function getGalleryItems(gallery: CanvasNode, nodes: Map<string, CanvasNode>): GalleryItemRef[] {
  if (!isGalleryNode(gallery)) return [];

  const result: GalleryItemRef[] = [];
  for (const childId of gallery.children ?? []) {
    const item = nodes.get(childId);
    if (!item || !isGalleryItemNode(item)) continue;

    const image = (item.children ?? [])
      .map((id) => nodes.get(id))
      .find((child): child is CanvasNode => !!child && (
        child.name === 'Gallery Image'
        || child.type === 'img'
        || child.type === 'motion.img'
        || child.type === 'Image'
      ));

    if (image) result.push({ item, image });
  }
  return result;
}

export function galleryRootAttrs(view: GalleryViewId): Record<string, string> {
  return {
    role: 'region',
    'aria-label': galleryAriaLabel(view),
  };
}

export interface GallerySourceNode {
  id: string;
  type: string;
  styles: Record<string, string>;
  attrs?: Record<string, string>;
  name?: string;
  textContent?: string;
  children?: GallerySourceNode[];
}

export function buildGalleryItemNode(
  url: string,
  index: number,
  view: GalleryViewId,
  alt = '',
): GallerySourceNode {
  return {
    type: 'figure',
    id: generateNodeId('gallery-item'),
    name: 'Gallery Item',
    styles: getGalleryItemPatch(view, index),
    children: [
      {
        type: 'img',
        id: generateNodeId('gallery-image'),
        name: 'Gallery Image',
        styles: {
          ...getGalleryImagePatch(view),
          objectFit: getGalleryDefaultImageFit(view),
          objectPosition: '50% 50%',
        },
        attrs: { src: url, alt },
      },
    ],
  };
}

export function buildGalleryCarouselControlNodes(itemIds: readonly string[], index: number): GallerySourceNode[] {
  if (itemIds.length === 0 || index < 0 || index >= itemIds.length) return [];
  const previousId = itemIds[(index - 1 + itemIds.length) % itemIds.length];
  const nextId = itemIds[(index + 1) % itemIds.length];
  return [
    {
      type: 'a',
      id: generateNodeId('gallery-previous'),
      name: 'Gallery Previous',
      styles: getGalleryCarouselControlPatch('previous'),
      attrs: { href: '#' + galleryCarouselSlideDomId(previousId), 'aria-label': 'Previous image' },
      textContent: '‹',
    },
    {
      type: 'span',
      id: generateNodeId('gallery-counter'),
      name: 'Gallery Counter',
      styles: getGalleryCarouselControlPatch('counter'),
      attrs: { 'aria-label': 'Image ' + (index + 1) + ' of ' + itemIds.length },
      textContent: String(index + 1) + ' / ' + itemIds.length,
    },
    {
      type: 'a',
      id: generateNodeId('gallery-next'),
      name: 'Gallery Next',
      styles: getGalleryCarouselControlPatch('next'),
      attrs: { href: '#' + galleryCarouselSlideDomId(nextId), 'aria-label': 'Next image' },
      textContent: '›',
    },
  ];
}

export function galleryItemUrls(items: GalleryItemRef[]): Set<string> {
  return new Set(items.map(({ image }) => image.attrs?.src).filter(Boolean));
}
