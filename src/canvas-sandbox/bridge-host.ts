// bridge-host.ts â€” Parent-side handle for the sandbox iframe.
//
// Parent â†’ iframe RPC goes through Comlink (postMessage under the hood, proxied
// to feel like async method calls). 1.1KB of comlink replaces ~100 lines of
// manual UUID-correlation / pending-map machinery.
//
// Iframe â†’ parent events (allRects, rectUpdate, computedUpdate, cornersUpdate,
// renderComplete, nodeMouseDown, error) stay as raw postMessage. They fire
// frequently and don't need request/response semantics â€” they just push fresh
// data into the parent caches.
//
// CanvasBridge (sync interface served from caches) is implemented on top of
// the Comlink remote. Sync getters return cached values; the caches are
// populated via the iframe's own emit-events.

import * as Comlink from 'comlink';
import type { CanvasBridge } from '@/canvas/canvas-bridge';
import type { SandboxApi, RenderInput, PatchUpdate, TextEditCommand } from './sandbox-api';
import type { TextEditFitResult, SandboxEvent, TextEditSnapshot } from './protocol';
import {
  isSandboxEvent,
  serializeNodeMap,
  wrapCanvasHostViewportTransform,
  SANDBOX_ORIGIN,
} from './protocol';
import type { ViewportConfig } from '@/shared/types';
import type { CanvasNode } from '@/code/parsing/parser';
import { trace } from '@/shared/debug-trace';
import { viewportBandPinOps } from '@/canvas/resize/viewport-band-pin-store';
import { readProjectVersion, type CacheEpoch } from '@/canvas/canvas-bridge';

export class PostMessageBridge implements CanvasBridge {
  private iframe: HTMLIFrameElement | null = null;
  private remote: Comlink.Remote<SandboxApi> | null = null;
  private ready = false;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;

  // Rect cache â€” populated after each render and by rectUpdate events.
  // Key: "vpPrefix:nodeId", Value: DOMRect (in iframe-space, toParentSpace translates on read)
  rectCache = new Map<string, DOMRect>();
  private containerRectCache: DOMRect | null = null;

  /** Render epoch â€” stamped onto every render(); allRects echoes the epoch it
   *  measured against, and older-epoch emissions are DROPPED (a pre-switch
   *  remeasure otherwise lands after the switch's cache wipe and wholesale
   *  repopulates the caches with the previous file's geometry). */
  private renderSeq = 0;
  // DELTA-render bookkeeping: the node map as of the last SEND (identity
  // snapshot), its seq, and the seq the sandbox has ACKNOWLEDGED applying
  // (renderComplete). A delta is only safe when acked === sent â€” the sandbox
  // then provably holds `lastSentNodes` as its retained base.
  private lastSentNodes: Map<string, CanvasNode> | null = null;
  private lastSentSeq = 0;
  private lastAckedSeq = 0;

  // Generation counter â€” bumped on every allRects (full cache rebuild).
  // In-flight prefetch promises capture the generation at start time and
  // skip writing if the cache has been rebuilt since. Without this, a
  // prefetch fired during a drag could resolve AFTER the post-drop render
  // already refreshed the cache, overwriting fresh rects with stale ones
  // captured mid-drag â€” visible bug: hover hit-test lands on the wrong
  // element after a reorder commit.
  private cacheGeneration = 0;

  /** Render sequence + project version the caches were FILLED against.
   *  Cleared with the caches, so a wiped cache never parades as a fresh
   *  measurement. Single-entry updates (rectUpdate/computedUpdate) do not
   *  move it â€” same fill, same epoch. */
  private cacheEpoch: CacheEpoch | null = null;

  /** CanvasBridge surface for the epoch â€” lets a reader tell whether a
   *  measurement predates its own write. */
  getCacheEpoch(): CacheEpoch | null {
    return this.cacheEpoch;
  }

  // Computed style cache â€” prefetched before continuous interactions, kept fresh via computedUpdate events.
  // Key: "vpPrefix:nodeId", Value: map of CSS property â†’ computed value
  private computedCache = new Map<string, Record<string, string>>();

