// TextStyleTool — Figma-shaped typography + text appearance composition.
// The underlying text/style engines remain source-first; this file controls
// inspector topology and which controls stay in the primary stack.

import { ToolSection, ToolDivider } from '../../controls';
import { CreateVariableGate } from '../../controls/create-variable-gate';
import { LocalizeGate } from '../../controls/localize-gate';
import { useControl } from '../../controls/ControlProvider';
import { StyleSectionActions } from '../StylesTool/InspectorSectionActions';
import TypographyAdvancedPopover from './TypographyAdvancedPopover';
import { trace } from '@/shared/debug-trace';
import {
  TypographyPresetControl,
  TextColorControl,
  AlignControl,
  AdjustControl,
  TextPropertyControl,
  FontFamilyControl,
  ShadowControl,
  StrokeControl,
} from './atoms';

export default function TextStyleTool({ inline = false }: { inline?: boolean } = {}) {
  const { node, styles, updateStyle } = useControl();
  if (!node) return null;

  const hasPreset = !!styles.fontFamily?.startsWith('var(--typo-');

  const addGlyphFill = () => {
    if (!styles.color) updateStyle('color', '#000000');
  };
  const addTextStroke = () => {
    if (!styles.WebkitTextStroke && !styles.webkitTextStroke) updateStyle('WebkitTextStroke', '1px #000000');
  };
  const addTextShadow = () => {
    if (!styles.textShadow || styles.textShadow === 'none') updateStyle('textShadow', '0 4px 8px rgba(0, 0, 0, 0.25)');
  };

  trace.fn('TextStyleTool:render', { nodeId: node.id, nodeType: node.type, hasPreset });

  if (inline) return <div data-mobile-text-controls>
    <div><FontFamilyControl compact /></div>
    <div><TypographyPresetControl compact /></div>
    <div><TextPropertyControl compact property="fontWeight" label="Weight" /></div>
    <div><TextPropertyControl compact property="fontSize" label="Font Size" /></div>
    <div><TextPropertyControl compact property="lineHeight" label="Line Height" /></div>
    <div><TextPropertyControl compact property="letterSpacing" label="Spacing" /></div>
    <div><AlignControl /></div><div><AdjustControl /></div>
    <div><TypographyAdvancedPopover /></div>
    <div><TextColorControl compactSection /></div>
    <div><StrokeControl compactSection /></div>
    <div><ShadowControl compactSection /></div>
  </div>;

  return (
    <>
      <LocalizeGate hidden>
      <CreateVariableGate hidden>
        <ToolSection
          title="Typography"
          collapsible
          action={<TypographyPresetControl actionOnly />}
        >
          {hasPreset ? (
            <TypographyPresetControl compact />
          ) : (
            <>
              <FontFamilyControl compact />
              <div data-typography-weight-size className="grid grid-cols-2 gap-2">
                <TextPropertyControl compact property="fontWeight" label="Weight" />
                <CreateVariableGate hidden={false}>
                  <TextPropertyControl compact property="fontSize" label="Font Size" />
                </CreateVariableGate>
              </div>
              <div data-typography-leading-spacing className="grid grid-cols-2 gap-2">
                <TextPropertyControl compact property="lineHeight" label="Line Height" />
                <TextPropertyControl compact property="letterSpacing" label="Spacing" />
              </div>
            </>
          )}

          <div data-typography-alignment-row className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-center min-w-0">
            <AlignControl compact primary />
            <AdjustControl compact />
            <TypographyAdvancedPopover />
          </div>
        </ToolSection>
        <ToolDivider />

        <ToolSection
          title="Fill"
          collapsible
          action={
            <StyleSectionActions
              property="color"
              onAdd={addGlyphFill}
              addDisabled={!!styles.color}
              addTitle="Add fill"
            />
          }
        >
          <CreateVariableGate hidden={false}><TextColorControl compactSection /></CreateVariableGate>
        </ToolSection>
        <ToolDivider />

        <ToolSection
          title="Stroke"
          collapsible
          action={
            <StyleSectionActions
              property="WebkitTextStroke"
              showStyle={false}
              onAdd={addTextStroke}
              addDisabled={!!(styles.WebkitTextStroke || styles.webkitTextStroke)}
              addTitle="Add stroke"
            />
          }
        >
          <StrokeControl compactSection />
        </ToolSection>
        <ToolDivider />

        <ToolSection
          title="Effects"
          collapsible
          action={
            <StyleSectionActions
              property="textShadow"
              showStyle={false}
              onAdd={addTextShadow}
              addTitle="Add effect"
            />
          }
        >
          <ShadowControl compactSection />
        </ToolSection>
        <ToolDivider />
      </CreateVariableGate>
      </LocalizeGate>
    </>
  );
}
