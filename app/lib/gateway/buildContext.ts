/**
 * Request Context Builder (Stub)
 *
 * Purpose:
 * Transforms an incoming HTTP Request into a standardized RequestContext object
 * for policy engine evaluation. Extracts:
 * - User identity and role (from session cookies)
 * - Device security posture (simulated header or session flag)
 * - Geo-location (e.g., country code from Vercel / Cloudflare headers or fallback)
 * - Request path, HTTP method, and timestamp
 *
 * TODO (Step 5 & 6):
 * - Parse session cookie to retrieve simulated DemoUser identity.
 * - Inspect simulated device posture header/cookie.
 * - Extract Vercel `x-vercel-ip-country` header.
 */

import type { RequestContext } from "../policy-engine/types";

export interface BuildContextOptions {
  appId?: string;
}

export async function buildRequestContext(
  request: Request,
  options: BuildContextOptions = {}
): Promise<RequestContext> {
  const url = new URL(request.url);

  // Stub implementation for skeleton milestone
  return {
    appId: options.appId,
    timestamp: new Date(),
    path: url.pathname,
    method: request.method,
    // TODO: Extract authenticated session user ID and role
    userId: undefined,
    role: undefined,
    // TODO: Extract device security posture flag
    deviceSecure: undefined,
    // TODO: Extract country from geolocation headers (e.g. x-vercel-ip-country)
    country: request.headers.get("x-vercel-ip-country") ?? undefined,
  };
}
