import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData, useSearchParams } from "react-router";
import { requireAdmin } from "../lib/adminAuth.server";
import { getOverviewData } from "../lib/admin/queries.server";
import { OverviewRangeSchema, type OverviewRange } from "../lib/admin/schemas";

export const meta: MetaFunction = () => {
  return [{ title: "GateShield - Admin Overview" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const url = new URL(request.url);
  const rangeParam = url.searchParams.get("range");
  const range: OverviewRange = OverviewRangeSchema.parse(rangeParam);

  const stats = await getOverviewData(range);
  return { stats, range };
}

export default function AdminOverviewPage() {
  const { stats, range } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();

  const maxBucketCount = Math.max(
    1,
    ...stats.timeBuckets.map((b) => b.total)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            System Overview &amp; Health
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time policy evaluation metrics, traffic patterns, and perimeter enforcement.
          </p>
        </div>

        {/* Time Range Pills */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 self-start sm:self-auto text-xs font-medium">
          <Link
            to="?range=1h"
            className={`px-3 py-1.5 rounded-md transition ${
              range === "1h"
                ? "bg-emerald-600 text-white shadow-sm font-semibold"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            Last 1 hour
          </Link>
          <Link
            to="?range=24h"
            className={`px-3 py-1.5 rounded-md transition ${
              range === "24h"
                ? "bg-emerald-600 text-white shadow-sm font-semibold"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            Last 24 hours
          </Link>
          <Link
            to="?range=7d"
            className={`px-3 py-1.5 rounded-md transition ${
              range === "7d"
                ? "bg-emerald-600 text-white shadow-sm font-semibold"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            Last 7 days
          </Link>
        </div>
      </div>

      {/* 5 Core Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
            Total Requests
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {stats.totalRequests.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">Evaluated by gateway</div>
        </div>

        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
            Allowed
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {stats.allowedRequests.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">
            {stats.totalRequests > 0
              ? `${Math.round((stats.allowedRequests / stats.totalRequests) * 100)}% of traffic`
              : "No requests"}
          </div>
        </div>

        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-rose-400">
            Denied (Blocked)
          </div>
          <div className="text-2xl font-extrabold text-rose-400 font-mono">
            {stats.deniedRequests.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">
            {stats.totalRequests > 0
              ? `${Math.round((stats.deniedRequests / stats.totalRequests) * 100)}% of traffic`
              : "No denials"}
          </div>
        </div>

        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
            Step-Up Challenges
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono">
            {stats.stepUpRequests.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">Auth refresh required</div>
        </div>

        <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-1 col-span-2 lg:col-span-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-sky-400">
            Unique Users
          </div>
          <div className="text-2xl font-extrabold text-sky-400 font-mono">
            {stats.uniqueUsers.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500">Authenticated identities</div>
        </div>
      </div>

      {/* Requests Over Time Bar Chart */}
      <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Requests Over Time
            </h2>
            <p className="text-xs text-slate-400">
              {range === "1h"
                ? "5-minute bucket intervals over the last hour"
                : range === "24h"
                ? "Hourly bucket intervals over the last 24 hours"
                : "Hourly request distribution across the last 7 days"}
            </p>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              ALLOW
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
              DENY
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              STEP_UP
            </span>
          </div>
        </div>

        {stats.totalRequests === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-6 bg-slate-950/50 rounded-xl border border-slate-800/80">
            <span className="text-2xl mb-1">📉</span>
            <span className="text-xs font-medium text-slate-300">
              No gateway requests in this time window
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">
              Generate traffic through the demo console or test applications to view live trends.
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {/* SVG Stacked Bar Chart */}
            <div className="h-48 w-full">
              <svg
                viewBox="0 0 1000 200"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                {/* Horizontal reference lines */}
                <line
                  x1="0"
                  y1="20"
                  x2="1000"
                  y2="20"
                  stroke="#334155"
                  strokeWidth="0.5"
                  strokeDasharray="4 4"
                />
                <line
                  x1="0"
                  y1="100"
                  x2="1000"
                  y2="100"
                  stroke="#334155"
                  strokeWidth="0.5"
                  strokeDasharray="4 4"
                />
                <line
                  x1="0"
                  y1="180"
                  x2="1000"
                  y2="180"
                  stroke="#475569"
                  strokeWidth="1"
                />

                {/* Bars */}
                {stats.timeBuckets.map((bucket, idx) => {
                  const numBuckets = stats.timeBuckets.length;
                  const slotWidth = 1000 / numBuckets;
                  const barWidth = Math.max(2, slotWidth * 0.7);
                  const x = idx * slotWidth + (slotWidth - barWidth) / 2;

                  const chartHeight = 160; // Max bar height from y=180 up to y=20
                  const baseY = 180;

                  const allowH = (bucket.allow / maxBucketCount) * chartHeight;
                  const denyH = (bucket.deny / maxBucketCount) * chartHeight;
                  const stepUpH = (bucket.stepUp / maxBucketCount) * chartHeight;

                  const allowY = baseY - allowH;
                  const denyY = allowY - denyH;
                  const stepUpY = denyY - stepUpH;

                  return (
                    <g key={idx}>
                      <title>{`${bucket.label}: Total ${bucket.total} (Allow: ${bucket.allow}, Deny: ${bucket.deny}, Step-Up: ${bucket.stepUp})`}</title>

                      {/* Ghost background column for hover hit area */}
                      <rect
                        x={idx * slotWidth}
                        y={0}
                        width={slotWidth}
                        height={200}
                        fill="transparent"
                        className="hover:fill-slate-800/30 transition-colors cursor-pointer"
                      />

                      {/* ALLOW (Emerald) */}
                      {bucket.allow > 0 && (
                        <rect
                          x={x}
                          y={allowY}
                          width={barWidth}
                          height={allowH}
                          fill="#10b981"
                          rx={bucket.deny === 0 && bucket.stepUp === 0 ? 1.5 : 0}
                        />
                      )}

                      {/* DENY (Rose) */}
                      {bucket.deny > 0 && (
                        <rect
                          x={x}
                          y={denyY}
                          width={barWidth}
                          height={denyH}
                          fill="#f43f5e"
                          rx={bucket.stepUp === 0 ? 1.5 : 0}
                        />
                      )}

                      {/* STEP_UP (Amber) */}
                      {bucket.stepUp > 0 && (
                        <rect
                          x={x}
                          y={stepUpY}
                          width={barWidth}
                          height={stepUpH}
                          fill="#f59e0b"
                          rx={1.5}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* X-Axis Labels */}
            <div className="flex justify-between text-[10px] text-slate-500 font-mono px-1">
              <span>{stats.timeBuckets[0]?.label || "Start"}</span>
              {stats.timeBuckets.length > 2 && (
                <span>
                  {stats.timeBuckets[Math.floor(stats.timeBuckets.length / 2)]?.label}
                </span>
              )}
              <span>
                {stats.timeBuckets[stats.timeBuckets.length - 1]?.label || "Now"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Grid: Top Blocked Users, Most Denied Apps, Top Matched Policies */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Top Blocked Users */}
        <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>🚫</span> Top Blocked Users
            </h2>
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              By Deny Count
            </span>
          </div>

          {stats.topBlockedUsers.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No blocked users in this range.
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.topBlockedUsers.map((user, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 text-xs"
                >
                  <div className="truncate mr-2">
                    <div className="font-semibold text-white truncate">
                      {user.displayName}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">
                      {user.email || user.userId || "anonymous"}
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-800 text-[11px]">
                    {user.count} denied
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Most Denied Apps */}
        <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>🏢</span> Most Denied Apps
            </h2>
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              By Deny Count
            </span>
          </div>

          {stats.mostDeniedApps.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No application denials in this range.
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.mostDeniedApps.map((app, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 text-xs"
                >
                  <div className="truncate mr-2">
                    <div className="font-semibold text-white truncate">
                      {app.appName}
                    </div>
                    {app.slug && (
                      <div className="text-[11px] text-slate-400 font-mono">
                        /apps/{app.slug}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-800 text-[11px]">
                    {app.count} denied
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Matched Policies */}
        <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>⚖️</span> Top Matched Policies
            </h2>
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              Evaluations
            </span>
          </div>

          {stats.topMatchedPolicies.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No policy evaluations recorded.
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.topMatchedPolicies.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 text-xs"
                >
                  <div className="truncate mr-2">
                    <div className="font-semibold text-white truncate">
                      {p.policyName}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {p.policyId ? `ID: ${p.policyId}` : "Perimeter Fallback"}
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                    {p.count} hits
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
