import { findElByNodeId } from '../sandbox-dom-utils';
import { contentRoot } from './sandbox-state';
import { trace } from '@/shared/debug-trace';

const activeLocateAnimations = new Map<string, { el: HTMLElement; animation: Animation }>();

const LOCATE_EDGE_FILTERS_ID = 'field-selection-color-locate-edge-filters';

function rgba(rgb: [number, number, number], alpha: number): string {
  return `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

export function selectionColorLocateEdgeFilterId(): string {
  return 'field-selection-color-locate-edge-white';
}

/**
 * A single 1px INNER alpha-edge stroke. It is always white and overlays the
 * object's own paint. No outer keyline lives here anymore; everything outside
 * the object is handled by the three glow layers below the painted geometry.
 */
function ensureSelectionColorLocateEdgeFilter(): void {
  if (document.getElementById(LOCATE_EDGE_FILTERS_ID)) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = LOCATE_EDGE_FILTERS_ID;
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  svg.innerHTML = `
    <defs>
      <filter id="${selectionColorLocateEdgeFilterId()}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
        <feMorphology in="SourceAlpha" operator="erode" radius="1" result="eroded" />
        <feComposite in="SourceAlpha" in2="eroded" operator="out" result="innerEdge" />
        <feFlood flood-color="#ffffff" flood-opacity="0.5" result="innerFlood" />
        <feComposite in="innerFlood" in2="innerEdge" operator="in" result="innerTone" />
        <feMerge>
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="innerTone" />
        </feMerge>
      </filter>
    </defs>`;
  (document.body ?? document.documentElement).appendChild(svg);
}

export function buildSelectionColorLocateFilter(
  baseFilter: string,
  glowRgb: [number, number, number],
  contrastTone: 'white' | 'black',
  strength: number,
  radiusScale = 1,
): string {
  void contrastTone;
  const originalRadius = 2.35 * radiusScale;
  const frontRadius = originalRadius * 0.5;
  const backRadius = originalRadius * 1.5;

  return [
    baseFilter && baseFilter !== 'none' ? baseFilter : '',
    // Figma pass: 1px white INNER stroke at 50% NORMAL compositing.
    `url(#${selectionColorLocateEdgeFilterId()})`,
    // Same real source/fallback color throughout; no blend-mode tricks.
    `drop-shadow(0 0 ${frontRadius.toFixed(2)}px ${rgba(glowRgb, 0.94 * strength)})`,
    `drop-shadow(0 0 ${originalRadius.toFixed(2)}px ${rgba(glowRgb, 0.72 * strength)})`,
    `drop-shadow(0 0 ${backRadius.toFixed(2)}px ${rgba(glowRgb, 0.38 * strength)})`,
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
  ensureSelectionColorLocateEdgeFilter();
  const el = findElByNodeId(contentRoot, vpPrefix, nodeId) as HTMLElement | null;
  if (!el || typeof el.animate !== 'function') return;

  const key = `${vpPrefix}|${nodeId}`;
  cancelKey(key);

  const baseFilter = getComputedStyle(el).filter || 'none';
  // Salience comes primarily from breathing radius/opacity, not extreme blend modes.
  const low = buildSelectionColorLocateFilter(baseFilter, luminousRgb, contrastTone, mode === 'click' ? 0.28 : 0.48, 0.78);
  const peak = buildSelectionColorLocateFilter(baseFilter, luminousRgb, contrastTone, 1, 1.32);
  const settle = buildSelectionColorLocateFilter(baseFilter, luminousRgb, contrastTone, mode === 'click' ? 0.56 : 0.48, 0.88);
  const end = buildSelectionColorLocateFilter(baseFilter, luminousRgb, contrastTone, mode === 'click' ? 0 : 0.48, 0.78);
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  const keyframes: Keyframe[] = reducedMotion
    ? [{ filter: peak }, { filter: peak }]
    : mode === 'click'
      ? [{ filter: low, offset: 0 }, { filter: peak, offset: 0.32 }, { filter: settle, offset: 0.68 }, { filter: end, offset: 1 }]
      : [{ filter: low, offset: 0 }, { filter: peak, offset: 0.5 }, { filter: settle, offset: 1 }];

  const animation = el.animate(keyframes, {
    duration: reducedMotion ? (mode === 'click' ? 900 : 60_000) : (mode === 'click' ? 1800 : 2200),
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
