/**
 * Upstream Proxy Forwarder
 *
 * Dispatches verified ALLOW requests to configured upstream application services.
 * Enforces Zero Trust Protections:
 * - Sanitizes incoming headers: strips hop-by-hop headers, removes client cookies,
 *   and purges spoofed 'x-gateway-*' headers.
 * - Injects 'x-gateway-secret' matching GATEWAY_SHARED_SECRET so upstream apps can reject direct traffic.
 * - Prevents SSRF attacks by strictly validating that resolved URLs never escape the upstream origin.
 *
 * Known Limitations (prototype scope):
 * 1. WebSockets / SSE: Not supported over simple HTTP reverse proxy.
 * 2. Response Body Rewriting: Does not rewrite internal links inside HTML/JS responses.
 * 3. Cookie Scoping: Cookies set by upstream are not mapped across virtual gateway prefixes.
 * 4. Vercel Serverless Limits: Execution timeout is bounded by serverless runtime (10-15s).
 */

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "proxy-authorization",
  "proxy-authenticate",
]);

export interface GatewayHeaderOptions {
  sharedSecret: string;
  userId?: string;
  userRole?: string;
  forwardedFor?: string;
  forwardedHost?: string;
  forwardedProto?: string;
}

/**
 * Strips hop-by-hop, host, and client-supplied credentials/gateway headers,
 * then injects verified gateway context headers.
 */
export function sanitizeRequestHeaders(
  incomingHeaders: Headers,
  options: GatewayHeaderOptions
): Headers {
  const sanitized = new Headers();

  for (const [key, value] of incomingHeaders.entries()) {
    const lower = key.toLowerCase();

    // 1. Remove hop-by-hop headers
    if (HOP_BY_HOP_HEADERS.has(lower)) {
      continue;
    }

    // 2. Remove Host header
    if (lower === "host") {
      continue;
    }

    // 3. Remove Gateway session cookie header
    if (lower === "cookie") {
      continue;
    }

    // 4. Purge client-supplied x-gateway-* headers
    if (lower.startsWith("x-gateway-")) {
      continue;
    }

    sanitized.set(key, value);
  }

  // Inject authenticated gateway headers
  sanitized.set("x-gateway-secret", options.sharedSecret);

  if (options.userId) {
    sanitized.set("x-gateway-user-id", options.userId);
  }
  if (options.userRole) {
    sanitized.set("x-gateway-user-role", options.userRole);
  }
  if (options.forwardedFor) {
    sanitized.set("x-forwarded-for", options.forwardedFor);
  }
  if (options.forwardedHost) {
    sanitized.set("x-forwarded-host", options.forwardedHost);
  }
  if (options.forwardedProto) {
    sanitized.set("x-forwarded-proto", options.forwardedProto);
  }

  return sanitized;
}

/**
 * Removes hop-by-hop headers from upstream responses.
 */
export function sanitizeResponseHeaders(upstreamHeaders: Headers): Headers {
  const clean = new Headers();
  for (const [key, value] of upstreamHeaders.entries()) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      clean.set(key, value);
    }
  }
  return clean;
}

/**
 * Translates an incoming gateway request URL into a validated upstream destination URL.
 *
 * SSRF Protections:
 * - Checks for backslashes and disallows protocol-relative paths ("//evil.com").
 * - Validates path traversal ("..") in decoded URI.
 * - Asserts that the resulting origin strictly matches the upstream base origin.
 * - Asserts that the resulting path remains rooted within the upstream base path.
 */
