import type { MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { isEnvConfigured } from "../lib/env.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Zero Trust Gateway (ztgate)" },
    {
      name: "description",
      content:
        "A mini zero trust access gateway evaluating identity, device posture, location, and time before proxying traffic.",
    },
  ];
};

export async function loader() {
  return {
    dbConfigured: isEnvConfigured(),
  };
}

export default function Index() {
  const { dbConfigured } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/30">
            ZT
          </div>
          <div>
            <h1 className="text-base font-semibold text-white tracking-tight">Zero Trust Gateway</h1>
            <p className="text-xs text-slate-400 font-mono">ztgate</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700">
            Skeleton Milestone
          </span>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${
              dbConfigured
                ? "bg-emerald-950 text-emerald-300 border border-emerald-700/50"
                : "bg-amber-950 text-amber-300 border border-amber-700/50"
            }`}
          >
            {dbConfigured ? "Database Configured" : "DB Keys Pending (.env)"}
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="space-y-6 text-center sm:text-left">
          <div className="inline-block px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-mono font-medium border border-emerald-500/20">
            Portfolio Project • Target: Zscaler Internship
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Mini Zero Trust Access Gateway
          </h2>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed">
            A reverse proxy that verifies identity, device posture, location, and time on every single request
            prior to evaluating access policies and proxying upstream traffic.
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
            <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
              <div className="text-emerald-400 text-xs font-mono font-bold uppercase mb-1">01 / Engine</div>
              <h3 className="font-semibold text-white text-sm mb-1">Pure Policy Engine</h3>
              <p className="text-xs text-slate-400">
                Default-deny and fail-closed evaluator with deterministic condition matching.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
              <div className="text-emerald-400 text-xs font-mono font-bold uppercase mb-1">02 / Gateway</div>
              <h3 className="font-semibold text-white text-sm mb-1">Context Reverse Proxy</h3>
              <p className="text-xs text-slate-400">
                Inspects posture and credentials, logs audit records, forwards with shared secret.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
              <div className="text-emerald-400 text-xs font-mono font-bold uppercase mb-1">03 / Auditing</div>
              <h3 className="font-semibold text-white text-sm mb-1">Immutable Trail</h3>
              <p className="text-xs text-slate-400">
                Every access decision is logged with explicit matched policy and rationale.
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap gap-3">
            <Link
              to="/admin/logs"
              className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              Audit Logs (Stub)
            </Link>
            <Link
              to="/admin/policies"
              className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              Policy Editor (Stub)
            </Link>
            <Link
              to="/health"
              className="px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              Health Probe
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 px-6 py-4 text-center text-xs text-slate-500 font-mono">
        Zero Trust Gateway • Work in Progress
      </footer>
    </div>
  );
}
