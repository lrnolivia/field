import { findElByNodeId } from '../sandbox-dom-utils';
import { contentRoot } from './sandbox-state';
import { trace } from '@/shared/debug-trace';

const activeLocateAnimations = new Map<string, { el: HTMLElement; animation: Animation }>();

function rgba(rgb: [number, number, number], alpha: number): string {
  return `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

export function buildSelectionColorLocateFilter(
  baseFilter: string,
  luminousRgb: [number, number, number],
  contrastTone: 'white' | 'black',
  strength: number,
): string {
  const contrast: [number, number, number] = contrastTone === 'white' ? [255, 255, 255] : [0, 0, 0];
  return [
    baseFilter && baseFilter !== 'none' ? baseFilter : '',
    `drop-shadow(0 0 0.65px ${rgba(luminousRgb, 0.98 * strength)})`,
    `drop-shadow(0 0 1.65px ${rgba(luminousRgb, 0.46 * strength)})`,
    `drop-shadow(0 0 3.25px ${rgba(contrast, 0.16 * strength)})`,
  ].filter(Boolean).join(' ');
}

function cancelKey(key: string): void {
  const active = activeLocateAnimations.get(key);
  if (!active) return;
  active.animation.cancel();
  active.el.removeAttribute('data-selection-color-locate-active');
  activeLocateAnimations.delete(key);
}

export function clearSelectionColorLocateHighlights(): void {
  for (const key of [...activeLocateAnimations.keys()]) cancelKey(key);
}

export function setSelectionColorLocateHighlight(
  nodeId: string,
  vpPrefix: string,
  luminousRgb: [number, number, number],
  contrastTone: 'white' | 'black',
  mode: 'hover' | 'click',
  revision: number,
): void {
  if (!contentRoot) return;
  const el = findElByNodeId(contentRoot, vpPrefix, nodeId) as HTMLElement | null;
  if (!el || typeof el.animate !== 'function') return;

  const key = `${vpPrefix}|${nodeId}`;
  cancelKey(key);

  const baseFilter = getComputedStyle(el).filter || 'none';
  const low = buildSelectionColorLocateFilter(baseFilter, luminousRgb, contrastTone, mode === 'click' ? 0.08 : 0.52);
  const peak = buildSelectionColorLocateFilter(baseFilter, luminousRgb, contrastTone, mode === 'click' ? 1 : 0.88);
  const end = buildSelectionColorLocateFilter(baseFilter, luminousRgb, contrastTone, mode === 'click' ? 0 : 0.52);
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  const keyframes: Keyframe[] = reducedMotion
    ? [{ filter: peak }, { filter: peak }]
    : mode === 'click'
      ? [{ filter: low, offset: 0 }, { filter: peak, offset: 0.34 }, { filter: peak, offset: 0.58 }, { filter: end, offset: 1 }]
      : [{ filter: low, offset: 0 }, { filter: peak, offset: 0.5 }, { filter: end, offset: 1 }];

  const animation = el.animate(keyframes, {
    duration: reducedMotion ? (mode === 'click' ? 900 : 60_000) : (mode === 'click' ? 1900 : 2500),
    iterations: mode === 'hover' ? Infinity : 1,
    easing: mode === 'click' ? 'cubic-bezier(.22,.7,.22,1)' : 'ease-in-out',
    fill: 'both',
  });

  el.setAttribute('data-selection-color-locate-active', `${mode}:${revision}`);
  activeLocateAnimations.set(key, { el, animation });
  animation.onfinish = () => {
    if (activeLocateAnimations.get(key)?.animation === animation) cancelKey(key);
  };
  trace.action('sandbox:selection-color-locate', { nodeId, vpPrefix, mode, revision, luminousRgb, contrastTone });
}
