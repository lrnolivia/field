import { useEffect, useState } from 'react';

export type MobileWorkspacePresentation =
  | 'regular'
  | 'portrait-sheet'
  | 'landscape-overlay';

export const PHONE_PORTRAIT_MAX_WIDTH = 600;
export const PHONE_LANDSCAPE_MAX_WIDTH = 950;
export const PHONE_LANDSCAPE_MAX_HEIGHT = 600;

export function resolveMobileWorkspacePresentation(
  width: number,
  height: number,
): MobileWorkspacePresentation {
  if (width <= PHONE_PORTRAIT_MAX_WIDTH) return 'portrait-sheet';
  if (
    width <= PHONE_LANDSCAPE_MAX_WIDTH
    && height <= PHONE_LANDSCAPE_MAX_HEIGHT
    && width > height
  ) return 'landscape-overlay';
  return 'regular';
}

function readPresentation(): MobileWorkspacePresentation {
  if (typeof window === 'undefined') return 'regular';
  return resolveMobileWorkspacePresentation(window.innerWidth, window.innerHeight);
}

/**
 * Uses the layout viewport intentionally. The iOS software keyboard may shrink
 * VisualViewport; that must not reclassify a portrait sheet as landscape while
 * the user is editing text.
 */
export function useMobileWorkspacePresentation(): MobileWorkspacePresentation {
  const [presentation, setPresentation] = useState(readPresentation);

  useEffect(() => {
    const sync = () => setPresentation(readPresentation());
    window.addEventListener('resize', sync, { passive: true });
    window.addEventListener('orientationchange', sync, { passive: true });
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
    };
  }, []);

  return presentation;
}
