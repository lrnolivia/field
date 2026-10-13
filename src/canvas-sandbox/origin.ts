// origin.ts — deterministic Canvas sandbox origin resolution.
// Keep environment hostname semantics out of the larger iframe protocol surface.

const FIELD_PREVIEW_HOST_SUFFIX = '.field-preview.loew.fi';
const CANVAS_PREVIEW_HOST_SUFFIX = '.canvas-preview.loew.fi';
const PRODUCTION_CANVAS_HOST = 'canvas.field.loew.fi';

export interface SandboxLocationLike {
  protocol: string;
  hostname: string;
  port: string;
}

export function resolveSandboxOrigin(location: SandboxLocationLike): string {
  const { protocol, hostname, port } = location;

  if (port) {
    return `${protocol}//${hostname}:5174`;
  }

  // protocol.ts is shared by parent + sandbox code. If it is evaluated from
  // an existing Canvas host, preserve that origin instead of nesting "canvas."
  // or remapping a branch Canvas alias a second time.
  if (hostname === PRODUCTION_CANVAS_HOST || hostname.endsWith(CANVAS_PREVIEW_HOST_SUFFIX)) {
    return `${protocol}//${hostname}`;
  }

  if (hostname.endsWith(FIELD_PREVIEW_HOST_SUFFIX)) {
    const previewName = hostname.slice(0, -FIELD_PREVIEW_HOST_SUFFIX.length);
    if (previewName) {
      return `${protocol}//${previewName}${CANVAS_PREVIEW_HOST_SUFFIX}`;
    }
  }

  return `${protocol}//canvas.${hostname}`;
}