  // Corners cache â€” populated via cornersUpdate events from patchStyles, used for rotated/skewed elements.
  // Key: "vpPrefix:nodeId", Value: corners in iframe-space (offset applied on read)
  private cornersCache = new Map<string, { TL: { x: number; y: number }; TR: { x: number; y: number }; BR: { x: number; y: number }; BL: { x: number; y: number } }>();

  // Transform tracking for rect delta adjustment during pan/zoom.
  private cacheTransform: { x: number; y: number; scale: number } = { x: 0, y: 0, scale: 1 };
  private currentTransform: { x: number; y: number; scale: number } = { x: 0, y: 0, scale: 1 };

  // Event callbacks
  onRenderComplete: (() => void) | null = null;
  onNodeMouseDown: ((nodeId: string, event: { clientX: number; clientY: number; button: number; shiftKey: boolean; altKey: boolean; ctrlKey: boolean; metaKey: boolean }) => void) | null = null;
  onSandboxMouseMove: ((clientX: number, clientY: number) => void) | null = null;
  onReady: (() => void) | null = null;
  // canvas-dnd event callbacks (raw postMessage from sandbox)
  onDndCommit: ((updates: Array<{ type: string; nodeId: string; newParentId?: string | null; newIndex?: number; styles?: Record<string, string> }>) => void) | null = null;
  onDndSelect: ((selectedIds: string[]) => void) | null = null;
  onDndHover: ((hoveredId: string | null) => void) | null = null;
  onDndViewportHit: ((viewport: string) => void) | null = null;
  onDndDragState: ((state: { isDragging: boolean; source: string }) => void) | null = null;
  // Text-edit event callbacks (sandbox-hosted TipTap â†’ parent toolbar/state)
  onTextEditSelectionChanged: ((snapshot: TextEditSnapshot) => void) | null = null;
  onTextEditContentChanged: ((html: string) => void) | null = null;
  onTextEditCommitted: ((html: string, fit?: TextEditFitResult) => void) | null = null;
  onTextEditCancelled: (() => void) | null = null;
  // Shape-edit cancel callback (Escape inside iframe etc.). Commit is
  // an awaitable Comlink RPC â€” see commitShapeEdit() â€” not an event.
  onShapeEditCancelled: (() => void) | null = null;
  // Pen-creation: user clicked away â†’ FINISH (commit + exit), vs cancel=discard.
  onShapeEditDone: (() => void) | null = null;
  // Library reports the selected-anchor's position + handle-mode whenever
  // selection changes (or the user toggles curve mode). Parent registers
  // a handler to drive the shape-edit Path tool (Position + Curve).
  onAnchorInfo: ((info: null | { shapeIndex: number; anchorIndex: number; x: number; y: number; handleMode: 'straight' | 'mirrored' | 'disconnected' }) => void) | null = null;

  constructor() {
    this.readyPromise = new Promise(resolve => { this.readyResolve = resolve; });
    window.addEventListener('message', this.handleMessage);
  }

  /** Set the iframe element. Called after iframe loads. */
  setIframe(iframe: HTMLIFrameElement): void {
    this.iframe = iframe;
    if (iframe.contentWindow) {
      // Wrap the iframe's contentWindow with Comlink. windowEndpoint adapts the
      // Window's postMessage signature to Comlink's Worker-style API.
      this.remote = Comlink.wrap<SandboxApi>(Comlink.windowEndpoint(iframe.contentWindow));
    }
    trace.action('postmessage-bridge:setIframe', { src: iframe.src, hasRemote: !!this.remote });
  }

  /** Wait for sandbox to be ready. */
  waitForReady(): Promise<void> {
    if (this.ready) return Promise.resolve();
    return this.readyPromise;
  }

