import { useLayoutEffect } from 'react';
import { useAtomValue } from 'jotai';
import { activePageAppearanceAtom } from '@/code/stores/page-appearance-store';

export default function PageAppearanceBridge() {
  const { filePath, appearance } = useAtomValue(activePageAppearanceAtom);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const visible = appearance?.visible !== false;
    const background = visible ? appearance?.background : undefined;
    const opacity = Math.max(0, Math.min(100, appearance?.opacity ?? 100));

    root.dataset.pageCanvasFile = filePath;
    root.dataset.pageCanvasVisible = visible ? 'true' : 'false';
    root.dataset.pageCanvasCustom = background ? 'true' : 'false';

    if (background) {
      const resolved = opacity >= 100
        ? background
        : `color-mix(in srgb, ${background} ${opacity}%, transparent)`;
      root.style.setProperty('--page-canvas-background', resolved);
    } else {
      root.style.removeProperty('--page-canvas-background');
    }

    return () => {
      root.style.removeProperty('--page-canvas-background');
      delete root.dataset.pageCanvasFile;
      delete root.dataset.pageCanvasVisible;
      delete root.dataset.pageCanvasCustom;
    };
  }, [filePath, appearance?.background, appearance?.opacity, appearance?.visible]);

  return null;
}
