/**
 * Admin Policy Editor (Stub for Step 8 Part B)
 *
 * Route Pattern: /admin/policies
 * Purpose:
 * Admin dashboard view allowing administrators to create, reorder (prioritize),
 * edit, enable/disable, and delete access control policies.
 * Enforces Zod schema validation before saving policies to PostgreSQL.
 *
 * NOTE: Part B will implement full CRUD policy builder and simulator.
 */

import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link } from "react-router";
import { requireAdmin } from "../lib/adminAuth.server";

export const meta: MetaFunction = () => {
  return [{ title: "GateShield - Policy Editor" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);
  return null;
}

export default function AdminPolicies() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Policy Management</h1>
          <p className="text-xs text-slate-400">
            Define, prioritize, and simulate access control policies for protected applications.
          </p>
        </div>
        <Link
          to="/admin"
          className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
        >
          ← Overview
        </Link>
      </div>

      <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-2xl font-mono border border-slate-700">
          ⚖️
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-white">Policy Editor (Step 8 Part B)</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Visual policy builder with condition rules (role, device posture, location, time-of-day, auth freshness),
            priority ordering, and dry-run policy simulation will be implemented in Step 8 Part B.
          </p>
        </div>
        <div className="pt-2">
          <span className="inline-block px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
            Scheduled for Step 8 Part B
          </span>
        </div>
      </div>
    </div>
  );
}