  /** Iframe's `contentDocument` so callers can inject into the sandbox's
   *  document head (e.g. Google Fonts `<link>` for hover-preview). The
   *  iframe is same-origin (parent dev server hosts both ports), so
   *  cross-document access works. Returns null when the iframe hasn't
   *  loaded yet â€” caller should retry on next ready tick. */
  getIframeDocument(): Document | null {
    return this.iframe?.contentDocument ?? null;
  }

  /** Check if sandbox is ready. */
  get isReady(): boolean {
    return this.ready;
  }

  /** Clean up. */
  destroy(): void {
    window.removeEventListener('message', this.handleMessage);
    this.remote?.[Comlink.releaseProxy]?.();
    this.remote = null;
    this.iframe = null;
  }

  // â”€â”€â”€ Commands (fire-and-forget; comlink awaits but we don't have to) â”€â”€

  /** Send a full render command to sandbox. */
  render(
    nodes: Map<string, CanvasNode>,
    viewports: ViewportConfig[],
    code: string,
    css: string,
    globalsCss: string,
    activeLocale?: string,
    defaultLocale?: string,
    transform?: { x: number; y: number; scale: number },
    cmsCollections?: { data: Record<string, any[]>; schemas: Record<string, any> },
    localeOverrides?: Map<string, import('@/shared/types').NodeOverride>,
    layoutCss?: string,
    /** File-switch renders: disable the per-element subtree-skip (see RenderInput). */
    distrustPatchKeys?: boolean,
    /** Same-file distrusted renders (undo/redo restore): keep culling state â€”
     *  the file-switch cull reset exists for cross-file id collisions only. */
    preserveCulling?: boolean,
  ): void {
    if (transform) this.currentTransform = { ...transform };
    // Maps don't survive structured cloning the way objects do â€” Comlink
    // serializes them but our consumer (sandbox renderNodes) expects a Map,
    // so we hand the iframe a plain Record and re-Map it on the other side.
    const localeOverridesObj = localeOverrides && localeOverrides.size > 0
      ? Object.fromEntries(localeOverrides)
      : undefined;
    // DELTA when possible: identity-diff against the last acknowledged send.
    // Guards: never on distrusted renders (undo residue / file switch), never
    // before the sandbox acked the base, and only when the delta is small
    // (an edit; a reparse without identity-preserve falls back to full).
    const seqForSend = this.renderSeq + 1;
    let nodesDelta: RenderInput['nodesDelta'];
    // NOTE: distrusted renders (undo restore / file switch) still delta â€”
    // distrust changes the sandbox's PATCH WALK, not the payload; the merged
    // map is identical to a full send. A file switch's map shares no
    // identities, so the size guard forces it to full naturally.
    if (this.lastSentNodes && this.lastAckedSeq === this.lastSentSeq) {
      const changed: Array<[string, CanvasNode]> = [];
      for (const [id, n] of nodes) if (this.lastSentNodes.get(id) !== n) changed.push([id, n]);
      const removed: string[] = [];
      for (const id of this.lastSentNodes.keys()) if (!nodes.has(id)) removed.push(id);
      if (changed.length + removed.length <= Math.max(8, nodes.size / 4)) {
        nodesDelta = { changed, removed, baseSeq: this.lastSentSeq };
      }
    }
    const input: RenderInput = {
      nodes: nodesDelta ? undefined : serializeNodeMap(nodes),
      nodesDelta,
      viewports,
      code,
      css,
      globalsCss,
      layoutCss,
      activeLocale,
      defaultLocale,
      transform,
      cmsCollections,
      localeOverrides: localeOverridesObj,
      distrustPatchKeys,
      preserveCulling,
      // Viewport-drag band pin â€” the sandbox Renderer has its own module
      // instances, so the parent's pin state must ride every render.
      bandPin: viewportBandPinOps.get(),
      // Epoch for stale-emission rejection (see the allRects handler).
      renderSeq: (this.renderSeq = seqForSend),
    };
    this.lastSentNodes = new Map(nodes);
    this.lastSentSeq = input.renderSeq!;
    trace.action('postmessage-bridge:send-render', {
      nodeCount: nodes.size, vpCount: viewports.length, overrideCount: localeOverrides?.size ?? 0,
      mode: nodesDelta ? 'delta' : 'full',
      ...(nodesDelta ? { changed: nodesDelta.changed.length, removed: nodesDelta.removed.length } : {}),
    });
    this.remote?.render(input);
  }

