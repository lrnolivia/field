import { FieldGlyph, type FieldGlyphBehavior } from '../glyph';

export type MobileGlyphName = 'project' | 'browse' | 'pages' | 'layers' | 'media' | 'gallery' | 'library' | 'presets' | 'insert' | 'cms' | 'locale' | 'comments' | 'branches' | 'tools' | 'inspect' | 'undo' | 'redo' | 'settings' | 'expand';
const paths: Record<MobileGlyphName, string[]> = {
  project: ['M3 6h14v11H3Z', 'M3 6V3h5l2 3', 'M7 10h6M7 13h4'],
  browse: ['M3 3h5v5H3Z M12 3h5v5h-5Z', 'M3 12h5v5H3Z M12 12h5v5h-5Z'],
  pages: ['M5 2.5h7l3 3V17.5H5Z', 'M12 2.5v4h3', 'M8 10h4M8 13h4'],
  layers: ['m3 6 7-4 7 4-7 4Z', 'm3 10 7 4 7-4', 'm3 14 7 4 7-4'],
  media: ['M3 3h14v12H3Z', 'm4 13 4-4 3 3 2-2 3 3', 'M6 6h.01', 'M6 18h11'],
  gallery: ['M2 4h12v12H2Z', 'm3 14 4-4 3 3 3-3', 'M6 2h12v12', 'M5 7h.01'],
  library: ['M3 4h4v13H3Z M9 4h4v13H9Z', 'm15 4 2-1 3 13-2 1Z'],
  presets: ['M3 5h14M3 10h14M3 15h14', 'M7 3v4M13 8v4M8 13v4'],
  insert: ['M10 3v14', 'M3 10h14'],
  cms: ['M3 5c0-4 14-4 14 0s-14 4-14 0Z', 'M3 5v10c0 4 14 4 14 0V5', 'M3 10c0 4 14 4 14 0'],
  locale: ['M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z', 'M2 10h16', 'M10 2c-5 4-5 12 0 16 5-4 5-12 0-16Z'],
  comments: ['M3 3h14v11H9l-5 4v-4H3Z', 'M6 7h8M6 10h5'],
  branches: ['M5 4v12', 'M5 10h4a6 6 0 0 0 6-6', 'M3 3h4v3H3Z M3 14h4v3H3Z M13 2h4v4h-4Z'],
  tools: ['m4 2 12 8-6 2-2 6Z', 'm10 12 4 5'],
  inspect: ['M3 5h14M3 10h14M3 15h14', 'M13 3v4M7 8v4M12 13v4'],
  undo: ['m7 3-4 4 4 4', 'M3 7h8a5 5 0 0 1 0 10'],
  redo: ['m13 3 4 4-4 4', 'M17 7H9a5 5 0 0 0 0 10'],
  settings: ['M3 5h14M3 10h14M3 15h14', 'M7 3v4M13 8v4M8 13v4'],
  expand: ['M3 7V3h4M13 3h4v4', 'M3 13v4h4M13 17h4v-4'],
};
const behaviors: Partial<Record<MobileGlyphName, FieldGlyphBehavior>> = { layers: 'layers', media: 'media', gallery: 'media', locale: 'globe', branches: 'branch', insert: 'plus', settings: 'gear', presets: 'presets' };
/** Compact, optically balanced line assets authored for the phone workspace. */
export default function MobileGlyph({ name, size = 22 }: { name: MobileGlyphName; size?: number }) {
  return <FieldGlyph behavior={behaviors[name] ?? 'generic'}><svg data-field-mobile-glyph={name} width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths[name].map((d, index) => <path key={index} d={d} />)}
  </svg></FieldGlyph>;
}
