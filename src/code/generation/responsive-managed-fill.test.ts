import { describe, expect, it } from 'vitest';
import { parseJSX } from '../parsing/ast-utils';
import { readBreakpointFills } from '@/shared/managed-fill-breakpoints';
import { extractStyleCSS, parseJSXToNodes } from '../parsing/parser';
import { migrateResponsiveFillHydrationFiles } from './responsive-fill-hydration';
import { editBreakpointFill } from './responsive-managed-fill';

const page = `'use client';
import React from 'react';
export default function Page() {
  return <div data-id="box"><p>Content</p></div>;
}`;
const replica = { id: 'compact', width: 1100 };

describe('responsive managed fill hydration', () => {
  it('gates a new video layer and removes the hook when the fill is cleared', () => {
    const edit = editBreakpointFill(page, 'box', replica, [replica], {
      kind: 'video', options: { src: '/film.mp4' },
    });

    expect(parseJSX(edit)).toBeTruthy();
    expect(edit).toContain('React.useSyncExternalStore(() => () => {}, () => true, () => false)');
    expect(edit).toMatch(/__fieldFillReady\s*&&\s*\(__mq\d+\s*\?\s*true\s*:\s*false\)\s*&&\s*<video/);
    expect(readBreakpointFills(parseJSXToNodes(edit).get('box')?.attrs?.['data-field-breakpoint-fills'])).toEqual({
      compact: expect.objectContaining({ kind: 'video' }),
    });

    const cleared = editBreakpointFill(edit, 'box', replica, [replica], { kind: 'clear' });
    expect(cleared).not.toContain('__fieldFillReady');
    expect(cleared).not.toContain('useSyncExternalStore');
    expect(cleared).not.toContain('data-bg-video');
    expect(cleared).toContain('<p>Content</p>');
  });

  it('migrates saved layers and leaves the shared motion gate and fill CSS intact', () => {
    const source = `'use client';
import React from 'react';
function useMediaQuery(query: string) { return typeof window !== 'undefined' && matchMedia(query).matches; }
export default function Page() {
  const __mq0 = useMediaQuery('(max-width: 1100px)');
  return <main data-id="box" data-field-breakpoint-fills="%7B%7D">
    <style>{'p { color: red; }'}</style>
    <motion.div initial={{ opacity: __mq0 ? 0 : 1 }} />
    {__mq0 ? 'Compact' : 'Wide'}
    {(__mq0 ? true : false) && <MeshGradient data-field-shader-layer="true" speed={1.4} />}
    {(__mq0 ? false : true) && <video data-bg-video="true" src="/film.mp4" autoPlay />}
  </main>;
}`;
    const files = new Map([['app/page.client.tsx', source]]);
    migrateResponsiveFillHydrationFiles(files);
    const migrated = files.get('app/page.client.tsx')!;
    expect(migrated.match(/const __fieldFillReady\b/g)).toHaveLength(1);
    expect(migrated.match(/__fieldFillReady\s*&&/g)).toHaveLength(2);
    expect(migrated).toContain('initial={{ opacity: __mq0 ? 0 : 1 }}');
    expect(migrated).toContain('speed={1.4}');
    expect(migrated).toContain("useMediaQuery('(max-width: 1100px)')");
    expect(extractStyleCSS(migrated)).toBe(extractStyleCSS(source));

    migrateResponsiveFillHydrationFiles(files);
    expect(files.get('app/page.client.tsx')).toBe(migrated);
  });
});

