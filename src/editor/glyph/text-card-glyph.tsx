import { motion } from 'motion/react';
import { fieldMotion, fieldSpatialTransition, useFieldReducedMotion } from '@/editor/motion';

const shapes = {
  heading: [
    ['M3 3.5v9M9 3.5v9M3 8h6', 'M2.5 3v10M9.5 3v10M2.5 8h7'],
    ['M12 8.5h1v4M11.5 12.5h2', 'M12 7.5h1v5M11.5 12.5h2'],
  ],
  paragraph: [
    ['M3 4h10', 'M3 3.5h9'],
    ['M3 7h8', 'M3 6.5h10'],
    ['M3 10h10', 'M3 10h7'],
    ['M3 13h6', 'M3 13h9'],
  ],
  textLink: [
    ['M6.5 5.5H5a2.5 2.5 0 0 0 0 5h1.5', 'M6 5H4.5a3 3 0 0 0 0 6H6'],
    ['M9.5 5.5H11a2.5 2.5 0 0 1 0 5H9.5', 'M10 5h1.5a3 3 0 0 1 0 6H10'],
    ['M6 8h4', 'M5.5 8h5'],
  ],
  quote: [
    ['M3 4h4v4H3V4m0 4c0 2 1 3 3 4', 'M3 3h4v4H3V3m0 4c0 3 1 4 3 5'],
    ['M9 4h4v4H9V4m0 4c0 2 1 3 3 4', 'M9 3h4v4H9V3m0 4c0 3 1 4 3 5'],
  ],
} satisfies Record<string, string[][]>;

export function TextCardGlyph({ kind }: { kind: string }) {
  const reduced = useFieldReducedMotion();
  const paths = shapes[kind as keyof typeof shapes];
  if (!paths) return null;
  return <svg data-field-text-glyph={kind} viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {paths.map(([rest, hover], index) => <motion.path key={index} d={rest}
      variants={reduced ? undefined : { rest: { d: rest, y: 0 }, hover: { d: hover, y: 0 }, tap: { d: rest, y: index % 2 ? 0.7 : -0.7 } }}
      transition={fieldSpatialTransition(reduced, fieldMotion.glyph)} />)}
  </svg>;
}

export function isTextCardGlyph(kind: string) {
  return Object.hasOwn(shapes, kind);
}
