import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { Form, Link, redirect, useActionData, useLoaderData, useSearchParams } from "react-router";

export const meta: MetaFunction = () => {
  return [{ title: "GateShield - Verification Required" }];
};
import { Header } from "../components/Header";
import { getEnv } from "../lib/env.server";
import { verifyGatewaySecret } from "../lib/gateway/verifySecret.server";
import {
  commitSession,
  computeAuthAgeMinutes,
  getSession,
  getSessionUser,
  sanitizeReturnTo,
} from "../lib/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const returnTo = sanitizeReturnTo(url.searchParams.get("returnTo"));
  const sessionUser = await getSessionUser(request);

  if (!sessionUser) {
    return redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const session = await getSession(request.headers.get("Cookie"));
  const attempts = session.get("reauthAttempts") ?? 0;
  const env = getEnv();

  const authAgeMinutes = computeAuthAgeMinutes(sessionUser.authenticatedAt, new Date());

  return {
    user: sessionUser,
    authAgeMinutes,
    isDemoMode: env.DEMO_MODE,
    stepUpCodeHint: env.DEMO_MODE ? env.DEMO_STEP_UP_CODE : undefined,
    attempts,
    isLockedOut: attempts >= 5,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const sessionUser = await getSessionUser(request);
  const formData = await request.formData();
  const returnTo = sanitizeReturnTo(formData.get("returnTo")?.toString());

  if (!sessionUser) {
    return redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const currentAttempts = session.get("reauthAttempts") ?? 0;
  if (currentAttempts >= 5) {
    return {
      error: "Too many failed verification attempts. Please log in again to reset your session.",
      isLockedOut: true,
    };
  }

  const code = formData.get("code")?.toString()?.trim() || "";
  const env = getEnv();
  const expectedCode = env.DEMO_STEP_UP_CODE;

  const isCorrect = verifyGatewaySecret(code, expectedCode);

  if (!isCorrect) {
    const nextAttempts = currentAttempts + 1;
    session.set("reauthAttempts", nextAttempts);

    return {
      error:
        nextAttempts >= 5
          ? "Too many failed verification attempts. Please log in again to reset your session."
          : `Invalid verification code. Attempts remaining: ${5 - nextAttempts}.`,
      isLockedOut: nextAttempts >= 5,
      headers: {
        "Set-Cookie": await commitSession(session),
        "Cache-Control": "no-store",
      },
    };
  }

  // Verification successful: reset auth timestamp to now and clear attempt count
  session.set("authenticatedAt", new Date().toISOString());
  session.set("reauthAttempts", 0);

  return redirect(returnTo, {
    headers: {
      "Set-Cookie": await commitSession(session),
      "Cache-Control": "no-store",
    },
  });
}

export default function ReauthPage() {
  const { user, authAgeMinutes, isDemoMode, stepUpCodeHint, isLockedOut } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<{ error?: string; isLockedOut?: boolean }>();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  const locked = isLockedOut || Boolean(actionData?.isLockedOut);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header currentUser={user} authAgeMinutes={authAgeMinutes} />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto text-xl font-bold border border-amber-500/20">
              🔐
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Extra verification required.
            </h1>
            <p className="text-xs text-slate-400">
              The policy for this protected application requires a fresh step-up authentication challenge.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">User:</span>
              <span className="text-white font-bold">{user.userId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Role:</span>
              <span className="text-emerald-400 font-bold uppercase">{user.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Auth Age:</span>
              <span className="text-amber-400 font-bold">{authAgeMinutes ?? 0}m (Stale &gt; 15m)</span>
            </div>
          </div>

          {actionData?.error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-medium">
              ⚠️ {actionData.error}
            </div>
          )}

          {locked ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs leading-relaxed">
                Too many attempts. For security, your session must be re-established via full login.
              </div>
              <Link
                to={`/login?returnTo=${encodeURIComponent(returnTo)}`}
                className="block text-center py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition border border-slate-700"
              >
                Return to Login Page
              </Link>
            </div>
          ) : (
            <Form method="post" reloadDocument className="space-y-4">
              <input type="hidden" name="returnTo" value={returnTo} />

              <div>
                <label htmlFor="code" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Verification Code:
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  required
                  autoFocus
                  placeholder="Enter 6-digit code"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-base text-white font-mono tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                {isDemoMode && stepUpCodeHint && (
                  <p className="text-[11px] text-emerald-400/90 mt-1.5 flex items-center gap-1 font-mono">
                    <span>💡</span> Demo Hint: Use code <strong className="underline">{stepUpCodeHint}</strong>
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold tracking-wide transition shadow-md shadow-emerald-950/40"
              >
                Verify &amp; Continue
              </button>
            </Form>
          )}

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <Link to="/demo" className="text-slate-400 hover:text-white transition">
              ← Demo Console
            </Link>
            <Link to={`/login?returnTo=${encodeURIComponent(returnTo)}`} className="text-slate-400 hover:text-white transition">
              Switch Persona
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
