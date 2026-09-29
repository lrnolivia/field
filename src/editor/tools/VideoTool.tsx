// VideoTool.tsx — Video source, poster, and HTML video attribute controls.
// Shows only when a <video> or <motion.video> element is selected.
// Uses UnifiedControlProvider with mode='htmlAttr' for attr-based controls.
// CSS properties (objectFit) use mode='direct'.

import { useState, useCallback } from 'react';
import { ToolSection, ToolSelect } from '../controls';
import { UnifiedControlProvider, useControlContext } from '../controls/unified';
import { ControlRow } from '../controls/unified/ControlRow';
import { useControl } from '../controls/ControlProvider';
import type { AtomProps } from '../controls/unified/types';
import { queueMutation } from '@/code/mutation/mutation-queue';
import { getViewportPrefix } from '@/canvas/node-ops';
import { getCanvasBridge } from '@/canvas/canvas-bridge';
import VideoSearchModal from '../ui/VideoSearchModal';
import ImageSearchModal from '../ui/ImageSearchModal';
import { trace } from '@/shared/debug-trace';

// ─── Options ────────────────────────────────────────────────────────────────

const OBJECT_FIT_OPTIONS = [
  { value: 'cover', label: 'Cover' },
  { value: 'contain', label: 'Contain' },
  { value: 'fill', label: 'Fill' },
  { value: 'none', label: 'None' },
  { value: 'scale-down', label: 'Scale Down' },
];

const PRELOAD_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'metadata', label: 'Metadata' },
  { value: 'none', label: 'None' },
];

const YES_NO_OPTIONS = [
  { value: '', label: 'No' },
  { value: 'true', label: 'Yes' },
];

// ─── ToolAtom: Yes/No Select ────────────────────────────────────────────────

function YesNoAtom() {
  const { value, onChange } = useControlContext();
  return <ToolSelect value={value || ''} onChange={onChange} options={YES_NO_OPTIONS} />;
}

function VideoControlsControl(props: AtomProps) {
  return (
    <UnifiedControlProvider property="controls" defaultValue="" mode={props.mode || 'htmlAttr'} {...props}>
      <ControlRow label="Controls"><YesNoAtom /></ControlRow>
    </UnifiedControlProvider>
  );
}

function VideoAutoplayControl(props: AtomProps) {
  return (
    <UnifiedControlProvider property="autoplay" defaultValue="" mode={props.mode || 'htmlAttr'} {...props}>
      <ControlRow label="Autoplay"><YesNoAtom /></ControlRow>
    </UnifiedControlProvider>
  );
}

function VideoLoopControl(props: AtomProps) {
  return (
    <UnifiedControlProvider property="loop" defaultValue="" mode={props.mode || 'htmlAttr'} {...props}>
      <ControlRow label="Loop"><YesNoAtom /></ControlRow>
    </UnifiedControlProvider>
  );
}

function VideoMutedControl(props: AtomProps) {
  return (
    <UnifiedControlProvider property="muted" defaultValue="" mode={props.mode || 'htmlAttr'} {...props}>
      <ControlRow label="Muted"><YesNoAtom /></ControlRow>
    </UnifiedControlProvider>
  );
}

// ─── ToolAtom: Preload Select ───────────────────────────────────────────────

function PreloadAtom() {
  const { value, onChange } = useControlContext();
  return <ToolSelect value={value || 'auto'} onChange={onChange} options={PRELOAD_OPTIONS} />;
}

function VideoPreloadControl(props: AtomProps) {
  return (
    <UnifiedControlProvider property="preload" defaultValue="auto" mode={props.mode || 'htmlAttr'} {...props}>
      <ControlRow label="Preload"><PreloadAtom /></ControlRow>
    </UnifiedControlProvider>
  );
}

// ─── ToolAtom: Object Fit (CSS property — direct mode) ──────────────────────

function FitAtom() {
  const { value, onChange } = useControlContext();
  return <ToolSelect value={value || 'cover'} onChange={onChange} options={OBJECT_FIT_OPTIONS} />;
}

function VideoFitControl(props: AtomProps) {
  return (
    <UnifiedControlProvider property="objectFit" defaultValue="cover" mode={props.mode || 'direct'} {...props}>
      <ControlRow label="Fit"><FitAtom /></ControlRow>
    </UnifiedControlProvider>
  );
}

// ─── VideoTool (composed from ToolAtoms) ────────────────────────────────────

export default function VideoTool() {
  const { node, nodeId, vpId } = useControl();

  if (!node || (node.type !== 'video' && node.type !== 'motion.video')) return null;

  return <VideoToolInner nodeId={nodeId!} node={node} vpId={vpId} />;
}

