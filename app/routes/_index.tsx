import type { MetaFunction, LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { isEnvConfigured } from "../lib/env.server";
import { getSessionUser } from "../lib/session.server";

export const meta: MetaFunction = () => {
  return [
    { title: "GateShield" },
    {
      name: "description",
      content:
        "A zero-trust access gateway that evaluates every request against identity, device posture, location and time before it reaches your apps.",
    },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const sessionUser = await getSessionUser(request);
  return {
    dbConfigured: isEnvConfigured(),
    sessionUser,
  };
}

export default function Index() {
  const { dbConfigured, sessionUser } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/30">
            GS
          </div>
          <div>
            <h1 className="text-base font-semibold text-white tracking-tight">GateShield</h1>
            <p className="text-xs text-slate-400 font-mono">Zero Trust Access Gateway</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {sessionUser ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                👤 {sessionUser.role} ({sessionUser.userId})
              </span>
              <Link
                to="/demo"
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition"
              >
                Demo Console
              </Link>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="space-y-6 text-center sm:text-left">
          <div className="inline-block px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-mono font-medium border border-emerald-500/20">
            Zero Trust Architecture • Open Source
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            GateShield Access Gateway
          </h2>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed">
            A zero-trust access gateway that evaluates every request against identity, device posture, location and time before it reaches your apps.
          </p>

          {!dbConfigured && (
            <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-sm space-y-1">
              <p className="font-semibold text-amber-100 flex items-center gap-2">
                <span>⚠️</span> Database connection strings not set in .env
              </p>
              <p className="text-amber-300/90 text-xs">
                To connect Neon PostgreSQL, replace the placeholders in <code className="bg-amber-900/60 px-1 py-0.5 rounded">.env</code> and run <code className="bg-amber-900/60 px-1 py-0.5 rounded">npm run db:migrate</code> followed by <code className="bg-amber-900/60 px-1 py-0.5 rounded">npm run db:seed</code>.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-left">
            <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
              <div className="text-emerald-400 text-xs font-mono font-bold uppercase mb-1">01 / Engine</div>
              <h3 className="font-semibold text-white text-sm mb-1">Pure Policy Engine</h3>
              <p className="text-xs text-slate-400">
                Default-deny and fail-closed evaluator with auth age, posture, country, and time windows.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
              <div className="text-emerald-400 text-xs font-mono font-bold uppercase mb-1">02 / Gateway</div>
              <h3 className="font-semibold text-white text-sm mb-1">Context Reverse Proxy</h3>
              <p className="text-xs text-slate-400">
                Intercepts <code className="text-slate-300 font-mono">/apps/:slug/*</code>, logs audit records, redirects on step-up.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
              <div className="text-emerald-400 text-xs font-mono font-bold uppercase mb-1">03 / Demo Console</div>
              <h3 className="font-semibold text-white text-sm mb-1">Live Simulation</h3>
              <p className="text-xs text-slate-400">
                Switch postures, age session timestamp, and alter simulated geo-location on the fly.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
            >
              Sign In (Persona Selector)
            </Link>
            <Link
              to="/demo"
              className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              Demo Simulation Console
            </Link>
            <Link
              reloadDocument
              to="/apps/admin"
              className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              Test Admin App
            </Link>
            <Link
              reloadDocument
              to="/apps/finance"
              className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              Test Finance App
            </Link>
            <Link
              reloadDocument
              to="/apps/hr"
              className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              Test HR App
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 px-6 py-4 text-center text-xs text-slate-500 font-mono">
        GateShield • Zero Trust Access Gateway
      </footer>
    </div>
  );
}
