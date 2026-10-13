/**
 * Admin Policy Editor (Stub)
 *
 * Route Pattern: /admin/policies
 * Purpose:
 * Admin dashboard view allowing administrators to create, reorder (prioritize),
 * edit, enable/disable, and delete access control policies.
 * Enforces Zod schema validation before saving policies to PostgreSQL.
 *
 * TODO (Step 8):
 * - Implement policy management UI and CRUD action handlers.
 * - Add dry-run policy evaluation simulator.
 */

import type { MetaFunction } from "react-router";
import { Link } from "react-router";

export const meta: MetaFunction = () => {
  return [{ title: "GateShield - Policy Editor" }];
};

export default function AdminPolicies() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Policy Editor</h1>
            <p className="text-xs text-slate-400">
              Manage zero trust authorization policies and condition rules.
            </p>
          </div>
          <Link
            to="/"
            className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            ← Overview
          </Link>
        </div>

        <div className="p-8 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-xl font-mono">
            ⚖️
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-white">Policy Management Stub</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Visual policy builder with condition rules (role, device posture, location, time-of-day),
              priority ordering, and dry-run evaluation will be implemented in Step 8.
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-block px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
              TODO: Step 8 Implementation
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