  /** Fire-and-forget style patch. 60fps safe. */
  patchStyles(nodeId: string, vpPrefix: string, styles: Record<string, string>, important = false): void {
    this.remote?.patchStyles(nodeId, vpPrefix, styles, important);
  }

  setSelectionColorLocateHighlight(
    nodeId: string,
    vpPrefix: string,
    luminousRgb: [number, number, number],
    contrastTone: 'white' | 'black',
    mode: 'hover' | 'click',
    revision: number,
  ): void {
    this.remote?.setSelectionColorLocateHighlight(nodeId, vpPrefix, luminousRgb, contrastTone, mode, revision);
  }

  clearSelectionColorLocateHighlights(): void {
    this.remote?.clearSelectionColorLocateHighlights();
  }

  previewPatchStyles(nodeId: string, vpPrefix: string, styles: Record<string, string>): void {
    this.remote?.previewPatchStyles(nodeId, vpPrefix, styles);
  }

  previewRestoreStyles(nodeId: string, vpPrefix: string, resting: Record<string, string>): void {
    this.remote?.previewRestoreStyles(nodeId, vpPrefix, resting);
  }

  /** Imperative-first delete: drop every copy of the node from the iframe DOM now,
   *  so the canvas reflects the delete on the keystroke instead of after the async
   *  re-parse + re-render (~0.3s). The removeNode code mutation makes it permanent. */
  removeElement(nodeId: string): void {
    this.remote?.removeElement(nodeId);
  }

  private applyComputedUpdate(entry: { nodeId: string; vpPrefix: string; styles: Record<string, string> }): void {
    const compKey = `${entry.vpPrefix}:${entry.nodeId}`;
    const existing = this.computedCache.get(compKey) || {};
    this.computedCache.set(compKey, { ...existing, ...entry.styles });
  }

  private applyCornersUpdate(entry: {
    nodeId: string;
    vpPrefix: string;
    corners: { TL: { x: number; y: number }; TR: { x: number; y: number }; BR: { x: number; y: number }; BL: { x: number; y: number } };
    decoupled?: boolean;
  }, fromTransform?: { x: number; y: number; scale: number }): void {
    // Convert from the CAPTURE camera â†’ cache space. Batches carry their
    // capture transform (exact); single-entry events fall back to the live
    // camera (same as rectUpdate).
    const cct = this.cacheTransform;
    const cnt = fromTransform ?? this.currentTransform;
    let corners = entry.corners;
    if (cct.scale !== 0 && (cct.x !== cnt.x || cct.y !== cnt.y || cct.scale !== cnt.scale)) {
      const r = cct.scale / cnt.scale;
      const adj = (p: { x: number; y: number }) => ({
        x: (p.x - cnt.x) * r + cct.x,
        y: (p.y - cnt.y) * r + cct.y,
      });
      corners = { TL: adj(entry.corners.TL), TR: adj(entry.corners.TR), BR: adj(entry.corners.BR), BL: adj(entry.corners.BL) };
    }
    const cornerKey = `${entry.vpPrefix}:${entry.nodeId}`;
    // STALE-EVENT REJECTION:
    // `cornersUpdate` events are postMessage-async â€” a render emitted
    // for FILE A can arrive at the bridge AFTER FILE B's `allRects`
    // has already cleared+repopulated the caches. Without this check
    // the stale event overwrites cornersCache with the previous file's
    // corners, every polled overlay (selection box, slot handle, slot
    // connectors) paints stale on entry, and only an action triggers
    // a fresh `cornersUpdate` that finally lands the right value.
    //
    // The rectCache for the CURRENT file is the source of truth â€” it
    // was JUST populated by the latest allRects. If a cornersUpdate's
    // centre is far from the cached rect's centre for the same key,
    // the corners belong to a different layout (i.e. a previous file)
    // and must be discarded. 8px tolerance covers sub-pixel +
    // mid-tween drift without admitting genuinely stale events.
    // `decoupled` corners (SVG wrappers' painted bbox) intentionally
    // drift from the CSS-box rect â€” e.g. a group whose child is dragged
    // past its box. The rect-centre stale check would reject every such
    // frame once the drift exceeds 8px, freezing the live group resize.
    // Skip the check for them; cross-file staleness on SVG corners is
    // self-correcting on the next allRects.
    const cachedRect = this.rectCache.get(cornerKey);
    if (cachedRect && !entry.decoupled) {
      const rectCx = cachedRect.left + cachedRect.width / 2;
      const rectCy = cachedRect.top + cachedRect.height / 2;
      const cornersCx = (corners.TL.x + corners.BR.x) / 2;
      const cornersCy = (corners.TL.y + corners.BR.y) / 2;
      if (Math.abs(rectCx - cornersCx) > 8 || Math.abs(rectCy - cornersCy) > 8) {
        trace.fn('postmessage-bridge:cornersUpdate-rejected-stale', {
          cornerKey,
          dx: Math.round(Math.abs(rectCx - cornersCx)),
          dy: Math.round(Math.abs(rectCy - cornersCy)),
        });
        return;
      }
    }
    this.cornersCache.set(cornerKey, corners);
  }

