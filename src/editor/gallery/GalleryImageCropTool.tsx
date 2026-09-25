import { useEffect, useState } from 'react';
import { ToolButton, ToolRow, ToolSection } from '@/editor/controls';
import { useControl } from '@/editor/controls/ControlProvider';
import { useNodesComputed } from '@/code/stores/node-family';
import { isGalleryItemNode, isGalleryNode } from '@/code/gallery/gallery-model';
import { formatObjectPosition, parseObjectPosition } from '@/canvas/gallery/crop-math';
import GalleryCropOverlay from './GalleryCropOverlay';

/**
 * Direct-child selection companion for Gallery images.
 *
 * When the Gallery root is selected, GalleryTool owns Content/View/Image. When
 * the user clicks the real child <img> on Canvas/Layers, normal ImageTool still
 * owns source/alt/fit and this small Gallery-only section adds the required
 * visual reposition affordance. It self-gates by the actual source ancestry so
 * a coincidentally named image outside a Gallery never gets Gallery behavior.
 */
export default function GalleryImageCropTool() {
  const { node, nodeId, vpId, styles, updateStyle } = useControl();
  const [cropOpen, setCropOpen] = useState(false);

  const insideGallery = useNodesComputed((nodes) => {
    if (!nodeId) return false;
    const image = nodes.get(nodeId);
    const imageTag = image?.type.replace(/^motion\./, '');
    if (!image || (imageTag !== 'img' && imageTag !== 'Image') || !image.parentId) return false;
    const item = nodes.get(image.parentId);
    if (!item || !isGalleryItemNode(item) || !item.parentId) return false;
    return isGalleryNode(nodes.get(item.parentId));
  }, [nodeId]);

  useEffect(() => setCropOpen(false), [nodeId]);

  if (!node || !nodeId || !insideGallery) return null;

  const fit = styles.objectFit || 'cover';
  const objectPosition = styles.objectPosition || '50% 50%';
  const src = node.attrs?.src ?? '';

  return (
    <>
      <ToolSection title="Crop" collapsible>
        <ToolRow label="Position">
          <div className="flex items-center gap-1 w-full">
            <ToolButton className="flex-1" onClick={() => setCropOpen(true)} disabled={fit !== 'cover' || !src}>
              Reposition
            </ToolButton>
            <button
              type="button"
              className="h-[var(--control-height-sm)] px-2 border border-[var(--control-border)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              onClick={() => updateStyle('objectPosition', '50% 50%')}
              title="Reset image position"
            >
              Reset
            </button>
          </div>
        </ToolRow>
        <div className="text-[10px] tabular-nums text-[var(--text-disabled)]">
          {formatObjectPosition(parseObjectPosition(objectPosition))}
        </div>
      </ToolSection>

      {cropOpen && (
        <GalleryCropOverlay
          imageId={nodeId}
          src={src}
          vpId={vpId}
          objectPosition={objectPosition}
          onCommit={(value) => updateStyle('objectPosition', value)}
          onClose={() => setCropOpen(false)}
        />
      )}
    </>
  );
}
