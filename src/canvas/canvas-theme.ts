// canvas-theme.ts — website appearance shown in Canvas + Preview.
//
// A website's tokens live in app/globals.css twice: `:root { … }` for light
// and `:root.dark { … }` for dark (the class next-themes puts on <html> on
// the live site). Canvas/Preview use a dedicated per-user viewing preference,
// independent from FIELD CHROME. Changing editor chrome never changes which
// website theme is being inspected, and this viewing preference never rewrites
// project source or the published site's own theme/default behavior.
//
// One extractor for both lifters (Renderer at render time, node-ops on token
// edits) — they used to keep two copies of this scan, and a rule one knew
// about and the other did not was exactly the kind of drift a live token
// edit would expose.

import { getDefaultStore } from 'jotai';
import { websitePreviewThemeAtom } from '@/code/stores/user-preferences-store';

export type CanvasThemeMode = 'light' | 'dark';

/** The website appearance currently being inspected in Canvas + Preview. */
export function canvasThemeMode(): CanvasThemeMode {
  return getDefaultStore().get(websitePreviewThemeAtom);
}

/** Every `@<name> … { … }` block, nested braces included. A regex breaks on
 *  the nested `from { } to { }` of a keyframes rule. */
function atRuleBlocks(css: string, name: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < css.length) {
    const start = css.indexOf(name, i);
    if (start === -1) break;
    let j = start + name.length;
    while (j < css.length && css[j] !== '{') j++;
    if (j >= css.length) break;
    let depth = 1; j++;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    out.push(css.slice(start, j));
    i = j;
  }
  return out;
}

/**
 * What the canvas lifts out of app/globals.css, and nothing else: the token
 * blocks for `mode`, `@keyframes`, and — separately, for the stable fonts
 * sheet — `@import` and `@font-face`. Never the resets, `body`, `a`, `img`:
 * those would leak into the builder UI.
 *
 * `:root` is scoped to `[data-content-root]` for the same reason. A dark
 * block (`:root.dark`, or the legacy `[data-theme="dark"]`) is lifted only
 * in dark mode, after the light blocks, so its values win by order; any
 * other `[data-theme=…]` block is lifted as before.
 */
export function extractCanvasGlobals(
  rawCSS: string,
  mode: CanvasThemeMode,
): { tokensCSS: string; fontsCSS: string } {
  const imports: string[] = [];
  // @import MUST be the first rule in its sheet (CSS spec) — collected up
  // front and emitted first in the fonts sheet.
  const css = rawCSS.replace(/@import\s+url\([^)]*\)[^;]*;/g, (match) => {
    imports.push(match);
    return '';
  });
  const light: string[] = [];
  const dark: string[] = [];
  let m: RegExpExecArray | null;
  const rootRx = /:root\s*\{([^}]*)\}/g;
  while ((m = rootRx.exec(css)) !== null) light.push(`[data-content-root] {${m[1]}}`);
  const darkRx = /:root\.dark\s*\{([^}]*)\}/g;
  while ((m = darkRx.exec(css)) !== null) dark.push(`[data-content-root] {${m[1]}}`);
  const themeRx = /\[data-theme([^\]]*)\]\s*\{([^}]*)\}/g;
  while ((m = themeRx.exec(css)) !== null) {
    (/dark/.test(m[1]) ? dark : light).push(`[data-content-root] {${m[2]}}`);
  }
  const tokens = [...light, ...(mode === 'dark' ? dark : []), ...atRuleBlocks(css, '@keyframes')];
  return {
    tokensCSS: tokens.join('\n'),
    fontsCSS: [...imports, ...atRuleBlocks(css, '@font-face')].join('\n'),
  };
}
