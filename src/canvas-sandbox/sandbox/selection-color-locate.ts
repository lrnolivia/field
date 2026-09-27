import { findElByNodeId } from '../sandbox-dom-utils';
import { contentRoot } from './sandbox-state';
import { trace } from '@/shared/debug-trace';

const activeLocateAnimations = new Map<string, { el: HTMLElement; animation: Animation }>();

const LOCATE_EDGE_FILTERS_ID = 'field-selection-color-locate-edge-filters';

function rgba(rgb: [number, number, number], alpha: number): string {
  return `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

export function selectionColorLocateEdgeFilterId(tone: 'white' | 'black'): string {
  return `field-selection-color-locate-edge-${tone}`;
}

/**
 * SVG morphology gives us a TRUE alpha-edge stroke rather than a box outline:
 * - SourceAlpha - eroded alpha = 1.5px inner edge
 * - dilated alpha - SourceAlpha = 1px outer mirror
 * The inner tone blends over the object's own paint; the outer mirror is
 * composited normally so it cannot disappear against the Canvas background.
 */
function ensureSelectionColorLocateEdgeFilters(): void {
  if (document.getElementById(LOCATE_EDGE_FILTERS_ID)) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = LOCATE_EDGE_FILTERS_ID;
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  svg.innerHTML = `
    <defs>
      ${(['white', 'black'] as const).map((tone) => {
        const color = tone === 'white' ? '#ffffff' : '#000000';
        const id = selectionColorLocateEdgeFilterId(tone);
        return `<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB">
          <feMorphology in="SourceAlpha" operator="erode" radius="1.5" result="eroded" />
          <feComposite in="SourceAlpha" in2="eroded" operator="out" result="innerEdge" />
          <feMorphology in="SourceAlpha" operator="dilate" radius="1" result="dilated" />
          <feComposite in="dilated" in2="SourceAlpha" operator="out" result="outerEdge" />
          <feFlood flood-color="${color}" flood-opacity="0.96" result="innerFlood" />
          <feComposite in="innerFlood" in2="innerEdge" operator="in" result="innerTone" />
          <feFlood flood-color="${color}" flood-opacity="0.82" result="outerFlood" />
          <feComposite in="outerFlood" in2="outerEdge" operator="in" result="outerTone" />
          <feBlend in="SourceGraphic" in2="innerTone" mode="overlay" result="innerBlend" />
          <feMerge>
            <feMergeNode in="outerTone" />
            <feMergeNode in="innerBlend" />
          </feMerge>
        </filter>`;
      }).join('')}
    </defs>`;
  (document.body ?? document.documentElement).appendChild(svg);
}

function luminousCore(rgb: [number, number, number]): [number, number, number] {
  // A near-white version of the same hue: the tightest pass reads as light,
  // while the next passes preserve enough chroma to identify the source color.
  return rgb.map((channel) => Math.round(channel + (255 - channel) * 0.58)) as [number, number, number];
}

export function buildSelectionColorLocateFilter(
  baseFilter: string,
  luminousRgb: [number, number, number],
  contrastTone: 'white' | 'black',
  strength: number,
): string {
  const contrast: [number, number, number] = contrastTone === 'white' ? [255, 255, 255] : [0, 0, 0];
  const core = luminousCore(luminousRgb);
  return [
    baseFilter && baseFilter !== 'none' ? baseFilter : '',
    `url(#${selectionColorLocateEdgeFilterId(contrastTone)})`,
    `drop-shadow(0 0 0.45px ${rgba(core, 1.00 * strength)})`,
    `drop-shadow(0 0 1.25px ${rgba(luminousRgb, 0.88 * strength)})`,
    `drop-shadow(0 0 2.35px ${rgba(luminousRgb, 0.44 * strength)})`,
    `drop-shadow(0 0 3.10px ${rgba(contrast, 0.18 * strength)})`,
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
  ensureSelectionColorLocateEdgeFilters();
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