  reparentLive(nodeId: string, vpPrefix: string, newParentId: string | null, index: number, styles: Record<string, string>): void {
    this.remote?.reparentLive(nodeId, vpPrefix, newParentId, index, styles);
  }

  /** Fire-and-forget batch style patch. */
  patchMultipleStyles(updates: Array<{ nodeId: string; vpPrefix: string; styles: Record<string, string>; important: boolean }>): void {
    this.remote?.patchMultipleStyles(updates as PatchUpdate[]);
  }

  /** High-frequency camera transform.
   *
   * This intentionally bypasses Comlink's request/reply RPC path. Camera
   * motion is frame-rate state where only the newest value matters; sending
   * every frame as an RPC can queue acknowledgements and make the visual
   * iframe advance in visible bursts. The sandbox coalesces these raw
   * messages to its next animation frame. Keep the RPC fallback for the
   * narrow pre-iframe/compatibility case. */
  setViewportTransform(x: number, y: number, scale: number): void {
    this.currentTransform = { x, y, scale };
    const target = this.iframe?.contentWindow;
    if (target) {
      target.postMessage(wrapCanvasHostViewportTransform(x, y, scale), SANDBOX_ORIGIN);
      return;
    }
    this.remote?.setViewportTransform(x, y, scale);
  }

  /** Fire-and-forget CSS injection. Cross-origin iframe â€” sync access to
   * `contentDocument` is blocked, so this goes through Comlink/postMessage
   * (1-2ms typical). The handoff is fast enough to land before
   * framer-motion's animation fires after the upcoming React re-render. */
  injectCSS(selector: string, cssBody: string): void {
    this.remote?.injectCSS(selector, cssBody);
  }
  /** The editor's colour mode, mirrored onto the sandbox document (see SandboxApi). */
  setThemeMode(mode: 'light' | 'dark'): void {
    this.remote?.setThemeMode(mode);
  }

  /** Fire-and-forget CSS removal. */
  removeCSS(selector: string): void {
    this.remote?.removeCSS(selector);
  }

  /** Replace the design-tokens block in the iframe's canvas style element.
   *  Used by preset edits (color, typography) to push live updates without
   *  forcing a full iframe re-render. 60fps safe. */
  setCanvasTokensCSS(tokensCSS: string): void {
    this.remote?.setCanvasTokensCSS(tokensCSS);
  }

  /** Live single-variable update â€” fastest possible path for color/font
   *  preset drags. Sets the CSS custom property inline on contentRoot. */
  setCanvasTokenVar(name: string, value: string): void {
    this.remote?.setCanvasTokenVar(name, value);
  }

