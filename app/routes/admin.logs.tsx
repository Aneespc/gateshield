/**
 * Admin Audit Log Viewer (Stub)
 *
 * Route Pattern: /admin/logs
 * Purpose:
 * Admin dashboard view displaying chronological audit logs of all access requests,
 * evaluating policy decisions (ALLOW, DENY, STEP_UP), matched policies, and context snapshots.
 *
 * TODO (Step 8):
 * - Implement searchable, filterable log table connected to Prisma `auditLog`.
 * - Include inspection modal for full context snapshots.
 */

import type { MetaFunction } from "react-router";
import { Link } from "react-router";

export const meta: MetaFunction = () => {
  return [{ title: "GateShield - Audit Log Viewer" }];
};

export default function AdminLogs() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Audit Log Viewer</h1>
            <p className="text-xs text-slate-400">
              Immutable record of GateShield access decisions and policy evaluations.
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
            📋
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-white">Audit Log Dashboard Stub</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Live audit logging viewer with filters by decision (ALLOW, DENY, STEP_UP), timestamp,
              and application will be implemented in Step 8.
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
