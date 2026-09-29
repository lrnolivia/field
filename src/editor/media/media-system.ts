export const MEDIA_KINDS = ['all', 'image', 'video', 'audio', 'embed', 'vector'] as const;

export type MediaKind = (typeof MEDIA_KINDS)[number];
export type MediaSurface = 'toolbar' | 'floating' | 'sidebar' | 'contextual' | 'content' | 'code';
export type MediaIntent =
  | 'browse'
  | 'insert'
  | 'replace'
  | 'fill'
  | 'attach'
  | 'gallery'
  | 'source-ingest';

export type MediaView = 'launcher' | 'browser' | 'create' | 'embed';
export type MediaLauncherAction =
  | 'upload'
  | 'browse'
  | 'image'
  | 'gallery'
  | 'video'
  | 'audio'
  | 'embed'
  | 'paste';

export interface MediaRoute {
  view: MediaView;
  kind: MediaKind;
  provider?: string;
}

export interface MediaSession {
  surface: MediaSurface;
  route: MediaRoute;
  intent: MediaIntent;
  search: string;
  selectedIds: string[];
  scrollTop: number;
  targetId?: string;
  sourcePath?: string;
}

export interface MediaAsset {
  id: string;
  url: string;
  kind: Exclude<MediaKind, 'all'>;
  name: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  source?: 'upload' | 'generated' | 'figma' | 'embed' | 'code' | 'unknown';
  sourceId?: string;
  contentHash?: string;
  createdAt?: string;
}

export type MediaUploadStatus = 'queued' | 'uploading' | 'processing' | 'complete' | 'error' | 'cancelled';

export interface MediaUploadItem {
  id: string;
  name: string;
  kind: Exclude<MediaKind, 'all' | 'embed'>;
  status: MediaUploadStatus;
  progress: number;
  assetId?: string;
  error?: string;
}

export const DEFAULT_MEDIA_ROUTE: MediaRoute = {
  view: 'launcher',
  kind: 'all',
};

export function createMediaSession(overrides: Partial<MediaSession> = {}): MediaSession {
  return {
    surface: 'toolbar',
    route: DEFAULT_MEDIA_ROUTE,
    intent: 'browse',
    search: '',
    selectedIds: [],
    scrollTop: 0,
    ...overrides,
    route: overrides.route ?? DEFAULT_MEDIA_ROUTE,
  };
}

export function routeForLauncherAction(action: MediaLauncherAction): MediaRoute {
  switch (action) {
    case 'browse':
      return { view: 'browser', kind: 'all' };
    case 'image':
      return { view: 'browser', kind: 'image' };
    case 'gallery':
      return { view: 'browser', kind: 'image' };
    case 'video':
      return { view: 'browser', kind: 'video' };
    case 'audio':
      return { view: 'browser', kind: 'audio' };
    case 'embed':
      return { view: 'embed', kind: 'embed' };
    case 'upload':
    case 'paste':
    default:
      return DEFAULT_MEDIA_ROUTE;
  }
}

export function intentForLauncherAction(action: MediaLauncherAction): MediaIntent {
  return action === 'gallery' ? 'gallery' : action === 'browse' ? 'browse' : 'insert';
}

export function mediaKindLabel(kind: MediaKind): string {
  switch (kind) {
    case 'all': return 'All';
    case 'image': return 'Images';
    case 'video': return 'Video';
    case 'audio': return 'Audio';
    case 'embed': return 'Embeds';
    case 'vector': return 'Vectors';
  }
}

export function acceptedMimeTypes(kind: MediaKind): string {
  switch (kind) {
    case 'image': return 'image/*';
    case 'video': return 'video/*';
    case 'audio': return 'audio/*';
    case 'vector': return 'image/svg+xml';
    case 'embed': return '';
    case 'all': return 'image/*,video/*,audio/*,image/svg+xml';
  }
}

export function mediaKindFromMime(mimeType: string): Exclude<MediaKind, 'all'> | null {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized === 'image/svg+xml') return 'vector';
  if (normalized.startsWith('image/')) return 'image';
  if (normalized.startsWith('video/')) return 'video';
  if (normalized.startsWith('audio/')) return 'audio';
  return null;
}

export function mediaIntentAllowsMultiSelect(intent: MediaIntent): boolean {
  return intent === 'gallery' || intent === 'browse';
}