  /** Append a Google Fonts `<link>` to the iframe's document head.
   *  Cross-origin (parent 3333 â†” iframe 5174) so this can't be done by
   *  poking `iframe.contentDocument` from the parent â€” must round-trip
   *  through Comlink. */
  loadFontInIframe(fontUrl: string): void {
    this.remote?.loadFontInIframe(fontUrl);
  }

  /** Fire-and-forget innerHTML update (text edit commit). */
  setInnerHTML(nodeId: string, vpPrefix: string, html: string): void {
    this.remote?.setInnerHTML(nodeId, vpPrefix, html);
  }

  /** Fire-and-forget attribute set/remove. */
  setAttribute(nodeId: string, vpPrefix: string, attr: string, value: string | null): void {
    this.remote?.setAttribute(nodeId, vpPrefix, attr, value);
  }

  /** Fire-and-forget attribute set/remove on the Nth shape-tag child of
   *  an SVG wrapper. Used by the SvgShapeTool to update fill / stroke /
   *  cap / join etc. while the user is in shape-edit mode (where the
   *  path editor library has rewritten the SVG's children to bare
   *  elements without `data-node-id`). */
  setChildShapeAttribute(
    parentNodeId: string,
    vpPrefix: string,
    childIndex: number,
    attr: string,
    value: string | null,
  ): void {
    this.remote?.setChildShapeAttribute(parentNodeId, vpPrefix, childIndex, attr, value);
  }

  /** Async getBBox for SVG elements â€” returns the painted bbox in
   *  user-space (viewBox) coordinates, or null if the element isn't
   *  an SVGGraphicsElement / not found. */
  async getBBoxAsync(
    nodeId: string,
    vpPrefix: string,
  ): Promise<{ x: number; y: number; width: number; height: number } | null> {
    if (!this.remote) return null;
    return await this.remote.getBBox(nodeId, vpPrefix);
  }

  /** Fire-and-forget atomic attrs + styles patch â€” exists so SVG wrapper
   *  normalization can land `viewBox` and `width/height/left/top` in the
   *  SAME iframe message. Splitting them across two Comlink calls leaves
   *  a one-frame paint window where the path's scale doesn't match
   *  either the old or new wrapper, and the painted shape visibly jumps. */
  patchAttrsAndStyles(
    nodeId: string,
    vpPrefix: string,
    attrs: Record<string, string>,
    styles: Record<string, string>,
    important: boolean = false,
  ): void {
    this.remote?.patchAttrsAndStyles(nodeId, vpPrefix, attrs, styles, important);
  }

  bakeGroupResize(groupId: string, vpPrefix: string, scaleX: number, scaleY: number): void {
    this.remote?.bakeGroupResize(groupId, vpPrefix, scaleX, scaleY);
  }

  clearGroupResizeBake(groupId: string): void {
    this.remote?.clearGroupResizeBake(groupId);
  }

  liveRefitGroup(groupId: string, vpPrefix: string): void {
    this.remote?.liveRefitGroup(groupId, vpPrefix);
  }

  repositionOverlays(): void {
    this.remote?.repositionOverlays();
  }

