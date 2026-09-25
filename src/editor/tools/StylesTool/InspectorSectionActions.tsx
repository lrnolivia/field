import { useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useControl } from '../../controls/ControlProvider';
import PresetPicker from '../../ui/PresetPicker';
import { presetTokensAtom } from '@/code/stores/preset-store';
import { MIX_BLEND_MODE_OPTIONS } from './atoms/MixBlendModeControl';
import { queueMutation } from '@/code/mutation/mutation-queue';

function DotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <circle cx="4" cy="4" r="1.4" /><circle cx="12" cy="4" r="1.4" />
      <circle cx="4" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" />
    </svg>
  );
}

function EffectMenuIcon({ label }: { label: string }) {
  if (label.includes('shadow')) {
    return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="3" y="3" width="8" height="8" rx="1" /><path d="M6 13h6a1 1 0 0 0 1-1V6" opacity=".55" /></svg>;
  }
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="4" cy="4" r=".8" /><circle cx="8" cy="4" r=".8" /><circle cx="12" cy="4" r=".8" /><circle cx="4" cy="8" r=".8" /><circle cx="8" cy="8" r=".8" /><circle cx="12" cy="8" r=".8" /><circle cx="4" cy="12" r=".8" /><circle cx="8" cy="12" r=".8" /><circle cx="12" cy="12" r=".8" /></svg>;
}

export function AppearanceHeaderActions({ canHide = true }: { canHide?: boolean }) {
  const { node, nodeId, styles, updateStyle } = useControl();
  const [blendOpen, setBlendOpen] = useState(false);
  const blendRef = useRef<HTMLDivElement>(null);
  const hidden = styles.display === 'none';
  const blend = styles.mixBlendMode || 'normal';
  const displayMemoryAttr = 'data-field-display-before-hide';
  const rememberedDisplay = node?.attrs?.[displayMemoryAttr] ?? '';

  // Layer visibility is modelled as display:none, but the eye must never
  // destroy an explicitly authored display value. Persist the prior value
  // in an internal data attribute so hide/show survives panel remounts and
  // source reloads. If layout was changed while hidden, clearing display lets
  // node-ops restore the now-current flex/grid semantics deterministically.
  const toggleVisibility = () => {
    if (!hidden) {
      if (nodeId) {
        queueMutation({
          type: 'updateHtmlAttrs',
          nodeId,
          attrs: { [displayMemoryAttr]: styles.display || '__unset__' },
        });
      }
      updateStyle('display', 'none');
      return;
    }

    const hasLayoutSemantics = !!(
      styles.flexDirection || styles.flexWrap || styles.flexGrow ||
      styles.gridTemplateColumns || styles.gridTemplateRows ||
      styles.gridAutoFlow || styles.justifyItems
    );
    const restore = hasLayoutSemantics
      ? ''
      : rememberedDisplay && rememberedDisplay !== '__unset__'
        ? rememberedDisplay
        : '';
    updateStyle('display', restore);
    if (nodeId) {
      queueMutation({ type: 'updateHtmlAttrs', nodeId, attrs: { [displayMemoryAttr]: '' } });
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      {canHide && (
        <button
          type="button"
          data-appearance-visibility
          onClick={toggleVisibility}
          className={`h-[var(--control-height)] w-[var(--control-height)] flex items-center justify-center rounded-[var(--control-radius)] hover:bg-[var(--bg-hover)] ${hidden ? 'text-[var(--text-disabled)]' : 'text-[var(--text-primary)]'}`}
          title={hidden ? 'Show' : 'Hide'}
          aria-pressed={hidden}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M1.5 8s2.2-4 6.5-4 6.5 4 6.5 4-2.2 4-6.5 4S1.5 8 1.5 8Z" />
            <circle cx="8" cy="8" r="1.75" />
          </svg>
        </button>
      )}

      <div ref={blendRef} className="relative">
        <button
          type="button"
          data-appearance-blend-mode
          onClick={() => setBlendOpen(v => !v)}
          className={`h-[var(--control-height)] w-[var(--control-height)] flex items-center justify-center rounded-[var(--control-radius)] hover:bg-[var(--bg-hover)] ${blend !== 'normal' || blendOpen ? 'bg-[var(--bg-selected)] text-[var(--text-primary)]' : 'text-[var(--text-primary)]'}`}
          title="Apply blend mode"
          aria-expanded={blendOpen}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M8 1.5C6.4 4 3.8 6.4 3.8 9.5A4.2 4.2 0 0 0 8 13.7a4.2 4.2 0 0 0 4.2-4.2C12.2 6.4 9.6 4 8 1.5Z" />
          </svg>
        </button>

        {blendOpen && (
          <>
            <div className="fixed inset-0 z-[10010]" onClick={() => setBlendOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-[10011] w-[180px] max-h-[340px] overflow-y-auto py-1.5 bg-[var(--dropdown-bg)] border border-[var(--border-light)] rounded-lg shadow-[var(--shadow-lg)]">
              {MIX_BLEND_MODE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { updateStyle('mixBlendMode', opt.value === 'normal' ? '' : opt.value); setBlendOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-[var(--bg-hover)]"
                >
                  <span className="w-3 text-center">{blend === opt.value || (!styles.mixBlendMode && opt.value === 'normal') ? '✓' : ''}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function StyleSectionActions({
  property,
  onAdd,
  addOptions,
  onApplyToken,
  addDisabled = false,
  showStyle = true,
  addTitle = 'Add',
}: {
  property: string;
  onAdd?: () => void;
  addOptions?: Array<{ label: string; onClick: () => void }>;
  onApplyToken?: (tokenName: string) => void;
  addDisabled?: boolean;
  showStyle?: boolean;
  addTitle?: string;
}) {
  const { updateStyle } = useControl();
  const tokens = useAtomValue(presetTokensAtom);
  const [styleOpen, setStyleOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const styleRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex items-center gap-0.5">
      {showStyle && (
        <>
          <button
            ref={styleRef}
            type="button"
            data-inspector-style-action={property}
            onClick={() => setStyleOpen(true)}
            className="h-[var(--control-height)] w-[var(--control-height)] flex items-center justify-center rounded-[var(--control-radius)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            title="Apply styles and variables"
          >
            <DotsIcon />
          </button>
          <PresetPicker
            property={property}
            tokens={tokens}
            isOpen={styleOpen}
            onClose={() => setStyleOpen(false)}
            anchorRef={styleRef}
            onSelect={(tokenName) => onApplyToken ? onApplyToken(tokenName) : updateStyle(property, `var(--${tokenName})`)}
          />
        </>
      )}

      {(onAdd || addOptions?.length) && (
        <div className="relative">
          <button
            type="button"
            data-inspector-add-action={property}
            disabled={addDisabled}
            onClick={() => {
              if (addOptions?.length) setAddOpen(v => !v);
              else onAdd?.();
            }}
            className="h-[var(--control-height)] w-[var(--control-height)] flex items-center justify-center rounded-[var(--control-radius)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-default"
            title={addTitle}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M8 2v12M2 8h12" />
            </svg>
          </button>
          {addOpen && addOptions?.length ? (
            <>
              <div className="fixed inset-0 z-[10012]" onClick={() => setAddOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-[10013] min-w-[168px] py-1 bg-[var(--dropdown-bg)] border border-[var(--border-light)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)]">
                {addOptions.map(option => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => { option.onClick(); setAddOpen(false); }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left text-[var(--text-primary)] hover:bg-[var(--accent)] hover:text-[var(--accent-fg)]"
                  >
                    <EffectMenuIcon label={option.label} />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
