/**
 * Dummy Upstream Application Route (Placeholder)
 *
 * Route Pattern: /dummy/:app
 * Purpose:
 * Simulates internal upstream services (HR Portal, Finance Hub, Admin Console)
 * that the zero trust gateway proxies traffic to.
 *
 * In production or demo step 7:
 * Upstream applications will inspect the incoming request for `x-gateway-secret`
 * matching GATEWAY_SHARED_SECRET. Direct traffic bypassing the gateway will be rejected.
 *
 * TODO (Step 7):
 * - Implement simulated upstream application screens with bypass protection checks.
 */

import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";

export async function loader({ params }: LoaderFunctionArgs) {
  const appName = params.app?.toLowerCase() || "unknown";

  const appMeta: Record<string, { title: string; dept: string; description: string }> = {
    hr: {
      title: "HR Portal (Upstream Mock)",
      dept: "Human Resources",
      description: "Employee records, onboarding workflows, and benefits management.",
    },
    finance: {
      title: "Finance Hub (Upstream Mock)",
      dept: "Finance & Accounting",
      description: "Financial ledger, payroll reports, and budget allocation systems.",
    },
    admin: {
      title: "Admin Console (Upstream Mock)",
      dept: "System Administration",
      description: "Root infrastructure configurations and tenant settings.",
    },
  };

  const current = appMeta[appName] ?? {
    title: `${appName.toUpperCase()} App (Upstream Mock)`,
    dept: "Internal Application",
    description: "Mock upstream service.",
  };

  return { appName, current };
}

export default function DummyApp() {
  const { appName, current } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex items-center justify-center font-sans">
      <div className="max-w-lg w-full p-6 bg-slate-900 rounded-xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-base font-bold text-white">{current.title}</h2>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            /{appName}
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">{current.description}</p>

        <div className="p-3 bg-slate-950 rounded border border-slate-800/80 text-xs space-y-1">
          <div className="text-slate-400 font-medium">Bypass Protection Notice:</div>
          <p className="text-slate-500 text-[11px]">
            In step 7, this upstream application will require requests to include the{" "}
            <code className="text-emerald-400">x-gateway-secret</code> header to prevent direct access bypass.
          </p>
        </div>

        <div className="pt-2 flex justify-between items-center text-xs">
          <Link to="/" className="text-slate-400 hover:text-white transition">
            ← Back to Gateway Overview
          </Link>
          <span className="text-slate-600 font-mono">Mock Upstream Service</span>
        </div>
      </div>
    </div>
  );
}