  // â”€â”€â”€ Layout Drag Placeholders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  createPlaceholder(placeholderId: string, parentNodeId: string, vpPrefix: string, beforeNodeId: string | null, styles: Record<string, string>): void {
    this.remote?.createPlaceholder(placeholderId, parentNodeId, vpPrefix, beforeNodeId, styles);
  }

  movePlaceholder(placeholderId: string, parentNodeId: string, vpPrefix: string, beforeNodeId: string | null): void {
    this.remote?.movePlaceholder(placeholderId, parentNodeId, vpPrefix, beforeNodeId);
  }

  /** Fire-and-forget style patch on a placeholder element (looked up by
   *  data-placeholder-id, not data-node-id). LayoutLiftedStrategy uses this
   *  to update placeholder.order during drag-time reorder. */
  patchPlaceholderStyles(placeholderId: string, vpPrefix: string, styles: Record<string, string>): void {
    this.remote?.patchPlaceholderStyles(placeholderId, vpPrefix, styles);
  }

  removePlaceholders(placeholderIds: string[]): void {
    this.remote?.removePlaceholders(placeholderIds);
  }

  /** Lock specific node IDs from patchElement style writes inside the
   *  sandbox. Used by LayoutLiftedStrategy to protect lifted nodes from
   *  mid-drag force-renders (alt-duplicate `addNode` triggers a full
   *  re-render â€” without this lock the lifted overlay loses its
   *  imperative `position: absolute` + `zIndex: 9999` and snaps back
   *  into the flex flow under sibling stacking). */
  setDragLockedNodeIds(ids: string[]): void {
    this.remote?.setDragLockedNodeIds(ids);
  }

  /** Re-measure all node rects/corners after a reorder (see sandbox impl) so
   *  selection/hover overlays snap to the new layout without waiting for the
   *  async source re-render. */
  forceRemeasureAllRects(): void {
    this.remote?.forceRemeasureAllRects();
  }

  /** Hide/show a CMS collection list's ghost copies during a layout drag of one
   *  of its items (see sandbox impl). */
  setCollectionGhostsHidden(containerId: string, vpPrefix: string, hidden: boolean, nodeId?: string): void {
    this.remote?.setCollectionGhostsHidden(containerId, vpPrefix, hidden, nodeId);
  }

  /** Hide / show ONE node transiently (drop re-centre) â€” see sandbox impl. */
  setNodeHidden(nodeId: string, vpPrefix: string, hidden: boolean): void {
    this.remote?.setNodeHidden(nodeId, vpPrefix, hidden);
  }

  /** Swap two children of a parent in DOM order. Either id may be a
   *  regular node `data-id` or a placeholder's `data-placeholder-id`. */
  swapTwoElements(idA: string, idB: string, parentNodeId: string, vpPrefix: string): void {
    this.remote?.swapTwoElements(idA, idB, parentNodeId, vpPrefix);
  }

  /** Get the placeholder's current bounding rect in parent screen space.
   *  Used by GridDragStrategy to size the lifted element to match the
   *  placeholder's actual cell coverage (handles spans, mixed tracks). */
  async getPlaceholderRect(placeholderId: string): Promise<DOMRect | null> {
    if (!this.remote) return null;
    const data = await this.remote.getPlaceholderRect(placeholderId);
    if (!data) return null;
    return this.toParentSpace(new DOMRect(data.left, data.top, data.width, data.height));
  }

  liftNode(nodeId: string, vpPrefix: string, styles: Record<string, string>): void {
    this.remote?.liftNode(nodeId, vpPrefix, styles);
  }

  /** Reverse of liftNode â€” moves the element back into a parent at index N
   *  with the given restore styles applied first. Eliminates the (0,0) flash
   *  on layout drop where the element would otherwise sit at contentRoot until
   *  React re-renders from code. */
  restoreNode(
    nodeId: string,
    parentNodeId: string,
    vpPrefix: string,
    index: number,
    styles: Record<string, string>,
  ): void {
    this.remote?.restoreNode(nodeId, parentNodeId, vpPrefix, index, styles);
  }

  commitMergedOrder(
    parentNodeId: string,
    vpPrefix: string,
    participantIds: string[],
    restores: Array<{ nodeId: string; styles: Record<string, string> }>,
    placeholderIds: string[],
    chromeOrderRestores: Array<{ nodeId: string; order: string }> = [],
  ): void {
    this.remote?.commitMergedOrder(parentNodeId, vpPrefix, participantIds, restores, placeholderIds, chromeOrderRestores);
  }

  // â”€â”€â”€ Code Components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  mountCodeComponent(nodeId: string, code: string, props: Record<string, any>, vpWidth: number): void {
    this.remote?.mountCodeComponent(nodeId, code, props, vpWidth);
  }

  /** Forward every code-component instance in ONE message â€” the sandbox mounts
   *  them in a single synchronous pass so N instances of the same component
   *  appear together instead of cascading one reflow at a time. */
  mountCodeComponentsBatch(
    mounts: Array<{ nodeId: string; code: string; props: Record<string, any>; vpWidth: number }>,
  ): void {
    this.remote?.mountCodeComponentsBatch(mounts);
  }

  unmountCodeComponent(nodeId: string): void {
    this.remote?.unmountCodeComponent(nodeId);
  }

  updateCodeComponentProps(nodeId: string, props: Record<string, any>, vpWidth: number): void {
    this.remote?.updateCodeComponentProps(nodeId, props, vpWidth);
  }

  // â”€â”€â”€ canvas-dnd overlay control â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  setDndHovered(nodeId: string | null, viewport?: string): void {
    this.remote?.setDndHovered(nodeId, viewport);
  }

  setDndInteracting(interacting: boolean): void {
    this.remote?.setDndInteracting(interacting);
  }

  // setBridgeInteracting REMOVED (2026-07-30): the sandbox never implemented
  // it â€” and `this.remote` is a comlink PROXY, so the old
  // `if (r?.setBridgeInteracting)` guard was ALWAYS truthy (property access
  // on a comlink proxy returns a callable sub-proxy, never undefined). Every
  // interaction toggle fired an RPC for a method that didn't exist â†’
  // `undefined.apply` uncaught-promise TypeErrors in the sandbox, twice per
  // gesture (the long-standing "intermittent comlink burst").
  // `setDndInteracting` already carries the same signal and drives the
  // rect-emit gate + gesture-end reconcile. LESSON: never truthiness-probe a
  // method on a comlink remote â€” expose it for real or don't call it.

  // â”€â”€â”€ Text editing â€” TipTap mounts inside the iframe â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Parent kicks off / commits / cancels editing via these RPCs. Selection
  // state and content updates flow back as SandboxEvent.textEdit* events.

  /**
   * @param isResponsive  Set when the node uses `useResponsiveText`. The
   *                      sandbox uses this to skip cross-viewport sync
   *                      during typing â€” each viewport's React subtree
   *                      resolves the hook independently, so DOM-mirroring
   *                      keystrokes across replicas just fights React.
   */
  startTextEdit(nodeId: string, vpPrefix: string, initialHtml?: string, isResponsive?: boolean, syncExcludeVpIds?: string[]): void {
    this.remote?.startTextEdit(nodeId, vpPrefix, initialHtml, isResponsive, syncExcludeVpIds);
  }

  /** Returns the final HTML (+ FIT re-fit values when the edited text sits in
   *  a FIT wrapper) so the caller can persist them through its existing
   *  mutation pipeline. Awaitable across Comlink. */
  async commitTextEdit(): Promise<{ html: string; fit?: TextEditFitResult }> {
    if (!this.remote) return { html: '' };
    const r = await this.remote.commitTextEdit();
    return r ?? { html: '' };
  }

  cancelTextEdit(): void {
    this.remote?.cancelTextEdit();
  }

  editorCommand(command: TextEditCommand): void {
    this.remote?.editorCommand(command);
  }

  // â”€â”€â”€ Shape editing (SvgPathEditor li¢ëiºÛkºwµç_ºYhºÚn¶Æ¯yÛhşiíıø¥zÏÜ¢jh²*?¢ëiºßÛjÈ]­ì,µÚ.¶ÜmFéÜjßæßßŠW¬ıÊ&¦‹"£ú.¶›­ı¶¬…ÚŞÂË]¢ëmÆÛh¾'°¶ŸºYhºÚn¶Šî±è^iÙõÓOæßßŠW¬ıÊ&¦‹"£ú.¶›­ı¶¬…ÚŞÂË]¢ëmÆßíj)g×M?š{~)^³÷(šš,ŠèºÚn·öÚ²k{-v‹­·m¢øÂ–«¶ÊŠ