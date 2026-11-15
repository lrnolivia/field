const FIELD_PREVIEW_HOST_SUFFIX = '.field-preview.loew.fi';
const WORKERS_PREVIEW_HOST_SUFFIX = '-field.lrnoliv.workers.dev';

export interface PreviewLocationLike {
  protocol: string;
  hostname: string;
  port: string;
}

/**
 * Resolve the concrete Preview iframe URL for the current editor deployment.
 *
 * Local dev keeps the dedicated Vite preview port.
 * Production uses preview.field.loew.fi.
 * Branch editors and the Preview runtime use different hostnames for the
 * same Workers deployment. The deployment ID or branch alias is shared.
 */
export function previewFrameUrl(location: PreviewLocationLike): string {
  if (location.port) {
    return location.protocol + '//' + location.hostname + ':5175/';
  }

  if (location.hostname.endsWith(FIELD_PREVIEW_HOST_SUFFIX)) {
    const previewName = location.hostname.slice(0, -FIELD_PREVIEW_HOST_SUFFIX.length);
    return location.protocol + '//' + previewName + WORKERS_PREVIEW_HOST_SUFFIX + '/';
  }

  return location.protocol + '//preview.' + location.hostname + '/';
}
