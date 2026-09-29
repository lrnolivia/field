// FILL_PICKER_SHELL_CONTRACT_20260929
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const fillSource = readFileSync(
  new URL('./tools/StylesTool/atoms/FillControl.tsx', import.meta.url),
  'utf8',
);
const shellSource = readFileSync(new URL('./ui/PaintPickerShell.tsx', import.meta.url), 'utf8');
const colorSource = readFileSync(new URL('./ui/ColorPicker.tsx', import.meta.url), 'utf8');

describe('fill picker shell contract', () => {
  it('opens Fill as an anchored floating ToolPopup instead of Inspector navigation', () => {
    expect(fillSource).toContain('const [fillPopupOpen, setFillPopupOpen] = useState(false)');
    expect(fillSource).toContain('isOpen={fillPopupOpen}');
    expect(fillSource).toContain('anchorRef={btnRef}');
    expect(fillSource).toContain('width={360}');
    expect(fillSource).toContain('hideHeader');
    expect(fillSource).not.toContain("useEditorPanel('Fill'");
    expect(fillSource).not.toContain('<OptionsPanel>');
  });

  it('uses the same universal PaintPickerShell as other paint properties', () => {
    expect(fillSource).toContain('<PaintPickerShell');
    expect(fillSource).toContain('supportedTypes={supportedPaintTypes}');
    expect(fillSource).toContain('solidOnly ? SOLID_ONLY_PAINT_TYPES : ALL_PAINT_TYPES');
    expect(shellSource).toContain("['solid', 'gradient', 'pattern', 'image', 'video', 'shader']");
  });

  it('keeps unsupported paint types visible and disabled rather than hiding them', () => {
    expect(shellSource).toContain('disabled={!supported}');
    expect(shellSource).toContain("data-supported={supported ? 'true' : 'false'}");
    expect(shellSource).toContain('isn’t supported for');
  });

  it('reuses the existing preset/library systems and canonical type editors', () => {
    expect(fillSource).toContain('<AssetPresetGrid');
    expect(fillSource).toContain('<PatternLibraryPanel');
    expect(fillSource).toContain('<ShaderFillTab');
    expect(fillSource).toContain('canonicalFill');
    expect(colorSource).toContain('pageColors');
    expect(colorSource).toContain('embeddedBody');
  });

  it('keeps semantic Pattern, Video, and Shader fills in Single mode until the paint stack owns them natively', () => {
    expect(fillSource).toContain('const semanticSingleFill = hasSemanticSingleFill(ctx?.node)');
    expect(fillSource).toContain("node?.attrs?.['data-field-pattern']");
    expect(fillSource).toContain("node?.attrs?.['data-field-shader-fill']");
    expect(fillSource).toContain('node?.bgVideo');
  });

  it('re-detects the selected paint type after undo/redo on the same node', () => {
    expect(fillSource).toContain("const typeSig = solidOnly ? 'color' : fillTypeSignature(styles, node)");
    expect(fillSource).toContain('[nodeId, solidOnly, typeSig]');
  });
});