export function buildUpstreamUrl(
  upstreamBase: string,
  pathPrefix: string,
  requestUrl: URL
): URL {
  const base = new URL(upstreamBase);

  // Check for dangerous characters in the raw request path or href
  if (requestUrl.pathname.includes("\\") || requestUrl.href.includes("\\")) {
    throw new Error("Invalid request path: backslashes are not permitted");
  }

  const normalizedPrefix = pathPrefix.endsWith("/")
    ? pathPrefix.slice(0, -1)
    : pathPrefix;

  if (!requestUrl.pathname.startsWith(normalizedPrefix)) {
    throw new Error(`Path traversal or invalid prefix: Request path does not start with ${pathPrefix}`);
  }

  let remainder = requestUrl.pathname.slice(normalizedPrefix.length);

  // Disallow protocol-relative slashes and backslashes
  if (remainder.startsWith("//") || remainder.startsWith("/\\") || remainder.includes("\\")) {
    throw new Error("Invalid request path: protocol-relative slashes or backslashes are not permitted");
  }

  // Normalize leading slash
  if (!remainder.startsWith("/")) {
    remainder = "/" + remainder;
  }

  // Check decoded path for dot segments trying to escape
  let decodedRemainder: string;
  try {
    decodedRemainder = decodeURIComponent(remainder);
  } catch {
    throw new Error("Invalid path: malformed percent-encoding");
  }

  const segments = decodedRemainder.split("/");
  if (segments.some((seg) => seg === ".." || seg === ".")) {
    throw new Error("Path traversal (..) is not permitted");
  }

  const basePath = base.pathname.endsWith("/")
    ? base.pathname.slice(0, -1)
    : base.pathname;

  // Append remainder to upstream base path
  const combinedPath =
    remainder === "/" ? (basePath || "/") : `${basePath}${remainder}`;

  const result = new URL(combinedPath, base.origin);
  result.search = requestUrl.search;

  // Security Check 1: Origin must match
  if (result.origin !== base.origin) {
    throw new Error(
      `SSRF Prevention: Upstream origin mismatch (${result.origin} !== ${base.origin})`
    );
  }

  // Security Check 2: Path must not escape upstream base
  const expectedBase = basePath || "/";
  if (!result.pathname.startsWith(expectedBase)) {
    throw new Error("SSRF Prevention: Upstream path escaped configured base path");
  }

  return result;
}

export interface ForwardOptions {
  upstreamBaseUrl: string;
  pathPrefix: string;
  sharedSecret: string;
  userId?: string;
  userRole?: string;
  forwardedFor?: string;
}

/**
 * Forwards an allowed request to the upstream target and relays the response.
 */
export async function forwardToUpstream(
  request: Request,
  options: ForwardOptions
): Promise<Response> {
  const requestUrl = new URL(request.url);

  let targetUrl: URL;
  try {
    targetUrl = buildUpstreamUrl(
      options.upstreamBaseUrl,
      options.pathPrefix,
      requestUrl
    );
  } catch {
    return new Response("Bad Request: Invalid destination path", {
      status: 400,
      headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
    });
  }

  const sanitizedHeaders = sanitizeRequestHeaders(request.headers, {
    sharedSecret: options.sharedSecret,
    userId: options.userId,
    userRole: options.userRole,
    forwardedFor: options.forwardedFor,
    forwardedHost: requestUrl.host,
    forwardedProto: requestUrl.protocol.replace(":", ""),
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const isGetOrHead = request.method === "GET" || request.method === "HEAD";
    const fetchOptions: RequestInit & { duplex?: "half" } = {
      method: request.method,
      headers: sanitizedHeaders,
      redirect: "manual",
      signal: controller.signal,
      duplex: isGetOrHead ? undefined : "half",
      body: isGetOrHead ? undefined : request.body,
    };

    const upstreamResponse = await fetch(targetUrl.toString(), fetchOptions);
    clearTimeout(timeoutId);

    const responseHeaders = sanitizeResponseHeaders(upstreamResponse.headers);

    // Rewrite redirects if Location points to upstream origin/path
    const locationHeader = upstreamResponse.headers.get("location");
    if (locationHeader && upstreamResponse.status >= 300 && upstreamResponse.status < 400) {
      try {
        const upstreamBase = new URL(options.upstreamBaseUrl);
        const locationUrl = new URL(locationHeader, targetUrl);

        if (locationUrl.origin === upstreamBase.origin) {
          const upstreamBasePath = upstreamBase.pathname.endsWith("/")
            ? upstreamBase.pathname.slice(0, -1)
            : upstreamBase.pathname;

          let locationRemainder = locationUrl.pathname;
          if (upstreamBasePath && locationRemainder.startsWith(upstreamBasePath)) {
            locationRemainder = locationRemainder.slice(upstreamBasePath.length);
          }

          const prefixClean = options.pathPrefix.endsWith("/")
            ? options.pathPrefix.slice(0, -1)
            : options.pathPrefix;

          const rewrittenLocation = `${prefixClean}${locationRemainder}${locationUrl.search}`;
          responseHeaders.set("location", rewrittenLocation);
        }
      } catch {
        // Leave unparsed location intact
      }
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    // Generic 502 without leaking upstream URL
    return new Response("Bad Gateway: Upstream service unavailable or timed out", {
      status: 502,
      headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
    });
  }
}
