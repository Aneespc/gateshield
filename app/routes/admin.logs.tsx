import { useEffect, useState } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import {
  Form,
  Link,
  useLoaderData,
  useRevalidator,
  useSearchParams,
} from "react-router";
import { requireAdmin } from "../lib/adminAuth.server";
import { maskIp } from "../lib/admin/helpers";
import {
  getAuditLogsTable,
  getFilterOptions,
  type EnrichedAuditLog,
} from "../lib/admin/queries.server";
import { AuditLogFilterSchema } from "../lib/admin/schemas";

export const meta: MetaFunction = () => {
  return [{ title: "GateShield - Audit Log Viewer" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const url = new URL(request.url);
  const rawParams = Object.fromEntries(url.searchParams.entries());
  const filters = AuditLogFilterSchema.parse(rawParams);

  const [{ logs, totalCount, page, pageSize, totalPages }, { apps, users }] =
    await Promise.all([
      getAuditLogsTable(filters, 25),
      getFilterOptions(),
    ]);

  return {
    logs,
    totalCount,
    page,
    pageSize,
    totalPages,
    filters,
    options: {
      apps,
      users,
    },
  };
}

export default function AdminLogsPage() {
  const { logs, totalCount, page, totalPages, filters, options } =
    useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const revalidator = useRevalidator();

  const [isLive, setIsLive] = useState(false);
  const [selectedLog, setSelectedLog] = useState<EnrichedAuditLog | null>(null);

  // Live Auto-Refresh (revalidates every 5s when active)
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      revalidator.revalidate();
    }, 5000);
    return () => clearInterval(interval);
  }, [isLive, revalidator]);

  // Construct pagination links helper
  const createPageLink = (targetPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(targetPage));
    return `?${params.toString()}`;
  };

  // Export URL helper
  const exportUrl = `/admin/logs/export?${searchParams.toString()}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Perimeter Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Server-side paginated, tamper-evident record of all GateShield access decisions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live 5s Toggle */}
          <button
            type="button"
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition ${
              isLive
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/80 shadow-sm"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
            }`}
            title="Auto-refresh audit logs every 5 seconds"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLive ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
              }`}
            />
            <span>Live: {isLive ? "ON (5s)" : "OFF"}</span>
          </button>

          {/* Export CSV Button */}
          <a
            href={exportUrl}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 transition shadow-sm"
            title="Download up to 5,000 filtered audit log entries as CSV"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Filter Bar */}
      <Form
        method="get"
        className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Decision Filter */}
          <div>
            <label
              htmlFor="decision"
              className="block text-[11px] font-mono text-slate-400 mb-1"
            >
              Decision
            </label>
            <select
              id="decision"
              name="decision"
              defaultValue={filters.decision}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Decisions</option>
              <option value="ALLOW">ALLOW</option>
              <option value="DENY">DENY</option>
              <option value="STEP_UP">STEP_UP</option>
            </select>
          </div>

          {/* App Filter */}
          <div>
            <label
              htmlFor="app"
              className="block text-[11px] font-mono text-slate-400 mb-1"
            >
              Application
            </label>
            <select
              id="app"
              name="app"
              defaultValue={filters.app}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Applications</option>
              {options.apps.map((a) => (
                <option key={a.id} value={a.slug}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div>
            <label
              htmlFor="user"
              className="block text-[11px] font-mono text-slate-400 mb-1"
            >
              User
            </label>
            <select
              id="user"
              name="user"
              defaultValue={filters.user}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Users</option>
              <option value="anonymous">Anonymous (Unauthenticated)</option>
              {options.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label
              htmlFor="from"
              className="block text-[11px] font-mono text-slate-400 mb-1"
            >
              From Date
            </label>
            <input
              type="date"
              id="from"
              name="from"
              defaultValue={filters.from ? filters.from.slice(0, 10) : ""}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label
              htmlFor="to"
              className="block text-[11px] font-mono text-slate-400 mb-1"
            >
              To Date
            </label>
            <input
              type="date"
              id="to"
              name="to"
              defaultValue={filters.to ? filters.to.slice(0, 10) : ""}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Path Search */}
          <div>
            <label
              htmlFor="q"
              className="block text-[11px] font-mono text-slate-400 mb-1"
            >
              Path Query
            </label>
            <input
              type="text"
              id="q"
              name="q"
              placeholder="/apps/..."
              defaultValue={filters.q || ""}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
          <span className="text-[11px] text-slate-400 font-mono">
            Showing {logs.length} of {totalCount} matching records
          </span>

          <div className="flex items-center gap-2">
            <Link
              to="/admin/logs"
              className="px-3 py-1 rounded text-xs text-slate-400 hover:text-slate-200 transition"
            >
              Reset Filters
            </Link>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-sm"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </Form>

      {/* Audit Log Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="p-3 pl-4">Timestamp</th>
                <th className="p-3">User &amp; Role</th>
                <th className="p-3">Application</th>
                <th className="p-3">Method &amp; Path</th>
                <th className="p-3">Decision</th>
                <th className="p-3">Matched Policy</th>
                <th className="p-3 pr-4">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-12 text-center text-slate-500 text-xs"
                  >
                    No audit records match the selected filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const date = new Date(log.createdAt);
                  const timeStr = date.toLocaleTimeString("en-US", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    timeZone: "UTC",
                  });
                  const dateStr = date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  });

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-800/40 transition cursor-pointer group"
                    >
                      {/* Timestamp */}
                      <td className="p-3 pl-4 font-mono text-slate-300 text-[11px] whitespace-nowrap">
                        <span>{dateStr}</span>{" "}
                        <span className="text-slate-500">{timeStr} UTC</span>
                      </td>

                      {/* User & Role */}
                      <td className="p-3">
                        <div className="font-semibold text-white truncate max-w-[140px]">
                          {log.userName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono uppercase">
                          {log.userRole || "no role"}
                        </div>
                      </td>

                      {/* App */}
                      <td className="p-3 text-slate-300 font-medium whitespace-nowrap">
                        {log.appName}
                      </td>

                      {/* Method + Path */}
                      <td className="p-3 font-mono text-[11px]">
                        <span className="text-slate-400 font-bold mr-1.5">
                          {log.method}
                        </span>
                        <span className="text-slate-200 truncate max-w-[180px] inline-block align-bottom">
                          {log.path}
                        </span>
                      </td>

                      {/* Decision Badge */}
                      <td className="p-3 whitespace-nowrap">
                        {log.decision === "ALLOW" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                            ALLOW
                          </span>
                        )}
                        {log.decision === "DENY" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-950/80 text-rose-300 border border-rose-800">
                            DENY
                          </span>
                        )}
                        {log.decision === "STEP_UP" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-950/80 text-amber-300 border border-amber-800">
                            STEP_UP
                          </span>
                        )}
                      </td>

                      {/* Matched Policy */}
                      <td className="p-3 text-slate-300 truncate max-w-[180px]">
                        {log.policyName}
                      </td>

                      {/* Reason */}
                      <td
                        className="p-3 pr-4 text-slate-400 truncate max-w-xs"
                        title={log.reason}
                      >
                        {log.reason}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-mono">
              Page {page} of {totalPages}
            </span>

            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  to={createPageLink(page - 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  ← Previous
                </Link>
              ) : (
                <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-600 border border-slate-800/80 cursor-not-allowed select-none">
                  ← Previous
                </span>
              )}

              {page < totalPages ? (
                <Link
                  to={createPageLink(page + 1)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  Next →
                </Link>
              ) : (
                <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-600 border border-slate-800/80 cursor-not-allowed select-none">
                  Next →
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Row Detail Drawer (Slide-Over Panel) */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-150">
          <div
            className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full p-6 overflow-y-auto space-y-6 shadow-2xl flex flex-col justify-between"
            role="dialog"
            aria-modal="true"
          >
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Audit Log Inspection
                  </div>
                  <h2 className="text-lg font-bold text-white font-mono break-all mt-0.5">
                    {selectedLog.id}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition text-lg"
                  title="Close inspection panel"
                >
                  ✕
                </button>
              </div>

              {/* Core Fields Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">
                    Decision
                  </span>
                  <span
                    className={`font-bold ${
                      selectedLog.decision === "ALLOW"
                        ? "text-emerald-400"
                        : selectedLog.decision === "DENY"
                        ? "text-rose-400"
                        : "text-amber-400"
                    }`}
                  >
                    {selectedLog.decision}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">
                    Timestamp
                  </span>
                  <span className="text-white">
                    {new Date(selectedLog.createdAt).toISOString()}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">
                    User Identity
                  </span>
                  <span className="text-white font-semibold block truncate">
                    {selectedLog.userName}
                  </span>
                  <span className="text-slate-400 text-[11px] block truncate">
                    Role: {selectedLog.userRole || "-"}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">
                    Application
                  </span>
                  <span className="text-white font-semibold block truncate">
                    {selectedLog.appName}
                  </span>
                  {selectedLog.appSlug && (
                    <span className="text-slate-400 text-[11px] block">
                      /apps/{selectedLog.appSlug}
                    </span>
                  )}
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">
                    Client IP (Masked)
                  </span>
                  <span className="text-white">
                    {maskIp(selectedLog.ipAddress)}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">
                    Geo Country
                  </span>
                  <span className="text-white">
                    {selectedLog.country || "None (Unspecified)"}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">
                    Device Posture
                  </span>
                  <span
                    className={
                      selectedLog.deviceSecure
                        ? "text-emerald-400 font-bold"
                        : "text-rose-400 font-bold"
                    }
                  >
                    {selectedLog.deviceSecure === null
                      ? "-"
                      : selectedLog.deviceSecure
                      ? "SECURE (COMPLIANT)"
                      : "INSECURE"}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase">
                    HTTP Request
                  </span>
                  <span className="text-white">
                    {selectedLog.method} {selectedLog.path}
                  </span>
                </div>
              </div>

              {/* Policy Evaluation Details */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="text-[10px] font-mono text-slate-500 uppercase">
                  Policy Enforcement
                </div>
                <div className="font-semibold text-white">
                  Matched Policy:{" "}
                  <span className="text-emerald-400">
                    {selectedLog.policyName}
                  </span>
                </div>
                {selectedLog.matchedPolicyId && (
                  <div className="text-[11px] font-mono text-slate-400">
                    Policy ID: {selectedLog.matchedPolicyId}
                  </div>
                )}
                <div className="text-slate-300 pt-1 leading-relaxed border-t border-slate-800/60 mt-1">
                  <strong className="text-slate-400">Decision Rationale:</strong>{" "}
                  {selectedLog.reason}
                </div>
              </div>

              {/* Context Snapshot JSON */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    Context Snapshot (Deterministic State)
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    application/json
                  </span>
                </div>
                <pre className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-72 leading-relaxed">
                  <code>
                    {JSON.stringify(selectedLog.contextSnapshot, null, 2)}
                  </code>
                </pre>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
