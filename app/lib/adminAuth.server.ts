import { redirect } from "react-router";
import { getSessionUser, type SessionData } from "./session.server";

// This dashboard is protected by the session role directly, not by the policy engine,
// so an editing mistake can never lock the admin out of the dashboard.

function renderForbiddenPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>403 Forbidden - GateShield</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background: #020617; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
    .card { background: #0f172a; border: 1px solid #1e293b; padding: 2rem; border-radius: 0.75rem; max-width: 28rem; width: 100%; text-align: center; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
    h1 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem; color: #f43f5e; }
    p { font-size: 0.875rem; color: #94a3b8; margin: 0.5rem 0 1.5rem; line-height: 1.5; }
    .btn { display: inline-block; padding: 0.5rem 1rem; background: #0284c7; color: #ffffff; text-decoration: none; border-radius: 0.375rem; font-size: 0.875rem; font-weight: 500; transition: background 0.15s ease; }
    .btn:hover { background: #0369a1; }
  </style>
</head>
<body>
  <div class="card">
    <h1>403 Forbidden</h1>
    <p>Administrator privileges are required to access the GateShield dashboard.</p>
    <a href="/demo" class="btn">Return to Demo Console →</a>
  </div>
</body>
</html>`;
}

/**
 * Enforces admin access for routes and actions.
 * - If no session exists: redirects to /login?returnTo=<current_path>
 * - If session role is not "admin": returns HTTP 403 Forbidden page with a link to /demo
 * - If session role is "admin": returns verified SessionData
 * - Fail closed: any runtime or parsing error defaults to 403 denial
 */
export async function requireAdmin(request: Request): Promise<SessionData> {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      const url = new URL(request.url);
      const returnTo = `${url.pathname}${url.search}`;
      throw redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }

    if (user.role !== "admin") {
      throw new Response(renderForbiddenPage(), {
        status: 403,
        statusText: "Forbidden",
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    return user;
  } catch (err) {
    // If the thrown error is already a redirect or 403 Response, rethrow it
    if (err instanceof Response) {
      throw err;
    }

    // Fail closed on any unexpected error
    throw new Response(renderForbiddenPage(), {
      status: 403,
      statusText: "Forbidden",
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}

/**
 * Validates that mutating requests originate from the same origin as the application.
 * Compares the Origin header (or Referer header if Origin is absent) to the request URL's origin.
 * Rejects if missing, mismatched, or invalid.
 */
export function assertSameOrigin(request: Request): boolean {
  try {
    const requestUrl = new URL(request.url);
    const expectedOrigin = requestUrl.origin;

    const originHeader = request.headers.get("origin");
    if (originHeader) {
      if (originHeader === expectedOrigin) {
        return true;
      }
      throw new Response("Forbidden: Cross-origin request rejected (Origin mismatch)", {
        status: 403,
        statusText: "Forbidden",
      });
    }

    const refererHeader = request.headers.get("referer");
    if (refererHeader) {
      const refererUrl = new URL(refererHeader);
      if (refererUrl.origin === expectedOrigin) {
        return true;
      }
      throw new Response("Forbidden: Cross-origin request rejected (Referer mismatch)", {
        status: 403,
        statusText: "Forbidden",
      });
    }

    // Missing both Origin and Referer
    throw new Response("Forbidden: Missing Origin or Referer header", {
      status: 403,
      statusText: "Forbidden",
    });
  } catch (err) {
    if (err instanceof Response) {
      throw err;
    }
    // Fail closed on any parse error
    throw new Response("Forbidden: Invalid request origin", {
      status: 403,
      statusText: "Forbidden",
    });
  }
}
