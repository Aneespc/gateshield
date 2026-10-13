import { verifyGatewaySecret } from "../gateway/verifySecret.server";

export type GatewayAuthResult =
  | { ok: true; userId: string; role: string }
  | { ok: false; response: Response };

/**
 * Verifies that an incoming upstream request was routed through GateShield.
 *
 * Requirements:
 * - Uses timing-safe secret comparison against GATEWAY_SHARED_SECRET.
 * - Extracts userId and role ONLY if the secret is valid.
 * - If secret is missing, wrong, or mismatched, returns an HTTP 403 response
 *   with a minimal, generic "Direct access not allowed" message.
 */
export function verifyGatewayRequest(
  request: Request,
  expectedSecretOverride?: string
): GatewayAuthResult {
  const expectedSecret =
    expectedSecretOverride ?? process.env.GATEWAY_SHARED_SECRET ?? "";

  const providedSecret = request.headers.get("x-gateway-secret");

  if (!verifyGatewaySecret(providedSecret, expectedSecret)) {
    return {
      ok: false,
      response: new Response("Direct access not allowed", {
        status: 403,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      }),
    };
  }

  const userId = request.headers.get("x-gateway-user-id") || "anonymous";
  const role = request.headers.get("x-gateway-user-role") || "unknown";

  return {
    ok: true,
    userId,
    role,
  };
}

/**
 * Builds gateway links of the form `/apps/<app>/<path>`.
 *
 * IMPORTANT: Every link and form action within the protected dummy pages
 * MUST use this helper to ensure traffic is routed through the gateway,
 * as the gateway reverse proxy does NOT rewrite HTML bodies.
 *
 * Rules:
 * - Normalizes app and path.
 * - Handles leading, trailing, and duplicate slashes.
 * - Guarantees the resulting path NEVER starts with `/dummy`.
 */
export function gatewayHref(app: string, path: string = ""): string {
  const cleanApp = app.replace(/^\/+|\/+$/g, "").trim().toLowerCase();

  if (!cleanApp) {
    throw new Error("gatewayHref: app parameter is required");
  }

  if (cleanApp.startsWith("dummy")) {
    throw new Error("gatewayHref: destination must target /apps, never /dummy");
  }

  let cleanPath = path.trim().replace(/^\/+/, "");
  cleanPath = cleanPath.replace(/\/+/g, "/");
  cleanPath = cleanPath.replace(/\/+$/, "");

  if (cleanPath.startsWith("dummy")) {
    throw new Error("gatewayHref: path segment must not target /dummy");
  }

  if (!cleanPath) {
    return `/apps/${cleanApp}`;
  }

  return `/apps/${cleanApp}/${cleanPath}`;
}
