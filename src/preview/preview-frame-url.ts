const FIELD_PREVIEW_HOST_SUFFIX = '.field-preview.loew.fi';

export interface PreviewLocationLike {
  protocol: string;
  hostname: string;
  port: string;
  origin: string;
}

/**
 * Resolve the concrete Preview iframe URL for the current editor deployment.
 *
 * Local dev keeps the dedicated Vite preview port.
 * Production uses preview.field.loew.fi.
 * Immutable branch Preview deployments serve the preview bundle from the same
 * deployment origin so TLS, build identity, and runtime code cannot drift.
 */
export function previewFrameUrl(location: PreviewLocationLike): string {
  if (location.port) {
    return location.protocol + '//' + location.hostname + ':5175/';
  }

  if (location.hostname.endsWith(FIELD_PREVIEW_HOST_SUFFIX)) {
    return location.origin + '/preview-sandbox/index.html';
  }

  return location.protocol + '//preview.' + location.hostname + '/';
}
