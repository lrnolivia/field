import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const host = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/ToolbarPanelHost.tsx'), 'utf8');

describe('toolbar-origin popup host', () => {
  it('uses the canonical Media toolbar shell for legacy Media subflows too', () => {
    expect(host).toContain('<MediaPanelController onClose=');
    const media = fs.readFileSync(path.resolve(process.cwd(), 'src/editor/media/MediaPanelController.tsx'), 'utf8');
    expect(media).toContain("import MediaToolbarPopover from './MediaToolbarPopover'");
    expect(host).not.toContain('function MediaToolbarPopover({');
    expect(media).toContain('expanded={expanded}');
    expect(media).toMatch(/<ImageSearchModal\s+isOpen\s+embedded/);
    expect(media).toMatch(/<VideoSearchModal\s+isOpen\s+embedded/);
    expect(host).not.toContain('<Modal isOpen title="Create Gallery"');
  });

  it('anchors generic toolbar panels to the launching toolbar tool and springs open', () => {
    expect(host).toContain('function toolbarPanelOriginTool');
    expect(host).toContain('data-toolbar-tool');
    expect(host).toContain("type: 'spring'");
    expect(host).toContain('data-toolbar-panel-origin-pointer');
    expect(host).not.toContain('transition-[top,left]');
  });

  it('uses a transparent click-catcher instead of modal dimming', () => {
    expect(host).toContain('field-toolbar-panel-backdrop fixed inset-0 z-[15000] bg-transparent');
    expect(host).not.toContain('bg-black/25');
    expect(host).not.toContain("backdropFilter: peeked");
  });
});
