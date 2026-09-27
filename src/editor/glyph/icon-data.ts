import type { IconNode } from 'morphicons/react';

const path = (d: string): IconNode[number] => ['path', {
  d,
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}];

export const glyphIcons = {
  chevronRight: [path('M9 18l6-6-6-6')] as IconNode,
  chevronDown: [path('M6 9l6 6 6-6')] as IconNode,
  chevronUp: [path('M6 15l6-6 6 6')] as IconNode,
  plus: [path('M12 5v14M5 12h14')] as IconNode,
  minus: [path('M5 12h14')] as IconNode,
  close: [path('M6 6l12 12M18 6L6 18')] as IconNode,
  ellipsis: [
    ['circle', { cx: 5, cy: 12, r: 1, fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 12, cy: 12, r: 1, fill: 'currentColor', stroke: 'none' }],
    ['circle', { cx: 19, cy: 12, r: 1, fill: 'currentColor', stroke: 'none' }],
  ] as IconNode,
  eye: [
    path('M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'),
    ['circle', { cx: 12, cy: 12, r: 3, fill: 'none', stroke: 'currentColor' }],
  ] as IconNode,
  eyeOff: [
    path('M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94'),
    path('M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19'),
    path('M1 1l22 22'),
  ] as IconNode,
  lock: [
    ['rect', { x: 4, y: 10.5, width: 16, height: 10, rx: 2, fill: 'none', stroke: 'currentColor' }],
    path('M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5'),
  ] as IconNode,
  unlock: [
    ['rect', { x: 4, y: 10.5, width: 16, height: 10, rx: 2, fill: 'none', stroke: 'currentColor' }],
    path('M7.5 10.5V7a4.5 4.5 0 0 1 8.8-1.3'),
  ] as IconNode,
} satisfies Record<string, IconNode>;
