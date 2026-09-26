const CANVAS_HOST = "canvas.field.loew.fi";
const PREVIEW_HOST = "preview.field.loew.fi";
const FIELD_API_ROOT = "/api/field/projects";
const FIELD_REALTIME_PATH = "/api/field/realtime";
const FIELD_PROFILE_ROOT = "/api/field/profile";
const FIELD_FONTS_API_PATH = "/api/field/fonts";
const GOOGLE_FONTS_UPSTREAM = "https://www.googleapis.com/webfonts/v1/webfonts";
const GOOGLE_FONTS_CACHE_TTL_SECONDS = 24 * 60 * 60;
const MAX_PROJECT_BYTES = 32 * 1024 * 1024;
const MAX_META_BYTES = 64 * 1024;
const MAX_THUMBNAIL_BYTES = 8 * 1024 * 1024;
const MAX_AVATAR_BYTES = 4 * 1024 * 1024;
const PROJECT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const jwksCache = new Map();

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

function apiHeaders(extra = {}) {
  return {
    "Cache-Control": "no-store",
    ...extra,
  };
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: apiHeaders({ "Content-Type": "application/json; charset=utf-8", ...headers }),
  });
}

async function handleGoogleFontsRequest(
  request,
  env,
  accessVerifier = verifyAccessRequest,
  runtime = {},
) {
  const incoming = new URL(request.url);
  if (incoming.pathname !== FIELD_FONTS_API_PATH) return null;

  const auth = await accessVerifier(request, env);
  if (!auth?.ok) {
    console.warn("field Access rejected request", {
      path: new URL(request.url).pathname,
      reason: auth?.reason ?? "unknown",
      hasAccessJwt: request.headers.has("Cf-Access-Jwt-Assertion"),
    });

    return jsonResponse({ error: "Forbidden" }, 403);
  }

  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405, { Allow: "GET" });
  }

  const apiKey = env.GOOGLE_FONTS_API_KEY;
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    return jsonResponse({ error: "Google Fonts catalog is not configured" }, 503);
  }

  const fetchImpl = runtime.fetchImpl ?? fetch;
  const cache = runtime.cache === undefined ? globalThis.caches?.default : runtime.cache;
  const cacheKey = new Request(new URL(FIELD_FONTS_API_PATH, incoming.origin).toString(), {
    method: "GET",
  });

  if (cache) {
    try {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    } catch {
      // Cache is an optimization. A cache failure must not make typography unusable.
    }
  }

  const upstream = new URL(GOOGLE_FONTS_UPSTREAM);
  upstream.searchParams.set("key", apiKey);
  upstream.searchParams.set("sort", "popularity");
  upstream.searchParams.set("capability", "FAMILY_TAGS");

  try {
    const response = await fetchImpl(upstream.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return jsonResponse({ error: "Google Fonts catalog unavailable" }, 502);
    }

    const data = await response.json();
    if (!data || typeof data !== "object" || !Array.isArray(data.items)) {
      return jsonResponse({ error: "Google Fonts catalog unavailable" }, 502);
    }

    const catalogResponse = new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": `public, max-age=0, s-maxage=${GOOGLE_FONTS_CACHE_TTL_SECONDS}`,
      },
    });

    if (cache) {
      try {
        await cache.put(cacheKey, catalogResponse.clone());
      } catch {
        // Best-effort edge caching; a cache write failure is not an API failure.
      }
    }

    return catalogResponse;
  } catch {
    return jsonResponse({ error: "Google Fonts catalog unavailable" }, 502);
  }
}

function parseProfileRoute(pathname) {
  if (pathname === FIELD_PROFILE_ROOT) {
    return { kind: "profile" };
  }

  if (pathname === `${FIELD_PROFILE_ROOT}/avatar`) {
    return { kind: "avatar" };
  }

  if (pathname.startsWith(`${FIELD_PROFILE_ROOT}/`)) {
    return { invalid: true };
  }

  return null;
}

function parseProjectRoute(pathname) {
  if (pathname === FIELD_API_ROOT) return { invalid: true };
  if (!pathname.startsWith(`${FIELD_API_ROOT}/`)) return null;
  const rest = pathname.slice(FIELD_API_ROOT.length + 1);
  const parts = rest.split("/");
  if (parts.length < 1 || parts.length > 2) return { invalid: true };
  let id;
  try {
    id = decodeURIComponent(parts[0]);
  } catch {
    return { invalid: true };
  }
  if (!PROJECT_ID_RE.test(id) || id === "." || id === ".." || id.includes("..")) {
    return { invalid: true };
  }
  if (parts.length === 2 && parts[1] !== "meta") return { invalid: true };
  return { id, kind: parts[1] === "meta" ? "meta" : "project" };
}

function base64UrlBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function decodeJwtPart(value) {
  return JSON.parse(new TextDecoder().decode(base64UrlBytes(value)));
}

function getCookieValue(request, name) {
  const cookie = request.headers.get("Cookie") ?? "";

  for (const part of cookie.split(";")) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;

    const key = trimmed.slice(0, separator).trim();
    if (key !== name) continue;

    return trimmed.slice(separator + 1).trim() || null;
  }

  return null;
}

function getAccessToken(request) {
  const assertion = request.headers.get("Cf-Access-Jwt-Assertion")?.trim();
  if (assertion) return assertion;

  // Browser traffic authenticated by Access also carries the application JWT
  // in CF_Authorization. Validate it exactly like the assertion rather than
  // trusting the cookie merely because it exists.
  return getCookieValue(request, "CF_Authorization");
}

