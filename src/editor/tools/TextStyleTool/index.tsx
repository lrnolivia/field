// TextStyleTool — Complete text styling controls (pure composition).
// Each sub-control is a self-contained atom in ./atoms/.
// Reads/writes via useTextStyles hook or useControl depending on property type.

import { ToolSection, ToolDivider } from '../../controls';
import { CreateVariableGate } from '../../controls/create-variable-gate';
import { LocalizeGate } from '../../controls/localize-gate';
import { useControl } from '../../controls/ControlProvider';
import { trace } from '@/shared/debug-trace';
import {
  TypographyPresetControl,
  ContentControl, TextColorControl, TextFillControl,
  AlignControl, AdjustControl, TextPropertyControl,
  ElementPropertyControl, FontFamilyControl,
  DecorationControl, ShadowControl, StrokeControl,
} from './atoms';

export default function TextStyleTool() {
  const { node, styles } = useControl();

  // PropertiesPanel only renders TextStyleTool when isText is true — no need to re-check.
  if (!node) return null;

  // When a typography preset is active, hide all preset-controlled properties
  const hasPreset = !!styles.fontFamily?.startsWith('var(--typo-');

  trace.fn('TextStyleTool:render', { nodeId: node.id, nodeType: node.type, hasPreset });

  return (
    <>
      {/* Only Content / Color / Font Size may become variables. Gate the shared
          typography surface, then opt the supported properties back in. */}
      <LocalizeGate hidden>
      <CreateVariableGate hidden>
        <ToolSection title="Typography" collapsible>
          <TypographyPresetControl />
          <LocalizeGate hidden={false}>
            <CreateVariableGate hidden={false}><ContentControl /></CreateVariableGate>
          </LocalizeGate>
          <AlignControl />
          <AdjustControl />
          {!hasPreset && (
            <>
              <CreateVariableGate hidden={false}>
                <TextPropertyControl property="fontSize" label="Font Size" />
              </CreateVariableGate>
              <FontFamilyControl />
              <TextPropertyControl property="fontWeight" label="Weight" />
              <TextPropertyControl property="fontStyle" label="Italic" />
              <TextPropertyControl property="letterSpacing" label="Spacing" />
              <TextPropertyControl property="lineHeight" label="Line Height" />
              <ElementPropertyControl property="textTransform" label="Transform" />
              <ElementPropertyControl property="whiteSpace" label="Whitespace" />
              <ElementPropertyControl property="textOverflow" label="Overflow" />
              <ElementPropertyControl property="writingMode" label="Mode" />
              <DecorationControl />
              {/* field's text-background/highlight capability remains available
                  inside Typography; the Figma Fill section below is the glyph fill. */}
              <TextFillControl />
            </>
          )}
        </ToolSection>
        <ToolDivider />

        <ToolSection title="Fill" collapsible>
          <CreateVariableGate hidden={false}><TextColorControl /></CreateVariableGate>
        </ToolSection>
        <ToolDivider />

        {!hasPreset && (
          <>
            <ToolSection title="Stroke" collapsible>
              <StrokeControl />
            </ToolSection>
            <ToolDivider />

            <ToolSection title="Effects" collapsible>
              <ShadowControl />
            </ToolSection>
            <ToolDivider />
          </>
        )}
      </CreateVariableGate>
      </LocalizeGate>
    </>
  );
}
