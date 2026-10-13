export type FieldProjectEventKind =
  | 'document'
  | 'metadata'
  | 'thumbnail'
  | 'created'
  | 'deleted';

export interface FieldProjectEvent {
  type: 'project-change';
  projectId: string;
  kind: FieldProjectEventKind;
  changedAt: string;
  revision?: string;
  sourceSessionId?: string | null;
}

export type FieldProjectEventListener = (event: FieldProjectEvent) => void;

const EVENT_KINDS = new Set<FieldProjectEventKind>([
  'document',
  'metadata',
  'thumbnail',
  'created',
  'deleted',
]);

const RECONNECT_DELAYS_MS = [250, 500, 1000, 2000, 5000] as const;

interface WebSocketMessageLike {
  data: unknown;
}

interface WebSocketLike {
  readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: WebSocketMessageLike) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  close(code?: number, reason?: string): void;
}

export interface FieldProjectEventTransportOptions {
  WebSocketCtor?: new (url: string) => WebSocketLike;
  urlFactory?: () => string;
  setTimeoutFn?: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeoutFn?: (handle: ReturnType<typeof setTimeout>) => void;
}

export interface FieldProjectEventTransport {
  subscribe(listener: FieldProjectEventListener): () => void;
  close(): void;
}

let sessionId: string | null = null;
let sharedTransport: FieldProjectEventTransport | null = null;

export function getFieldSessionId(): string {
  if (sessionId) return sessionId;
  const randomUuid = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  sessionId = randomUuid
    ? randomUuid()
    : `field-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return sessionId;
}

export function parseFieldProjectEvent(value: unknown): FieldProjectEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row.type !== 'project-change') return null;
  if (typeof row.projectId !== 'string' || !row.projectId) return null;
  if (typeof row.kind !== 'string' || !EVENT_KINDS.has(row.kind as FieldProjectEventKind)) return null;
  if (typeof row.changedAt !== 'string' || !Number.isFinite(Date.parse(row.changedAt))) return null;
  if (row.revision !== undefined && typeof row.revision !== 'string') return null;
  if (
    row.sourceSessionId !== undefined &&
    row.sourceSessionId !== null &&
    typeof row.sourceSessionId !== 'string'
  ) return null;

  const sourceSessionId = row.sourceSessionId === null
    ? null
    : typeof row.sourceSessionId === 'string'
      ? row.sourceSessionId
      : undefined;

  return {
    type: 'project-change',
    projectId: row.projectId,
    kind: row.kind as FieldProjectEventKind,
    changedAt: row.changedAt,
    ...(typeof row.revision === 'string' ? { revision: row.revision } : {}),
    ...(sourceSessionId !== undefined ? { sourceSessionId } : {}),
  };
}

export function fieldProjectReconnectDelay(attempt: number): number {
  const index = Math.max(0, Math.min(RECONNECT_DELAYS_MS.length - 1, Math.floor(attempt)));
  return RECONNECT_DELAYS_MS[index];
}

function defaultRealtimeUrl(): string {
  const location = globalThis.location;
  if (!location) return 'ws://localhost/api/field/realtime';
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${location.host}/api/field/realtime`;
}

export function createFieldProjectEventTransport(
  options: FieldProjectEventTransportOptions = {},
): FieldProjectEventTransport {
  const listeners = new Set<FieldProjectEventListener>();
  const WebSocketCtor: (new (url: string) => WebSocketLike) | undefined =
    options.WebSocketCtor ??
    (globalThis.WebSocket as unknown as (new (url: string) => WebSocketLike) | undefined);
  const urlFactory = options.urlFactory ?? defaultRealtimeUrl;
  const setTimeoutFn = options.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout;

  let socket: WebSocketLike | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;
  let closed = false;

  const clearReconnect = () => {
    if (reconnectTimer === null) return;
    clearTimeoutFn(reconnectTimer);
    reconnectTimer = null;
  };

  const scheduleReconnect = () => {
    if (closed || listeners.size === 0 || reconnectTimer !== null) return;
    const delay = fieldProjectReconnectDelay(reconnectAttempt);
    reconnectAttempt += 1;
    reconnectTimer = setTimeoutFn(() => {
      reconnectTimer = null;
      open();
    }, delay);
  };

  const open = () => {
    if (closed || listeners.size === 0 || socket) return;
    if (!WebSocketCtor) {
      console.warn('[field-realtime] WebSocket is unavailable');
      return;
    }

    const next = new WebSocketCtor(urlFactory());
    socket = next;

    next.onopen = () => {
      if (socket !== next) return;
      reconnectAttempt = 0;
      clearReconnect();
    };

    next.onmessage = (message) => {
      if (socket !== next || typeof message.data !== 'string') return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(message.data);
      } catch {
        console.warn('[field-realtime] ignored malformed project event');
        return;
      }
      const event = parseFieldProjectEvent(parsed);
      if (!event) {
        console.warn('[field-realtime] ignored malformed project event');
        return;
      }
      for (const listener of [...listeners]) {
        try {
          listener(event);
        } catch (error) {
          console.warn('[field-realtime] project event listener failed', error);
        }
      }
    };

    next.onerror = () => {
      if (socket !== next) return;
      socket = null;
      try { next.close(); } catch { /* already closed */ }
      scheduleReconnect();
    };

    next.onclose = () => {
      if (socket !== next) return;
      socket = null;
      if (!closed && listeners.size > 0) scheduleReconnect();
    };
  };

  return {
    subscribe(listener) {
      closed = false;
      listeners.add(listener);
      open();
      return () => {
        listeners.delete(listener);
        if (listeners.size > 0) return;
        clearReconnect();
        const current = socket;
        socket = null;
        if (current) {
          current.onclose = null;
          try { current.close(1000, 'no subscribers'); } catch { /* already closed */ }
        }
      };
    },
    close() {
      closed = true;
      listeners.clear();
      clearReconnect();
      const current = socket;
      socket = null;
      if (current) {
        current.onclose = null;
        try { current.close(1000, 'transport closed'); } catch { /* already closed */ }
      }
    },
  };
}

export function subscribeToFieldProjectEvents(listener: FieldProjectEventListener): () => void {
  sharedTransport ??= createFieldProjectEventTransport();
  return sharedTransport.subscribe(listener);
}
