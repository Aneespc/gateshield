import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { writeAuditLog } from "../lib/audit/writeAuditLog";
import { prisma } from "../lib/db.server";
import { getEnv } from "../lib/env.server";
import { buildContext } from "../lib/gateway/buildContext";
import { forwardToUpstream } from "../lib/gateway/forward";
import { evaluate } from "../lib/policy-engine/evaluate";
import { getUserSession } from "../lib/session.server";

/**
 * Gateway Interceptor & Enforcement Route
 *
 * Route Pattern: /apps/:slug/*
 *
 * Request Flow:
 * 1. Look up ProtectedApp by slug.
 * 2. If unknown or disabled -> write AuditLog (DENY) and return 404.
 * 3. Extract verified session data and build RequestContext (pure function).
 * 4. Load enabled policies (app-specific + global) and evaluate() -> Decision.
 * 5. Log skipped policies if any.
 * 6. Write AuditLog -> MUST succeed before any forwarding (fail closed).
 * 7. Enforce Decision:
 *    - ALLOW: forwardToUpstream() with sanitized headers and shared secret.
 *    - DENY: 403 Generic "Access denied" with reference AuditLog ID.
 *    - STEP_UP: 302 Redirect to /login?returnTo=...
 *
 * Fail Closed: Entire pipeline wrapped in try/catch. Any failure results in non-forwarding.
 */

function renderAccessDeniedPage(referenceId: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Access Denied - GateShield</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background: #020617; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
    .card { background: #0f172a; border: 1px solid #1e293b; padding: 2rem; border-radius: 0.75rem; max-width: 28rem; width: 100%; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
    h1 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem; color: #f43f5e; }
    p { font-size: 0.875rem; color: #94a3b8; margin: 0.5rem 0; line-height: 1.5; }
    .ref { font-family: ui-monospace, monospace; font-size: 0.75rem; background: #020617; padding: 0.5rem 0.75rem; border-radius: 0.375rem; display: inline-block; color: #cbd5e1; border: 1px solid #334155; margin-top: 1rem; word-break: break-all; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Access denied</h1>
    <p>Your request was rejected by the gateway access policy.</p>
    <div class="ref">Reference ID: ${referenceId}</div>
    <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem; justify-content: center; font-size: 0.75rem;">
      <a href="/demo" style="color: #38bdf8; text-decoration: none;">Demo Console</a>
      <span style="color: #475569;">•</span>
      <a href="/login" style="color: #38bdf8; text-decoration: none;">Log In</a>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 403,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function handleGatewayRequest(
  request: Request,
  params: { slug?: string }
): Promise<Response> {
  const url = new URL(request.url);
  const slug = params.slug?.toLowerCase();

  try {
    const session = await getUserSession(request);

    // 1. Look up ProtectedApp
    let app = null;
    try {
      if (slug) {
        app = await prisma.protectedApp.findUnique({
          where: { slug },
        });
      }
    } catch (dbErr) {
      console.error("[GateShield] Database error looking up protected app:", dbErr);
      return new Response("Service Unavailable: Access gateway database error", {
        status: 503,
        headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
      });
    }

    // 2. Unknown or disabled app -> Audit log and 404
    if (!app || !app.enabled) {
      const { context, meta } = buildContext(request, session, null);
      try {
        await writeAuditLog({
          appId: null,
          userId: context.userId,
          userRole: context.role,
          path: context.path,
          method: context.method,
          ipAddress: meta.ipAddress,
          country: context.country,
          deviceSecure: context.deviceSecure,
          decision: "DENY",
          matchedPolicyId: null,
          reason: "Unknown or disabled app",
          context,
          skippedPolicies: 0,
        });
      } catch (auditErr) {
        console.error("[GateShield] Failed to record audit log for unknown app:", auditErr);
      }

      return new Response("Not Found: Protected application does not exist or is disabled", {
        status: 404,
        headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
      });
    }

    // 3. Build verified RequestContext
    const { context, meta } = buildContext(request, session, app);

    // 4. Fetch enabled policies (app-specific + global)
    let policies: unknown[] = [];
    try {
      policies = await prisma.policy.findMany({
        where: {
          OR: [{ appId: app.id }, { appId: null }],
          enabled: true,
        },
      });
    } catch (dbErr) {
      console.error("[GateShield] Database error loading policies:", dbErr);
      return new Response("Service Unavailable: Unable to load security policies", {
        status: 503,
        headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
      });
    }

    // 5. Evaluate policies via pure function engine
    const { decision, skipped } = evaluate(context, policies);

    if (skipped.length > 0) {
      console.warn(
        `[GateShield] Skipped ${skipped.length} invalid policies for app '${slug}':`,
        skipped
      );
    }

    // 6. Write AuditLog (FAIL CLOSED: must succeed before anything is forwarded)
    let auditLogId: string;
    try {
      auditLogId = await writeAuditLog({
        appId: app.id,
        userId: context.userId,
        userRole: context.role,
        path: context.path,
        method: context.method,
        ipAddress: meta.ipAddress,
        country: context.country,
        deviceSecure: context.deviceSecure,
        decision: decision.action,
        matchedPolicyId: decision.matchedPolicyId,
        reason: decision.reason,
        context,
        skippedPolicies: skipped.length,
        simulated: meta.simulated,
      });
    } catch (auditErr) {
      console.error("[GateShield] CRITICAL: Audit log failed to write. Failing closed.", auditErr);
      return new Response("Forbidden: Access denied due to audit trail failure", {
        status: 403,
        headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
      });
    }

    // 7. Enforce decision
    if (decision.action === "DENY") {
      return renderAccessDeniedPage(auditLogId);
    }

    if (decision.action === "STEP_UP") {
      const returnTo = `${url.pathname}${url.search}`;
      const targetUrl = session?.userId
        ? `/reauth?returnTo=${encodeURIComponent(returnTo)}`
        : `/login?returnTo=${encodeURIComponent(returnTo)}`;

      return new Response(null, {
        status: 302,
        headers: {
          Location: targetUrl,
          "Cache-Control": "no-store",
        },
      });
    }

    // Decision is ALLOW -> Forward to upstream
    const env = getEnv();
    return await forwardToUpstream(request, {
      upstreamBaseUrl: app.upstreamUrl,
      pathPrefix: app.pathPrefix,
      sharedSecret: env.GATEWAY_SHARED_SECRET,
      userId: context.userId,
      userRole: context.role,
      forwardedFor: meta.ipAddress,
    });
  } catch (fatalErr) {
    console.error("[GateShield] Fatal fail-closed unhandled exception:", fatalErr);
    return new Response("Internal Server Error: Gateway processing failed", {
      status: 500,
      headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
    });
  }
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  return handleGatewayRequest(request, params);
}

export async function action({ request, params }: ActionFunctionArgs) {
  return handleGatewayRequest(request, params);
}
