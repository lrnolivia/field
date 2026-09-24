const CANVAS_HOST = "canvas.admin.loew.fi";
const PREVIEW_HOST = "preview.admin.loew.fi";

function assetPathForHost(hostname, pathname) {
  if (hostname === CANVAS_HOST) {
    return "/sandbox" + (pathname === "/" ? "/index.html" : pathname);
  }

  if (hostname === PREVIEW_HOST) {
    return "/preview-sandbox" + (pathname === "/" ? "/index.html" : pathname);
  }

  return pathname;
}

function indexPathForHost(hostname) {
  if (hostname === CANVAS_HOST) {
    return "/sandbox/index.html";
  }

  if (hostname === PREVIEW_HOST) {
    return "/preview-sandbox/index.html";
  }

  return "/index.html";
}

function applyRevymeHeaders(response, hostname) {
  const headers = new Headers(response.headers);

  if (hostname === CANVAS_HOST) {
    headers.set("Cross-Origin-Resource-Policy", "cross-origin");
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Embedder-Policy", "credentialless");
    headers.set("Origin-Agent-Cluster", "?1");
  }

  if (hostname === PREVIEW_HOST) {
    headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    const target = new URL(request.url);

    target.pathname = assetPathForHost(
      incoming.hostname,
      incoming.pathname
    );

    let response = await env.ASSETS.fetch(
      new Request(target.toString(), request)
    );

    // SPA navigation fallback, but never turn missing JS/CSS/images into HTML.
    const acceptsHtml =
      request.headers.get("Accept")?.includes("text/html") ?? false;

    if (response.status === 404 && acceptsHtml) {
      target.pathname = indexPathForHost(incoming.hostname);

      response = await env.ASSETS.fetch(
        new Request(target.toString(), request)
      );
    }

    return applyRevymeHeaders(response, incoming.hostname);
  },
};
