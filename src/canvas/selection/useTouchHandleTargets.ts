import { useEffect, useState } from 'react';

/** Coarse targets also cover hybrid devices; they do not depend on phone identity. */
export function useTouchHandleTargets(): boolean {
  const [touch, setTouch] = useState(() => typeof window !== 'undefined'
    && typeof window.matchMedia === 'function' && window.matchMedia('(any-pointer: coarse)').matches);
  useEffect(() => {
    const query = window.matchMedia('(any-pointer: coarse)');
    const sync = () => setTouch(query.matches);
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  return touch;
}
