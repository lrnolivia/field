// FIGUI3_LEFT_RAIL_COMMAND_CHROME_20260925
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read=(p:string)=>readFileSync(p,'utf8');
describe('FigUI3 left rail command chrome',()=>{
 it('removes inherited cut-corner geometry',()=>{const r=read('src/editor/left-toolbar/LeftMenu.tsx');expect(r).toContain('FigUI3 command rail');expect(r).toContain('rounded-[4px]');expect(r).toContain('rounded-[6px]');expect(r).not.toContain('cut-corners');});
 it('keeps selection functional and inactive chrome neutral',()=>{const r=read('src/editor/left-toolbar/LeftMenu.tsx');expect(r).toContain('bg-[var(--rail-active-bg)] text-[var(--rail-active-fg)]');expect(r).not.toContain('bg-[var(--accent)] text-[var(--accent-brand-fg)]');});
 it('uses restrained neutral tooltip chrome',()=>{const r=read('src/editor/left-toolbar/LeftMenu.tsx');expect(r).toContain('left: rect.right + 8');expect(r).toContain('border border-[var(--border-light)]');expect(r).toContain('bg-[var(--bg-panel)]');});
});
