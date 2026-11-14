import type { ToolbarItem } from '@/canvas/drag/toolbar-item-config';
import { fitFrameBox } from '@/canvas/image-dims';

export type MediaImageDimensions = { w: number; h: number };

export function mediaImageToolbarItem(
  url: string,
  dimensions: MediaImageDimensions | null,
  kind: 'image' | 'vector' = 'image',
): ToolbarItem {
  const { width, height } = fitFrameBox(dimensions);
  return {
    id: kind,
    name: kind === 'vector' ? 'Vector' : 'Image',
    elementType: 'img',
    defaultAttrs: { src: url, alt: '' },
    defaultStyles: {
      display: 'block',
      width: `${width}px`,
      height: dimensions ? `${height}px` : 'auto',
      maxWidth: 'none',
      objectFit: 'contain',
    },
    ghostSize: { width, height },
    galleryMedia: [{ url, sourceRatio: dimensions ? dimensions.w / dimensions.h : null }],
  };
}
