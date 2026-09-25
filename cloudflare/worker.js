const CANVAS_HOST = "canvas.field.loew.fi";
const PREVIEW_HOST = "preview.field.loew.fi";
const FIELD_API_ROOT = "/api/field/projects";
const FIELD_PROFILE_ROOT = "/api/field/profile";
const FIELD_FONTS_API_PATH = "/api/field/fonts";
const GOOGLE_FONTS_UPSTREAM = "https://www.googleapis.com/webfonts/v1/webfonts";
const GOOGLE_FONTS_CACHE_TTL_SECONDS = 24 * 60 * 60;
const MAX_PROJECT_BYTES = 32 * 1024 * 1024;
const MAX_META_BYTES = 64 * 1024;
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

async function verifyWorkerAccess(request, env, ctx) {
  // Current Cloudflare Workers Access integration provides a verified identity
  // directly on the execution context. Prefer it when present: Cloudflare has
  // already authenticated + authorized the request before this Worker runs.
  if (ctx?.access) {
    try {
      const identity = await ctx.access.getIdentity();

      if (!identity || typeof identity !== "object") {
        return { ok: false, reason: "Worker Access identity unavailable" };
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
        return { ok: false, reason: "Worker Access identity has no stable subject" };
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
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Classic hostname Access / direct-origin validation path. This still
  // cryptographically validates issuer, audience, expiry, and signature.
  return verifyAccessRequest(request, env);
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
      return await putR2Object(env.FIELD_PROJECTS, key, JSON.stringify(parsed.value), request);
    }

    const parsed = await readJsonBody(request, MAX_META_BYTES);
    if (parsed.error) return parsed.error;
    if (!parsed.value || typeof parsed.value !== "object" || typeof parsed.value.name !== "string") {
      return jsonResponse({ error: "Malformed project metadata" }, 400);
    }
    const name = parsed.value.name.trim();
    if (name.length > 200) return jsonResponse({ error: "Project name is too long" }, 400);
    const storedMeta = JSON.stringify({ name, updatedAt: new Date().toISOString() });
    return await putR2Object(env.FIELD_PROJECTS, key, storedMeta, request);
  } catch (error) {
    console.error("field persistence error", error);
    return jsonResponse({ error: "Project storage failure" }, 503);
  }
}

export {
  handleGoogleFontsRequest,
  handleFieldProfileRequest,
  handleFieldPersistenceRequest,
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
