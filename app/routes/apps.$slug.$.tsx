/**
 * Gateway Reverse Proxy Route (Stub)
 *
 * Route Pattern: /apps/:slug/*
 * Purpose:
 * Intercepts incoming requests addressed to a protected upstream application.
 * Performs end-to-end zero trust verification:
 * 1. Resolves ProtectedApp by slug.
 * 2. Builds RequestContext (identity, device posture, geo-location, method, path).
 * 3. Fetches app-specific + global policies.
 * 4. Executes pure policy engine evaluate(context, policies).
 * 5. Writes immutable AuditLog with decision and reason.
 * 6. Enforces action:
 *    - ALLOW: forward to upstream via forwardToUpstream().
 *    - DENY: return 403 Forbidden with explanation.
 *    - STEP_UP: redirect to re-authentication / MFA challenge.
 *
 * TODO (Step 5):
 * - Implement full request context builder and upstream forwarding.
 * - Wire audit logging.
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";

export async function loader({ params }: LoaderFunctionArgs) {
  const { slug } = params;

  return Response.json({
    status: "gateway_stub",
    message: `Gateway route stub for app '${slug}'. Interception and proxying will be implemented in Step 5.`,
    slug,
  });
}

export async function action({ params }: ActionFunctionArgs) {
  const { slug } = params;

  return Response.json({
    status: "gateway_stub",
    message: `Gateway route action stub for app '${slug}'.`,
    slug,
  });
}

export default function GatewayStub() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex items-center justify-center font-sans">
      <div className="max-w-md p-6 bg-slate-900 rounded-lg border border-slate-800 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto text-lg font-bold">
          🛡️
        </div>
        <h2 className="text-lg font-bold text-white">Gateway Interceptor Stub</h2>
        <p className="text-xs text-slate-400">
          This route will inspect posture, evaluate access policies, log audit trails, and proxy traffic to upstream apps.
        </p>
        <div className="pt-2">
          <span className="inline-block px-2.5 py-1 text-xs font-mono bg-slate-800 text-slate-300 rounded border border-slate-700">
            TODO: Step 5 Implementation
          </span>
        </div>
      </div>
    </div>
  );
}
