/**
 * Upstream Proxy Forwarder (Stub)
 *
 * Purpose:
 * Dispatches verified ALLOW requests to the configured upstream application URL.
 * Injects `x-gateway-secret` containing GATEWAY_SHARED_SECRET to prevent direct bypass,
 * and strips/translates path prefixes as configured.
 *
 * TODO (Step 5):
 * - Inject shared secret header `x-gateway-secret`.
 * - Stream request body and preserve query params/headers.
 * - Relay upstream HTTP response back to the client.
 */

export interface ForwardOptions {
  upstreamBaseUrl: string;
  pathPrefix: string;
}

export async function forwardToUpstream(
  _request: Request,
  _options: ForwardOptions
): Promise<Response> {
  // Stub implementation for skeleton milestone
  return new Response("Gateway proxy forwarder stub: not implemented yet.", {
    status: 501,
    headers: { "Content-Type": "text/plain" },
  });
}