async function getAccessJwks(teamDomain) {
  const now = Date.now();
  const cached = jwksCache.get(teamDomain);
  if (cached && cached.expiresAt > now) return cached.keys;

  const response = await fetch(`${teamDomain}/cdn-cgi/access/certs`, {
    headers: { Accept: "application/json" },
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!response.ok) throw new Error(`Access JWKS fetch failed: ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body?.keys)) throw new Error("Access JWKS response is malformed");
  jwksCache.set(teamDomain, { keys: body.keys, expiresAt: now + 60 * 60 * 1000 });
  return body.keys;
}

function audienceMatches(claim, expected) {
  if (typeof claim === "string") return claim === expected;
  return Array.isArray(claim) && claim.includes(expected);
}

/** Cryptographically validate Cloudflare Access. This deliberately does not
 * trust cf-access-authenticated-user-email (or any other caller-supplied
 * identity header) on its own. Missing runtime config fails closed. */
async function verifyAccessRequest(request, env) {
  const teamDomainRaw = env.FIELD_ACCESS_TEAM_DOMAIN;
  const audience = env.FIELD_ACCESS_AUD;
  if (typeof teamDomainRaw !== "string" || typeof audience !== "string" || !audience) {
    return { ok: false, reason: "Access validation is not configured" };
  }

  let teamUrl;
  try {
    teamUrl = new URL(teamDomainRaw);
  } catch {
    return { ok: false, reason: "Access team domain is invalid" };
  }
  if (teamUrl.protocol !== "https:" || !teamUrl.hostname.endsWith(".cloudflareaccess.com")) {
    return { ok: false, reason: "Access team domain is invalid" };
  }
  const teamDomain = teamUrl.origin;

  const token = getAccessToken(request);
  if (!token) {
    return {
      ok: false,
      reason: "Missing Cloudflare Access assertion and authorization cookie",
    };
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Malformed JWT");
    const header = decodeJwtPart(parts[0]);
    const payload = decodeJwtPart(parts[1]);
    if (header?.alg !== "RS256" || typeof header?.kid !== "string") {
      throw new Error("Unexpected JWT algorithm or key id");
    }

    const keys = await getAccessJwks(teamDomain);
    const jwk = keys.find((key) => key?.kid === header.kid && key?.kty === "RSA");
    if (!jwk) throw new Error("Access signing key not found");

    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const validSignature = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      base64UrlBytes(parts[2]),
      signed,
    );
    if (!validSignature) throw new Error("Invalid Access signature");

    const now = Math.floor(Date.now() / 1000);
    if (payload?.iss !== teamDomain) throw new Error("Unexpected Access issuer");
    if (!audienceMatches(payload?.aud, audience)) throw new Error("Unexpected Access audience");
    if (typeof payload?.exp !== "number" || payload.exp <= now) throw new Error("Access token expired");
    if (typeof payload?.nbf === "number" && payload.nbf > now + 30) throw new Error("Access token not active");
    return { ok: true, payload };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

async function stableAccessEmailSubject(email) {
  const normalized = email.trim().toLowerCase();

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalized),
  );

  const hex = Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");

  return `access-email:${hex}`;
}

async function verifyWorkerAccess(request, env, ctx) {
  // Native Worker Access context when available.
  if (ctx?.access) {
    try {
      const identity = await ctx.access.getIdentity();

      if (!identity || typeof identity !== "object") {
        return {
          ok: false,
          reason: "Worker Access identity unavailable",
        };
      }

      const subjectCandidates = [
        identity.user_uuid,
        identity.userUuid,
        identity.id,
        identity.email,
      ];

      const subject = subjectCandidates.find(
        (value) => typeof value === "string" && value.trim(),
      );

      if (!subject) {
        return {
          ok: false,
          reason: "Worker Access identity has no stable subject",
        };
      }

      return {
        ok: true,
        payload: {
          sub: subject.trim(),
        },
        identity,
      };
    } catch (error) {
      return {
        ok: false,
        reason: error instanceof Error
          ? error.message
          : String(error),
      };
    }
  }

  // Prefer cryptographic JWT validation whenever the Access token survives
  // the Static Assets router.
  const verified = await verifyAccessRequest(request, env);

  if (verified?.ok) {
    return verified;
  }

  // Workers Static Assets uses an internal router which does not propagate
  // ctx.access to the user Worker. Access still protects field.loew.fi and
  // injects the authenticated-user email header.
  //
  // Accept this fallback ONLY on the exact protected editor hostname. This
  // prevents the public workers.dev deployment from becoming an auth bypass.
  const incoming = new URL(request.url);

  if (incoming.hostname !== "field.loew.fi") {
    return verified;
  }

  const email =
    request.headers
      .get("Cf-Access-Authenticated-User-Email")
      ?.trim()
      .toLowerCase() ?? "";

  if (!email || !email.includes("@")) {
    return verified;
  }

  return {
    ok: true,
    payload: {
      sub: await stableAccessEmailSubject(email),
      email,
    },
    identity: {
      email,
    },
    source: "access-authenticated-email",
  };
}

const FIELD_PROJECT_EVENT_KINDS = new Set([
  "document",
  "metadata",
  "thumbnail",
  "created",
  "deleted",
]);

function fieldProjectEventSubject(auth) {
  const subject = auth?.payload?.sub;
  return typeof subject === "string" && subject.trim() ? subject.trim() : null;
}

function fieldProjectSessionId(request) {
  const value = request.headers.get("X-Field-Session-Id")?.trim();
  return value && value.length <= 200 ? value : null;
}

function isFieldProjectEventPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (value.type !== "project-change") return false;
  if (typeof value.projectId !== "string" || !value.projectId) return false;
  if (typeof value.kind !== "string" || !FIELD_PROJECT_EVENT_KINDS.has(value.kind)) return false;
  if (typeof value.changedAt !== "string" || !Number.isFinite(Date.parse(value.changedAt))) return false;
  if (value.revision !== undefined && typeof value.revision !== "string") return false;
  if (value.sourceSessionId !== undefined && value.sourceSessionId !== null && typeof value.sourceSessionId !== "string") return false;
  return true;
}

class FieldProjectEventRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const incoming = new URL(request.url);
    if (incoming.pathname === FIELD_REALTIME_PATH) {
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
        return new Response("WebSocket upgrade required", {
          status: 426,
          headers: { Upgrade: "websocket" },
        });
      }
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      this.state.acceptWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (incoming.pathname === "/broadcast" && request.method === "POST") {
      const event = await request.json().catch(() => null);
      if (!isFieldProjectEventPayload(event)) return new Response(null, { status: 400 });
      const message = JSON.stringify(event);
      for (const socket of this.state.getWebSockets()) {
        try {
          socket.send(message);
        } catch {
          try { socket.close(1011, "broadcast failed"); } catch { /* already closed */ }
        }
      }
      return new Response(null, { status: 204 });
    }

    return new Response(null, { status: 404 });
  }

  webSocketMessage(socket, message) {
    if (message === "ping") {
      try { socket.send("pong"); } catch { /* connection is already gone */ }
    }
  }

  webSocketClose() {}
  webSocketError() {}
}

async function handleFieldRealtimeRequest(
  request,
  env,
  accessVerifier = verifyAccessRequest,
) {
  const incoming = new URL(request.url);
  if (incoming.pathname !== FIELD_REALTIME_PATH) return null;

  const auth = await accessVerifier(request, env);
  if (!auth?.ok) return jsonResponse({ error: "Forbidden" }, 403);
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405, { Allow: "GET" });
  }
  if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
    return new Response("WebSocket upgrade required", {
      status: 426,
      headers: apiHeaders({ Upgrade: "websocket" }),
    });
  }

  const subject = fieldProjectEventSubject(auth);
  if (!subject) return jsonResponse({ error: "Forbidden" }, 403);
  if (!env.FIELD_PROJECT_EVENTS) {
    return jsonResponse({ error: "Realtime project events are not configured" }, 503);
  }

  const room = env.FIELD_PROJECT_EVENTS.get(
    env.FIELD_PROJECT_EVENTS.idFromName(subject),
  );
  return room.fetch(request);
}

async function emitFieldProjectEvent(env, auth, request, detail) {
  const subject = fieldProjectEventSubject(auth);
  if (!subject || !env.FIELD_PROJECT_EVENTS) return;
  const event = {
    type: "project-change",
    projectId: detail.projectId,
    kind: detail.kind,
    changedAt: detail.changedAt ?? new Date().toISOString(),
    ...(detail.revision ? { revision: detail.revision } : {}),
    sourceSessionId: fieldProjectSessionId(request),
  };
  if (!isFieldProjectEventPayload(event)) {
    console.warn("field realtime refused malformed internal event", {
      projectId: detail.projectId,
      kind: detail.kind,
    });
    return;
  }
  try {
    const room = env.FIELD_PROJECT_EVENTS.get(
      env.FIELD_PROJECT_EVENTS.idFromName(subject),
    );
    const response = await room.fetch("https://field-realtime/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    if (!response.ok) {
      console.warn("field realtime broadcast failed", {
        projectId: event.projectId,
        kind: event.kind,
        status: response.status,
      });
    }
  } catch (error) {
    console.warn("field realtime broadcast failed", {
      projectId: event.projectId,
      kind: event.kind,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function readJsonBody(request, maxBytes) {
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { error: jsonResponse({ error: "Content-Type must be application/json" }, 415) };
  }
  const declared = Number(request.headers.get("Content-Length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { error: jsonResponse({ error: "Request body is too large" }, 413) };
  }
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > maxBytes) {
    return { error: jsonResponse({ error: "Request body is too large" }, 413) };
  }
  try {
    return { value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { error: jsonResponse({ error: "Malformed JSON body" }, 400) };
  }
}

function isStringMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((entry) => typeof entry === "string");
}

function isProjectData(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (typeof value.format !== "string" || !isStringMap(value.files)) return false;
  if (value.branches !== undefined && (!value.branches || typeof value.branches !== "object" || Array.isArray(value.branches))) {
    return false;
  }
  return true;
}

function conditionalHeaders(request) {
  const headers = new Headers();
  const ifMatch = request.headers.get("If-Match");
  const ifNoneMatch = request.headers.get("If-None-Match");
  if (ifMatch) headers.set("If-Match", ifMatch);
  else if (ifNoneMatch) headers.set("If-None-Match", ifNoneMatch);
  else return null;
  return headers;
}

async function getR2Object(bucket, key) {
  const object = await bucket.get(key);
  if (!object) return jsonResponse({ error: "Not found" }, 404);
  return new Response(object.body, {
    status: 200,
    headers: apiHeaders({
      "Content-Type": "application/json; charset=utf-8",
      ETag: object.httpEtag,
    }),
  });
}

async function putR2Object(bucket, key, json, request) {
  const onlyIf = conditionalHeaders(request);
  if (!onlyIf) {
    return jsonResponse({ error: "Conditional write required" }, 428);
  }
  const stored = await bucket.put(key, json, {
    onlyIf,
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  if (!stored) {
    return jsonResponse({ error: "Persistence conflict" }, 412);
  }
  return jsonResponse({ ok: true }, 200, { ETag: stored.httpEtag });
}

async function handleFieldProfileRequest(
  request,
  env,
  accessVerifier = verifyAccessRequest,
) {
  const incoming = new URL(request.url);
  const route = parseProfileRoute(incoming.pathname);

  if (!route) return null;
  if (route.invalid) {
    return jsonResponse({ error: "Invalid profile route" }, 400);
  }

  const auth = await accessVerifier(request, env);

  if (!auth?.ok) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  if (!env.FIELD_PROJECTS) {
    return jsonResponse(
      { error: "Profile storage is not configured" },
      503,
    );
  }

  const subject =
    typeof auth.payload?.sub === "string"
      ? auth.payload.sub.trim()
      : "";

  if (!subject) {
    return jsonResponse(
      { error: "Authenticated user has no subject" },
      403,
    );
  }

  const userKey = encodeURIComponent(subject);
  const baseKey = `profiles/${userKey}`;
  const metaKey = `${baseKey}/profile.json`;
  const avatarKey = `${baseKey}/avatar`;

  try {
    if (route.kind === "profile") {
      if (request.method !== "GET") {
        return jsonResponse(
          { error: "Method not allowed" },
          405,
          { Allow: "GET" },
        );
      }

      const profileObject = await env.FIELD_PROJECTS.get(metaKey);

      if (!profileObject) {
        return jsonResponse({
          hasCustomAvatar: false,
          avatarUpdatedAt: null,
          avatarUrl: null,
        });
      }

      let profile = {};

      try {
        profile = JSON.parse(await profileObject.text());
      } catch {
        profile = {};
      }

      const avatarUpdatedAt =
        typeof profile?.avatarUpdatedAt === "string"
          ? profile.avatarUpdatedAt
          : null;

      return jsonResponse({
        hasCustomAvatar: Boolean(avatarUpdatedAt),
        avatarUpdatedAt,
        avatarUrl: avatarUpdatedAt
          ? `${FIELD_PROFILE_ROOT}/avatar?v=${encodeURIComponent(avatarUpdatedAt)}`
          : null,
      });
    }

    if (request.method === "GET") {
      const avatar = await env.FIELD_PROJECTS.get(avatarKey);

      if (!avatar) {
        return jsonResponse({ error: "Not found" }, 404);
      }

      return new Response(avatar.body, {
        status: 200,
        headers: apiHeaders({
          "Content-Type":
            avatar.httpMetadata?.contentType ?? "image/webp",
          "Cache-Control":
            "private, max-age=31536000, immutable",
          ETag: avatar.httpEtag,
        }),
      });
    }

    if (request.method === "PUT") {
      const contentType =
        (request.headers.get("Content-Type") ?? "")
          .split(";")[0]
          .trim()
          .toLowerCase();

      if (
        ![
          "image/webp",
          "image/jpeg",
          "image/png",
        ].includes(contentType)
      ) {
        return jsonResponse(
          { error: "Avatar must be WebP, JPEG, or PNG" },
          415,
        );
      }

      const declared = Number(
        request.headers.get("Content-Length") ?? "0",
      );

      if (
        Number.isFinite(declared) &&
        declared > MAX_AVATAR_BYTES
      ) {
        return jsonResponse(
          { error: "Avatar is too large" },
          413,
        );
      }

      const bytes = await request.arrayBuffer();

      if (bytes.byteLength === 0) {
        return jsonResponse(
          { error: "Avatar is empty" },
          400,
        );
      }

      if (bytes.byteLength > MAX_AVATAR_BYTES) {
        return jsonResponse(
          { error: "Avatar is too large" },
          413,
        );
      }

      const updatedAt = new Date().toISOString();

      await env.FIELD_PROJECTS.put(
        avatarKey,
        bytes,
        {
          httpMetadata: {
            contentType,
          },
        },
      );

      await env.FIELD_PROJECTS.put(
        metaKey,
        JSON.stringify({
          avatarUpdatedAt: updatedAt,
        }),
        {
          httpMetadata: {
            contentType:
              "application/json; charset=utf-8",
          },
        },
      );

      return jsonResponse({
        hasCustomAvatar: true,
        avatarUpdatedAt: updatedAt,
        avatarUrl:
          `${FIELD_PROFILE_ROOT}/avatar?v=${encodeURIComponent(updatedAt)}`,
      });
    }

    if (request.method === "DELETE") {
      await Promise.all([
        env.FIELD_PROJECTS.delete(avatarKey),
        env.FIELD_PROJECTS.delete(metaKey),
      ]);

      return jsonResponse({
        hasCustomAvatar: false,
        avatarUpdatedAt: null,
        avatarUrl: null,
      });
    }

    return jsonResponse(
      { error: "Method not allowed" },
      405,
      { Allow: "GET, PUT, DELETE" },
    );
  } catch (error) {
    console.error("field profile error", error);

    return jsonResponse(
      { error: "Profile storage failure" },
      503,
    );
  }
}

/* FIELD_DASHBOARD_API_START */
function isValidFieldProjectId(id) {
  return PROJECT_ID_RE.test(id) && id !== "." && id !== ".." && !id.includes("..");
}

function parseDashboardProjectRoute(pathname, method) {
  if (pathname === FIELD_API_ROOT) return { kind: "collection" };
  if (!pathname.startsWith(`${FIELD_API_ROOT}/`)) return null;

  const rest = pathname.slice(FIELD_API_ROOT.length + 1);
  const parts = rest.split("/");
  let id;
  try {
    id = decodeURIComponent(parts[0]);
  } catch {
    return { invalid: true };
  }
  if (!isValidFieldProjectId(id)) return { invalid: true };

  if (parts.length === 2 && parts[1] === "thumbnail") {
    return { id, kind: "thumbnail" };
  }
  if (parts.length === 2 && parts[1] === "duplicate") {
    return { id, kind: "duplicate" };
  }
  if (parts.length === 1 && method === "DELETE") {
    return { id, kind: "permanent-delete" };
  }
  return null;
}

function isoTimestamp(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function r2UploadedTimestamp(object) {
  return isoTimestamp(object?.uploaded ?? null);
}

function parseStoredProjectMeta(text) {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function readR2Text(object) {
  if (typeof object?.text === "function") return object.text();
  if (typeof object?.body === "string") return object.body;
  return new Response(object?.body ?? "").text();
}

function fieldProjectThumbnailKey(id) {
  return `projects/${id}/thumbnail`;
}

function fieldProjectLegacyThumbnailKey(id) {
  return `projects/${id}/thumbnail.webp`;
}

function fieldProjectThumbnailUrl(id, version) {
  const query = version ? `?v=${encodeURIComponent(version)}` : "";
  return `${FIELD_API_ROOT}/${encodeURIComponent(id)}/thumbnail${query}`;
}

async function getFieldProjectThumbnailObject(bucket, id) {
  const current = await bucket.get(fieldProjectThumbnailKey(id));
  if (current) return { object: current, legacy: false };
  const legacy = await bucket.get(fieldProjectLegacyThumbnailKey(id));
  return legacy ? { object: legacy, legacy: true } : { object: null, legacy: false };
}

function withFieldProjectThumbnail(project, id, thumbnailUpdatedAt) {
  if (!thumbnailUpdatedAt) return project;
  return {
    ...project,
    thumbnail: fieldProjectThumbnailUrl(id, thumbnailUpdatedAt),
  };
}

async function loadFieldProjectClock(bucket, id) {
  const [{ object: metaObject, raw }, current] = await Promise.all([
    loadRawProjectMeta(bucket, id),
    bucket.get(`projects/${id}/current.json`),
  ]);
  if (!metaObject && !current) return { exists: false, updatedAt: null };
  const fallback = r2UploadedTimestamp(metaObject) ?? r2UploadedTimestamp(current) ?? new Date().toISOString();
  return {
    exists: true,
    updatedAt: normalizeFieldProjectMeta(raw, id, fallback).updatedAt,
  };
}

function thumbnailResponseHeaders(object, projectUpdatedAt, versioned) {
  const thumbnailUpdatedAt = r2UploadedTimestamp(object);
  return apiHeaders({
    "Content-Type": object?.httpMetadata?.contentType ?? "image/webp",
    ...(object?.httpEtag ? { ETag: object.httpEtag } : {}),
    ...(thumbnailUpdatedAt ? { "X-Field-Thumbnail-Updated-At": thumbnailUpdatedAt } : {}),
    ...(projectUpdatedAt ? { "X-Field-Project-Updated-At": projectUpdatedAt } : {}),
    "Cache-Control": versioned
      ? "private, max-age=31536000, immutable"
      : "private, max-age=0, must-revalidate",
  });
}

function normalizeFieldProjectMeta(raw, id, fallbackTimestamp) {
  const fallback = isoTimestamp(fallbackTimestamp) ?? new Date().toISOString();
  const createdAt = isoTimestamp(raw?.createdAt) ?? isoTimestamp(raw?.updatedAt) ?? fallback;
  const updatedAt = isoTimestamp(raw?.updatedAt) ?? fallback ?? createdAt;
  const trashedAt = raw?.trashedAt === null ? null : isoTimestamp(raw?.trashedAt);
  const thumbnail = typeof raw?.thumbnail === "string" && raw.thumbnail.trim()
    ? raw.thumbnail.trim()
    : null;

  return {
    id,
    name: typeof raw?.name === "string" && raw.name.trim() ? raw.name.trim() : "Untitled",
    createdAt,
    updatedAt,
    starred: raw?.starred === true,
    trashedAt,
    thumbnail,
  };
}

async function loadRawProjectMeta(bucket, id) {
  const object = await bucket.get(`projects/${id}/meta.json`);
  if (!object) return { object: null, raw: {} };
  return { object, raw: parseStoredProjectMeta(await readR2Text(object)) };
}

async function listFieldProjectRecords(bucket) {
  const seen = new Map();
  let cursor;

  do {
    const page = await bucket.list({ prefix: "projects/", cursor });
    for (const object of page.objects ?? []) {
      const match = /^projects\/([^/]+)\/(current\.json|meta\.json|thumbnail|thumbnail\.webp)$/.exec(object.key);
      if (!match || !isValidFieldProjectId(match[1])) continue;
      const id = match[1];
      const row = seen.get(id) ?? { timestamps: [], thumbnailUpdatedAt: null, hasCurrentOrMeta: false };
      const uploaded = r2UploadedTimestamp(object);
      if (match[2] === "thumbnail" || match[2] === "thumbnail.webp") {
        // Prefer the extensionless canonical object when both it and the legacy
        // reserved .webp key exist. Thumbnail time must NEVER feed project
        // updatedAt / Recents ordering.
        if (match[2] === "thumbnail" || !row.thumbnailUpdatedAt) {
          row.thumbnailUpdatedAt = uploaded;
        }
      } else {
        row.hasCurrentOrMeta = true;
        if (uploaded) row.timestamps.push(uploaded);
      }
      seen.set(id, row);
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  const projects = await Promise.all([...seen.entries()]
    .filter(([, row]) => row.hasCurrentOrMeta)
    .map(async ([id, row]) => {
      const { object, raw } = await loadRawProjectMeta(bucket, id);
      const timestamps = [...row.timestamps];
      const metaUploaded = r2UploadedTimestamp(object);
      if (metaUploaded) timestamps.push(metaUploaded);
      timestamps.sort();
      const fallback = timestamps[timestamps.length - 1] ?? new Date().toISOString();
      return withFieldProjectThumbnail(
        normalizeFieldProjectMeta(raw, id, fallback),
        id,
        row.thumbnailUpdatedAt,
      );
    }));

  projects.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return projects;
}

async function touchFieldProjectMeta(bucket, id) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { object, raw } = await loadRawProjectMeta(bucket, id);
    const current = object ? null : await bucket.get(`projects/${id}/current.json`);
    const fallback = r2UploadedTimestamp(object) ?? r2UploadedTimestamp(current) ?? new Date().toISOString();
    const normalized = normalizeFieldProjectMeta(raw, id, fallback);
    const next = {
      ...raw,
      ...normalized,
      id,
      updatedAt: new Date().toISOString(),
    };
    const onlyIf = new Headers();
    if (object?.httpEtag) onlyIf.set("If-Match", object.httpEtag);
    else onlyIf.set("If-None-Match", "*");
    const stored = await bucket.put(`projects/${id}/meta.json`, JSON.stringify(next), {
      onlyIf,
      httpMetadata: { contentType: "application/json; charset=utf-8" },
    });
    if (stored) return;
  }
  console.warn("field dashboard metadata touch conflicted twice", { id });
}

function parseFieldProjectMetaPatch(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "Malformed project metadata" };
  }

  const patch = {};
  let touched = false;

  if (Object.prototype.hasOwnProperty.call(value, "name")) {
    if (typeof value.name !== "string") return { error: "Project name must be a string" };
    const name = value.name.trim();
    if (name.length > 200) return { error: "Project name is too long" };
    patch.name = name;
    touched = true;
  }

  if (Object.prototype.hasOwnProperty.call(value, "starred")) {
    if (typeof value.starred !== "boolean") return { error: "starred must be boolean" };
    patch.starred = value.starred;
    touched = true;
  }

  if (Object.prototype.hasOwnProperty.call(value, "trashedAt")) {
    if (value.trashedAt === null) patch.trashedAt = null;
    else {
      const trashedAt = isoTimestamp(value.trashedAt);
      if (!trashedAt) return { error: "trashedAt must be an ISO timestamp or null" };
      patch.trashedAt = trashedAt;
    }
    touched = true;
  }

  if (Object.prototype.hasOwnProperty.call(value, "thumbnail")) {
    if (value.thumbnail === null || value.thumbnail === "") patch.thumbnail = null;
    else if (typeof value.thumbnail === "string" && value.thumbnail.length <= 4096) patch.thumbnail = value.thumbnail;
    else return { error: "thumbnail must be a string or null" };
    touched = true;
  }

  if (!touched) return { error: "No supported project metadata fields supplied" };
  return { patch };
}

async function putFieldProjectMetaPatch(bucket, id, parsedValue, request) {
  const onlyIf = conditionalHeaders(request);
  if (!onlyIf) return jsonResponse({ error: "Conditional write required" }, 428);

  const parsed = parseFieldProjectMetaPatch(parsedValue);
  if (parsed.error) return jsonResponse({ error: parsed.error }, 400);

  const { object, raw } = await loadRawProjectMeta(bucket, id);
  const current = object ? null : await bucket.get(`projects/${id}/current.json`);
  const fallback = r2UploadedTimestamp(object) ?? r2UploadedTimestamp(current) ?? new Date().toISOString();
  const normalized = normalizeFieldProjectMeta(raw, id, fallback);
  const nextProject = {
    ...normalized,
    ...parsed.patch,
    id,
    updatedAt: new Date().toISOString(),
  };
  const storedBody = {
    ...raw,
    ...nextProject,
  };

  const stored = await bucket.put(`projects/${id}/meta.json`, JSON.stringify(storedBody), {
    onlyIf,
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  if (!stored) return jsonResponse({ error: "Persistence conflict" }, 412);
  const { object: thumbnailObject } = await getFieldProjectThumbnailObject(bucket, id);
  const responseProject = withFieldProjectThumbnail(
    nextProject,
    id,
    r2UploadedTimestamp(thumbnailObject),
  );
  return jsonResponse({ project: responseProject }, 200, { ETag: stored.httpEtag });
}

async function handleFieldDashboardRequest(request, env, accessVerifier = verifyAccessRequest) {
  const incoming = new URL(request.url);
  const route = parseDashboardProjectRoute(incoming.pathname, request.method);
  if (!route) return null;
  if (route.invalid) return jsonResponse({ error: "Invalid project route" }, 400);

  const auth = await accessVerifier(request, env);
  if (!auth?.ok) return jsonResponse({ error: "Forbidden" }, 403);
  if (!env.FIELD_PROJECTS) return jsonResponse({ error: "Project storage is not configured" }, 503);

  try {
    if (route.kind === "thumbnail") {
      if (!["GET", "HEAD", "PUT"].includes(request.method)) {
        return jsonResponse({ error: "Method not allowed" }, 405, { Allow: "GET, HEAD, PUT" });
      }

      const clock = await loadFieldProjectClock(env.FIELD_PROJECTS, route.id);
      if (!clock.exists) return jsonResponse({ error: "Not found" }, 404);

      if (request.method === "PUT") {
        const contentType = (request.headers.get("Content-Type") ?? "")
          .split(";")[0]
          .trim()
          .toLowerCase();
        if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
          return jsonResponse({ error: "Thumbnail must be JPEG, PNG, or WebP" }, 415);
        }
        const declared = Number(request.headers.get("Content-Length") ?? "0");
        if (Number.isFinite(declared) && declared > MAX_THUMBNAIL_BYTES) {
          return jsonResponse({ error: "Thumbnail is too large" }, 413);
        }
        const bytes = await request.arrayBuffer();
        if (bytes.byteLength === 0) return jsonResponse({ error: "Thumbnail is empty" }, 400);
        if (bytes.byteLength > MAX_THUMBNAIL_BYTES) {
          return jsonResponse({ error: "Thumbnail is too large" }, 413);
        }
        const stored = await env.FIELD_PROJECTS.put(fieldProjectThumbnailKey(route.id), bytes, {
          httpMetadata: { contentType },
        });
        // Best-effort cleanup of the assignment-era reserved legacy key.
        await env.FIELD_PROJECTS.delete(fieldProjectLegacyThumbnailKey(route.id));
        const version = r2UploadedTimestamp(stored) ?? new Date().toISOString();
        await emitFieldProjectEvent(env, auth, request, {
          projectId: route.id,
          kind: "thumbnail",
          changedAt: version,
        });
        return jsonResponse({ url: fieldProjectThumbnailUrl(route.id, version) }, 200);
      }

      const { object: thumbnailObject } = await getFieldProjectThumbnailObject(env.FIELD_PROJECTS, route.id);
      const headers = thumbnailResponseHeaders(
        thumbnailObject,
        clock.updatedAt,
        incoming.searchParams.has("v"),
      );
      if (!thumbnailObject) {
        return new Response(null, {
          status: 404,
          headers: apiHeaders({
            ...(clock.updatedAt ? { "X-Field-Project-Updated-At": clock.updatedAt } : {}),
          }),
        });
      }
      if (request.method === "HEAD") return new Response(null, { status: 200, headers });
      return new Response(thumbnailObject.body, { status: 200, headers });
    }

    if (route.kind === "collection") {
      if (request.method === "GET") {
        return jsonResponse({ projects: await listFieldProjectRecords(env.FIELD_PROJECTS) });
      }
      if (request.method === "POST") {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const project = {
          id,
          name: "Untitled",
          createdAt: now,
          updatedAt: now,
          starred: false,
          trashedAt: null,
          thumbnail: null,
        };
        await env.FIELD_PROJECTS.put(`projects/${id}/meta.json`, JSON.stringify(project), {
          httpMetadata: { contentType: "application/json; charset=utf-8" },
        });
        await emitFieldProjectEvent(env, auth, request, {
          projectId: id,
          kind: "created",
          changedAt: now,
        });
        return jsonResponse({ project }, 201);
      }
      return jsonResponse({ error: "Method not allowed" }, 405, { Allow: "GET, POST" });
    }

    if (route.kind === "duplicate") {
      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, 405, { Allow: "POST" });
      }
      const baseKey = `projects/${route.id}`;
      const [current, metaObject, thumbnailResult] = await Promise.all([
        env.FIELD_PROJECTS.get(`${baseKey}/current.json`),
        env.FIELD_PROJECTS.get(`${baseKey}/meta.json`),
        getFieldProjectThumbnailObject(env.FIELD_PROJECTS, route.id),
      ]);
      if (!current && !metaObject) return jsonResponse({ error: "Not found" }, 404);

      const rawMeta = metaObject ? parseStoredProjectMeta(await readR2Text(metaObject)) : {};
      const fallback = r2UploadedTimestamp(metaObject) ?? r2UploadedTimestamp(current) ?? new Date().toISOString();
      const source = normalizeFieldProjectMeta(rawMeta, route.id, fallback);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const project = {
        ...source,
        id,
        name: `${source.name} Copy`,
        createdAt: now,
        updatedAt: now,
        starred: false,
        trashedAt: null,
        thumbnail: thumbnailResult.object ? fieldProjectThumbnailUrl(id, now) : null,
      };
      const storedMeta = { ...rawMeta, ...project, thumbnail: null };

      if (current) {
        await env.FIELD_PROJECTS.put(`projects/${id}/current.json`, await current.arrayBuffer(), {
          httpMetadata: { contentType: "application/json; charset=utf-8" },
        });
      }
      if (thumbnailResult.object) {
        await env.FIELD_PROJECTS.put(fieldProjectThumbnailKey(id), await thumbnailResult.object.arrayBuffer(), {
          httpMetadata: {
            contentType: thumbnailResult.object.httpMetadata?.contentType ?? (thumbnailResult.legacy ? "image/webp" : "image/jpeg"),
          },
        });
      }
      await env.FIELD_PROJECTS.put(`projects/${id}/meta.json`, JSON.stringify(storedMeta), {
        httpMetadata: { contentType: "application/json; charset=utf-8" },
      });
      await emitFieldProjectEvent(env, auth, request, {
        projectId: id,
        kind: "created",
        changedAt: now,
      });
      return jsonResponse({ project }, 201);
    }

    const baseKey = `projects/${route.id}`;
    const [current, metaObject] = await Promise.all([
      env.FIELD_PROJECTS.get(`${baseKey}/current.json`),
      env.FIELD_PROJECTS.get(`${baseKey}/meta.json`),
    ]);
    if (!current && !metaObject) return jsonResponse({ error: "Not found" }, 404);

    const rawMeta = metaObject ? parseStoredProjectMeta(await readR2Text(metaObject)) : {};
    const fallback = r2UploadedTimestamp(metaObject) ?? r2UploadedTimestamp(current) ?? new Date().toISOString();
    const project = normalizeFieldProjectMeta(rawMeta, route.id, fallback);
    if (!project.trashedAt) {
      return jsonResponse({ error: "Project must be in Trash before permanent deletion" }, 409);
    }

    await env.FIELD_PROJECTS.delete([
      `${baseKey}/current.json`,
      `${baseKey}/meta.json`,
      fieldProjectThumbnailKey(route.id),
      fieldProjectLegacyThumbnailKey(route.id),
    ]);
    await emitFieldProjectEvent(env, auth, request, {
      projectId: route.id,
      kind: "deleted",
      changedAt: new Date().toISOString(),
    });
    return new Response(null, { status: 204, headers: apiHeaders() });
  } catch (error) {
    console.error("field dashboard project error", error);
    return jsonResponse({ error: "Project storage failure" }, 503);
  }
}
/* FIELD_DASHBOARD_API_END */

async function handleFieldPersistenceRequest(request, env, accessVerifier = verifyAccessRequest) {
  const incoming = new URL(request.url);
  const route = parseProjectRoute(incoming.pathname);
  if (!route) return null;
  if (route.invalid) return jsonResponse({ error: "Invalid project route" }, 400);

  const auth = await accessVerifier(request, env);
  if (!auth?.ok) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }
  if (!env.FIELD_PROJECTS) {
    return jsonResponse({ error: "Project storage is not configured" }, 503);
  }

  if (request.method !== "GET" && request.method !== "PUT") {
    return jsonResponse({ error: "Method not allowed" }, 405, { Allow: "GET, PUT" });
  }

  const baseKey = `projects/${route.id}`;
  const key = route.kind === "meta" ? `${baseKey}/meta.json` : `${baseKey}/current.json`;

  try {
    if (request.method === "GET") {
      return await getR2Object(env.FIELD_PROJECTS, key);
    }

    if (route.kind === "project") {
      const parsed = await readJsonBody(request, MAX_PROJECT_BYTES);
      if (parsed.error) return parsed.error;
      if (!isProjectData(parsed.value)) {
        return jsonResponse({ error: "Malformed ProjectData" }, 400);
      }
      const response = await putR2Object(env.FIELD_PROJECTS, key, JSON.stringify(parsed.value), request);
      if (response.ok) {
        await touchFieldProjectMeta(env.FIELD_PROJECTS, route.id);
        await emitFieldProjectEvent(env, auth, request, {
          projectId: route.id,
          kind: "document",
          changedAt: new Date().toISOString(),
          revision: response.headers.get("ETag") ?? undefined,
        });
      }
      return response;
    }

    const parsed = await readJsonBody(request, MAX_META_BYTES);
    if (parsed.error) return parsed.error;
    const response = await putFieldProjectMetaPatch(
      env.FIELD_PROJECTS,
      route.id,
      parsed.value,
      request,
    );
    if (response.ok) {
      await emitFieldProjectEvent(env, auth, request, {
        projectId: route.id,
        kind: "metadata",
        changedAt: new Date().toISOString(),
      });
    }
    return response;
  } catch (error) {
    console.error("field persistence error", error);
    return jsonResponse({ error: "Project storage failure" }, 503);
  }
}

export {
  handleGoogleFontsRequest,
  handleFieldProfileRequest,
  handleFieldDashboardRequest,
  handleFieldPersistenceRequest,
  handleFieldRealtimeRequest,
  FieldProjectEventRoom,
  parseProjectRoute,
  verifyAccessRequest,
  verifyWorkerAccess,
};

export default {
  async fetch(request, env, ctx) {
    const incoming = new URL(request.url);

    // Prefer Cloudflare's verified Worker Access context. Fall back to our
    // explicit JWT validation for classic hostname Access and direct requests.
    // An unprotected workers.dev request has neither and therefore fails closed.
    const accessVerifier = (candidateRequest, candidateEnv) =>
      verifyWorkerAccess(candidateRequest, candidateEnv, ctx);

    // field APIs are handled before static assets so API failures can never
    // fall through to index.html.
    const fontsResponse = await handleGoogleFontsRequest(
      request,
      env,
      accessVerifier,
    );
    if (fontsResponse) return fontsResponse;

    const profileResponse = await handleFieldProfileRequest(
      request,
      env,
      accessVerifier,
    );
    if (profileResponse) return profileResponse;

    const realtimeResponse = await handleFieldRealtimeRequest(
      request,
      env,
      accessVerifier,
    );
    if (realtimeResponse) return realtimeResponse;

    const dashboardResponse = await handleFieldDashboardRequest(
      request,
      env,
      accessVerifier,
    );
    if (dashboardResponse) return dashboardResponse;

    const apiResponse = await handleFieldPersistenceRequest(
      request,
      env,
      accessVerifier,
    );
    if (apiResponse) return apiResponse;

    const target = new URL(request.url);
    target.pathname = assetPathForHost(incoming.hostname, incoming.pathname);

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
