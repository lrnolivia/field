import { ELEMENT_ICON_MAP } from '@/shared/insert-items/element-icons';
import { SHADER_THUMBS } from '@/shared/insert-items/shader-thumb-map';
import { isPreviewIcon } from '@/shared/insert-items/icon-style-utils';
import { useFieldReducedMotion } from '@/editor/motion';

/** The same clipped, live preview in Insert cards and the shader library. */
export default function InsertItemPreview({ itemId, iconKey }: { itemId: string; iconKey: string }) {
  const Icon = ELEMENT_ICON_MAP[iconKey];
  const reducedMotion = useFieldReducedMotion();
  const thumb = SHADER_THUMBS[itemId];
  if (Icon && isPreviewIcon(iconKey) && !(reducedMotion && thumb)) {
    return <span data-insert-preview={iconKey} className="relative block h-full w-full overflow-hidden [&>div]:h-full [&>div]:w-full [&>div]:rounded-none"><Icon /></span>;
  }
  return thumb ? <img src={thumb} alt="" draggable={false} className="h-full w-full object-cover" /> : null;
}