function VideoToolInner({
  nodeId,
  node,
  vpId,
}: {
  nodeId: string;
  node: NonNullable<ReturnType<typeof useControl>['node']>;
  vpId: string;
}) {
  const [mediaPicker, setMediaPicker] = useState<'video' | 'poster' | null>(null);

  const src = node.attrs?.src ?? '';
  const poster = node.attrs?.poster ?? '';

  // ─── Video selection ──────────────────────────────────────────────
  const handleVideoSelect = useCallback((url: string) => {
    trace.action('video-tool:select-video', { nodeId, url: url.slice(0, 80) });
    queueMutation({ type: 'updateHtmlAttrs', nodeId, attrs: { src: url } });
    // Instant canvas feedback via bridge — the canvas DOM lives in the iframe.
    getCanvasBridge().setAttribute(nodeId, getViewportPrefix(vpId), 'src', url);
    setMediaPicker(null);
  }, [nodeId, vpId]);

  // ─── Poster selection ─────────────────────────────────────────────
  const handlePosterSelect = useCallback((url: string) => {
    trace.action('video-tool:select-poster', { nodeId, url: url.slice(0, 80) });
    queueMutation({ type: 'updateHtmlAttrs', nodeId, attrs: { poster: url } });
    // Instant canvas feedback via bridge — the canvas DOM lives in the iframe.
    getCanvasBridge().setAttribute(nodeId, getViewportPrefix(vpId), 'poster', url);
    setMediaPicker(null);
  }, [nodeId, vpId]);

  const removePoster = useCallback(() => {
    trace.action('video-tool:remove-poster', { nodeId });
    queueMutation({ type: 'updateHtmlAttrs', nodeId, attrs: { poster: '' } });
    // Instant canvas feedback via bridge — null removes the attribute.
    getCanvasBridge().setAttribute(nodeId, getViewportPrefix(vpId), 'poster', null);
  }, [nodeId, vpId]);

  trace.fn('VideoTool:render', { nodeId, src: src.slice(0, 60), poster: poster.slice(0, 40) });

  return (
    <>
      <ToolSection title="Video" collapsible>
        {/* Video source — compact Media row, same interaction as Fill Video. */}
        {src ? (
          <button
            type="button"
            onClick={() => setMediaPicker(mediaPicker === 'video' ? null : 'video')}
            aria-expanded={mediaPicker === 'video'}
            className="w-full h-9 flex items-center gap-2 rounded-[4px] border border-[var(--control-border)] bg-[var(--grid-line)] px-1.5 text-left hover:border-[var(--control-border-hover)] hover:bg-[var(--bg-hover)] transition-colors"
            title={src}
          >
            <span className="h-6 w-9 shrink-0 overflow-hidden rounded-[3px] border border-[var(--border-light)] bg-black">
              <video src={src} muted playsInline preload="metadata" className="h-full w-full object-cover pointer-events-none" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--text-primary)]">Video</span>
            <span className="shrink-0 text-[10px] text-[var(--text-secondary)]">Change</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMediaPicker(mediaPicker === 'video' ? null : 'video')}
            aria-expanded={mediaPicker === 'video'}
            className="w-full h-8 flex items-center gap-2 rounded-[4px] border border-[var(--control-border)] bg-[var(--grid-line)] px-2 text-left text-[11px] text-[var(--text-secondary)] hover:border-[var(--control-border-hover)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
          >
            <span className="flex h-4 w-4 items-center justify-center text-[10px]" aria-hidden>▶</span>
            <span className="min-w-0 flex-1 truncate">Choose media</span>
            <span className="text-[10px] text-[var(--text-disabled)]">Video</span>
          </button>
        )}

        {mediaPicker === 'video' && (
          <div
            data-contextual-media-picker="video-source"
            className="mt-1 overflow-hidden rounded-[4px] border border-[var(--border-light)] bg-[var(--bg-panel)]"
          >
            <VideoSearchModal
              isOpen
              embedded
              compact
              onClose={() => setMediaPicker(null)}
              onSelect={handleVideoSelect}
            />
          </div>
        )}

        {/* Poster — swatch + label when set (like Fill Image), Choose button when empty */}
        <div className="flex items-center justify-between w-full">
          <span className="w-3/4 text-xs font-medium text-[var(--text-secondary)] select-none">Poster</span>
          {poster ? (
            <button
              onClick={() => setMediaPicker(mediaPicker === 'poster' ? null : 'poster')}
              className="w-full h-9 flex items-center gap-2 rounded-[4px] border border-[var(--control-border)] bg-[var(--grid-line)] px-1.5 text-[11px] text-[var(--text-primary)] hover:border-[var(--control-border-hover)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div
                className="w-6 h-6 rounded shrink-0 border border-[var(--border-light)]"
                style={{ backgroundImage: `url(${poster})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              />
              <span className="truncate">Image</span>
            </button>
          ) : (
            <button
              onClick={() => setMediaPicker(mediaPicker === 'poster' ? null : 'poster')}
              className="w-full h-8 rounded-[4px] border border-[var(--control-border)] bg-[var(--grid-line)] px-2 text-left text-[11px] text-[var(--text-secondary)] hover:border-[var(--control-border-hover)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
            >
              Choose media
            </button>
          )}
        </div>

        {mediaPicker === 'poster' && (
          <div
            data-contextual-media-picker="video-poster"
            className="mt-1 overflow-hidden rounded-[4px] border border-[var(--border-light)] bg-[var(--bg-panel)]"
          >
            <ImageSearchModal
              isOpen
              embedded
              compact
              onClose={() => setMediaPicker(null)}
              onSelect={handlePosterSelect}
            />
          </div>
        )}

        {/* ToolAtom controls — all using UnifiedControlProvider */}
        <VideoControlsControl />
        <VideoAutoplayControl />
        <VideoLoopControl />
        <VideoMutedControl />
        <VideoPreloadControl />
        <VideoFitControl />
      </ToolSection>

    </>
  );
}
