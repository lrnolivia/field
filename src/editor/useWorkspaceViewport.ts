import { useEffect, useState } from 'react';

/** Floating chrome resolves from the layout viewport, including touch rotation. */
export function useWorkspaceViewport() {
  const [size, setSize] = useState(() => ({
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
    height: typeof window === 'undefined' ? 900 : window.innerHeight,
  }));
  useEffect(() => {
    const sync = () => setSize(current => current.width === window.innerWidth && current.height === window.innerHeight
      ? current : { width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', sync, { passive: true });
    window.addEventListener('orientationchange', sync, { passive: true });
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
    };
  }, []);
  return size;
}
