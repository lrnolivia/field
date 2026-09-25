import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';

const CROP_SIZE = 280;
const OUTPUT_SIZE = 512;

interface Props {
  file: File;
  saving: boolean;
  onCancel: () => void;
  onSave: (blob: Blob) => Promise<void> | void;
}

interface Size {
  width: number;
  height: number;
}

interface Offset {
  x: number;
  y: number;
}

export default function AvatarCropModal({
  file,
  saving,
  onCancel,
  onSave,
}: Props) {
  const imageUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const imgRef = useRef<HTMLImageElement>(null);

  const [natural, setNatural] = useState<Size | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [decodeError, setDecodeError] = useState(false);

  const dragRef = useRef<{
    pointerX: number;
    pointerY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  useEffect(() => {
    return () => URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  const baseScale = natural
    ? Math.max(CROP_SIZE / natural.width, CROP_SIZE / natural.height)
    : 1;

  const imageScale = baseScale * zoom;

  const clampOffset = (candidate: Offset): Offset => {
    if (!natural) return { x: 0, y: 0 };

    const renderedWidth = natural.width * imageScale;
    const renderedHeight = natural.height * imageScale;

    const maxX = Math.max(0, (renderedWidth - CROP_SIZE) / 2);
    const maxY = Math.max(0, (renderedHeight - CROP_SIZE) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, candidate.x)),
      y: Math.max(-maxY, Math.min(maxY, candidate.y)),
    };
  };

  useEffect(() => {
    setOffset((current) => clampOffset(current));
    // clamp inputs are represented by these primitive dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, natural?.width, natural?.height]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!natural || saving) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    setOffset(clampOffset({
      x: drag.offsetX + event.clientX - drag.pointerX,
      y: drag.offsetY + event.clientY - drag.pointerY,
    }));
  };

  const finishDrag = () => {
    dragRef.current = null;
  };

  const saveCrop = async () => {
    const img = imgRef.current;
    if (!img || !natural) return;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create avatar canvas');

    const outputScale = OUTPUT_SIZE / CROP_SIZE;

    context.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
    context.scale(outputScale, outputScale);
    context.translate(offset.x, offset.y);
    context.scale(imageScale, imageScale);
    context.drawImage(
      img,
      -natural.width / 2,
      -natural.height / 2,
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error('Could not encode avatar'));
        },
        'image/webp',
        0.9,
      );
    });

    await onSave(blob);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/55"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onCancel();
      }}
    >
      <div
        className="w-[360px] rounded-[10px] border border-[var(--border-light)] bg-[var(--bg-panel)] shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-light)] px-4 py-3">
          <div>
            <div className="text-[12px] font-semibold text-[var(--text-primary)]">
              Crop profile photo
            </div>
            <div className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">
              Drag to reposition
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            aria-label="Close crop dialog"
            className="flex h-6 w-6 items-center justify-center rounded-[4px] border-none bg-transparent text-[15px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <div className="px-4 py-4">
          <div className="flex justify-center">
            <div
              className="relative overflow-hidden rounded-full border border-[var(--border-light)] bg-[var(--bg-canvas)] shadow-inner"
              style={{
                width: CROP_SIZE,
                height: CROP_SIZE,
                touchAction: 'none',
                cursor: natural ? 'grab' : 'default',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
            >
              <img
                ref={imgRef}
                src={imageUrl}
                alt=""
                draggable={false}
                onLoad={(event) => {
                  const image = event.currentTarget;

                  setNatural({
                    width: image.naturalWidth,
                    height: image.naturalHeight,
                  });

                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                  setDecodeError(false);
                }}
                onError={() => setDecodeError(true)}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: natural ? natural.width * imageScale : 'auto',
                  height: natural ? natural.height * imageScale : 'auto',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  transform:
                    `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>

          {decodeError && (
            <div className="mt-3 text-[10px] text-red-400">
              field could not decode this image. Try PNG, JPEG, or WebP.
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <span className="w-8 text-[10px] text-[var(--text-tertiary)]">
              Zoom
            </span>

            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              disabled={!natural || saving}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="min-w-0 flex-1"
            />

            <button
              type="button"
              disabled={!natural || saving}
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border-light)] px-4 py-3">
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="h-7 rounded-[5px] px-3 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!natural || decodeError || saving}
            onClick={() => void saveCrop()}
            className="h-7 rounded-[5px] bg-[var(--accent)] px-3 text-[11px] font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save photo'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
