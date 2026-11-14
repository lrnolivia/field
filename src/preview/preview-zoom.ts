export type PreviewZoomAction = 'in' | 'out' | 'reset' | { factor: number };

export function previewZoomAction(event: KeyboardEvent): PreviewZoomAction | null {
  if (event.defaultPrevented || event.altKey || event.isComposing) return null;
  const editing = event.target instanceof Element
    && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
  if (editing && !event.metaKey && !event.ctrlKey) return null;
  if (event.key === '+' || event.key === '=') return 'in';
  if (event.key === '-') return 'out';
  if (event.key === '0') return 'reset';
  return null;
}

export function listenForPreviewZoom(
  onZoom: (action: PreviewZoomAction) => void,
  wheelSurface?: HTMLElement,
): () => void {
  let previousScale = 1;
  const onKey = (event: KeyboardEvent) => {
    const action = previewZoomAction(event);
    if (!action) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    onZoom(action);
  };
  const onWheel = (event: WheelEvent) => {
    if ((!event.ctrlKey && !event.metaKey) || !event.deltaY) return;
    event.preventDefault();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 160 : 1);
    onZoom({ factor: Math.exp(Math.max(-240, Math.min(240, -delta)) * 0.003) });
  };
  const onGestureStart = (event: Event) => {
    event.preventDefault();
    previousScale = 1;
  };
  const onGestureChange = (event: Event) => {
    event.preventDefault();
    const scale = (event as Event & { scale: number }).scale;
    if (!Number.isFinite(scale) || scale <= 0) return;
    onZoom({ factor: scale / previousScale });
    previousScale = scale;
  };
  const surface = wheelSurface ?? window;
  window.addEventListener('keydown', onKey, true);
  surface.addEventListener('wheel', onWheel as EventListener, { passive: false, capture: true });
  surface.addEventListener('gesturestart', onGestureStart, { passive: false, capture: true });
  surface.addEventListener('gesturechange', onGestureChange, { passive: false, capture: true });
  return () => {
    window.removeEventListener('keydown', onKey, true);
    surface.removeEventListener('wheel', onWheel as EventListener, true);
    surface.removeEventListener('gesturestart', onGestureStart, true);
    surface.removeEventListener('gesturechange', onGestureChange, true);
  };
}
