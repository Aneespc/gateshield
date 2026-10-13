import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { Form, Link, redirect, useLoaderData } from "react-router";

export const meta: MetaFunction = () => {
  return [{ title: "GateShield - Demo Console" }];
};
import { Header } from "../components/Header";
import { prisma } from "../lib/db.server";
import { getEnv } from "../lib/env.server";
import {
  ALLOWED_DEMO_COUNTRIES,
  DemoConsoleActionSchema,
} from "../lib/gateway/demoSchemas";
import {
  authenticatedAtFromAge,
  commitSession,
  computeAuthAgeMinutes,
  getSession,
  getSessionUser,
} from "../lib/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const env = getEnv();
  const currentUser = await getSessionUser(request);
  const authAgeMinutes = currentUser
    ? computeAuthAgeMinutes(currentUser.authenticatedAt, new Date())
    : undefined;

  let recentLogs: {
    id: string;
    createdAt: string;
    appName: string;
    path: string;
    decision: string;
    reason: string;
  }[] = [];

  if (currentUser?.userId) {
    try {
      const logs = await prisma.auditLog.findMany({
        where: { userId: currentUser.userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          createdAt: true,
          path: true,
          decision: true,
          reason: true,
          app: {
            select: { name: true, slug: true },
          },
        },
      });

      recentLogs = logs.map((l) => ({
        id: l.id,
        createdAt: l.createdAt.toISOString(),
        appName: l.app?.name || "Global / Unknown",
        path: l.path,
        decision: l.decision,
        reason: l.reason,
      }));
    } catch {
      // If DB is unmigrated or unreachable, gracefully provide empty list
    }
  }

  return {
    currentUser,
    authAgeMinutes,
    authenticatedAt: currentUser?.authenticatedAt,
    demoMode: env.DEMO_MODE,
    recentLogs,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const env = getEnv();
  const session = await getSession(request.headers.get("Cookie"));
  const formData = await request.formData();

  const rawData: Record<string, unknown> = {};
  for (const [key, val] of formData.entries()) {
    rawData[key] = val;
  }

  const parsed = DemoConsoleActionSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const actionData = parsed.data;

  // Enforce server-side rejection if simulation controls called while DEMO_MODE is false
  if (
    !env.DEMO_MODE &&
    (actionData.intent === "setCountry" ||
      actionData.intent === "setTime" ||
      actionData.intent === "ageLogin" ||
      actionData.intent === "setLoginAge")
  ) {
    return new Response(
      "Forbidden: Simulation controls are rejected server-side when DEMO_MODE is false",
      { status: 403 }
    );
  }

  switch (actionData.intent) {
    case "toggleDevicePosture": {
      const current = session.get("deviceSecure") ?? false;
      session.set("deviceSecure", !current);
      break;
    }

    case "setCountry": {
      const countryVal = actionData.country === "NONE" ? undefined : actionData.country;
      session.set("simulatedCountry", countryVal);
      break;
    }

    case "setTime": {
      const timeVal = actionData.time === "NONE" ? undefined : actionData.time;
      session.set("simulatedTime", timeVal);
      break;
    }

    case "setLoginAge":
    case "ageLogin": {
      const minutes = actionData.ageMinutes ?? 20;
      session.set("authenticatedAt", authenticatedAtFromAge(minutes, new Date()));
      break;
    }
  }

  return redirect("/demo", {
    headers: {
      "Set-Cookie": await commitSession(session),
      "Cache-Control": "no-store",
    },
  });
}

export default function DemoConsole() {
  const { currentUser, authAgeMinutes, authenticatedAt, demoMode, recentLogs } = useLoaderData<typeof loader>();
  const [ageMinutesInput, setAgeMinutesInput] = useState<number | string>(20);
  const [liveAuthAge, setLiveAuthAge] = useState<number | undefined>(authAgeMinutes);

  useEffect(() => {
    if (!authenticatedAt) {
      setLiveAuthAge(undefined);
      return;
    }

    const updateAge = () => {
      const authTime = new Date(authenticatedAt).getTime();
      if (isNaN(authTime)) {
        setLiveAuthAge(undefined);
        return;
      }
      const diffMs = Date.now() - authTime;
      setLiveAuthAge(diffMs < 0 ? 0 : Math.floor(diffMs / 60000));
    };

    updateAge();
    const interval = setInterval(updateAge, 30000);
    return () => clearInterval(interval);
  }, [authenticatedAt]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header currentUser={currentUser} authAgeMinutes={liveAuthAge} />

      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        {/* Title & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Demo Environment • Interactive Sandbox
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              GateShield Demo Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Simulate posture changes, geo-location, and authentication age to test policies without logging out.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">DEMO_MODE:</span>
            <span
              className={`px-2.5 py-1 rounded font-bold ${
                demoMode
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                  : "bg-slate-900 text-slate-400 border border-slate-800"
              }`}
            >
              {demoMode ? "ACTIVE (SIMULATION ON)" : "OFF (PRODUCTION ONLY)"}
            </span>
          </div>
        </div>

        {/* Current State / Persona Overview */}
        {currentUser ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
              <div className="text-xs font-mono text-slate-400">Current User</div>
              <div className="text-base font-bold text-white truncate">{currentUser.userId}</div>
              <div className="text-xs text-slate-400">Role: <span className="text-emerald-400 font-mono uppercase font-bold">{currentUser.role}</span></div>
            </div>

            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
              <div className="text-xs font-mono text-slate-400">Device Posture</div>
              <div className={`text-base font-bold ${currentUser.deviceSecure ? "text-emerald-400" : "text-rose-400"}`}>
                {currentUser.deviceSecure ? "✓ Secure (Compliant)" : "✗ Insecure Posture"}
              </div>
              <div className="text-xs text-slate-400">Attestation: Simulated</div>
            </div>

            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
              <div className="text-xs font-mono text-slate-400">Auth Age / Freshness</div>
              <div className="text-base font-bold text-white font-mono">
                {liveAuthAge ?? 0}m <span className="text-xs font-normal text-slate-400">ago</span>
              </div>
              <div className="text-xs text-slate-400 truncate">
                {liveAuthAge !== undefined && liveAuthAge <= 15 ? (
                  <span className="text-emerald-400">Fresh (≤ 15m)</span>
                ) : (
                  <span className="text-amber-400">Stale (&gt; 15m) — Step-Up Trigger</span>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
              <div className="text-xs font-mono text-slate-400">Simulated Context</div>
              <div className="text-sm font-mono text-white">
                Country: <span className="text-emerald-400 font-bold">{currentUser.simulatedCountry || "None (Real)"}</span>
              </div>
              <div className="text-sm font-mono text-white">
                Time: <span className="text-emerald-400 font-bold">{currentUser.simulatedTime || "None (Real)"}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">You are not authenticated</h2>
              <p className="text-xs text-slate-400 mt-1">
                Log in as one of the demo users (Admin, Finance, HR, Intern) to test application policies.
              </p>
            </div>
            <Link
              to="/login"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
            >
              Go to Login Page →
            </Link>
          </div>
        )}

        {/* Interactive Simulation Controls */}
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Simulation Controls</h2>
              <p className="text-xs text-slate-400">
                Modify zero-trust attributes in your signed session to trigger ALLOW, DENY, or STEP_UP.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Control 1: Posture Toggle */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <div className="text-xs font-bold text-slate-300 uppercase font-mono">01. Device Posture</div>
                <p className="text-xs text-slate-400 mt-1">
                  Flip device status between compliant and non-compliant.
                </p>
              </div>
              <Form method="post">
                <input type="hidden" name="intent" value="toggleDevicePosture" />
                <button
                  type="submit"
                  disabled={!currentUser}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition border ${
                    !currentUser
                      ? "opacity-50 cursor-not-allowed bg-slate-800 text-slate-500 border-slate-700"
                      : currentUser.deviceSecure
                      ? "bg-rose-950/60 hover:bg-rose-900 text-rose-300 border-rose-800"
                      : "bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border-emerald-800"
                  }`}
                >
                  {currentUser?.deviceSecure ? "Simulate Insecure Device" : "Simulate Secure Device"}
                </button>
              </Form>
            </div>

            {/* Control 2: Configurable Auth Age */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-300 uppercase font-mono">02. Auth Age</div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      liveAuthAge === undefined
                        ? "bg-slate-900 text-slate-500 border-slate-800"
                        : liveAuthAge <= 15
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                        : "bg-amber-950/60 text-amber-300 border-amber-800"
                    }`}
                  >
                    Current: {liveAuthAge !== undefined ? `${liveAuthAge}m` : "N/A"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Sets login age to trigger stale session policies (&gt; 15m).
                </p>
              </div>

              {/* Number Input Form */}
              <Form method="post" className="space-y-1.5">
                <input type="hidden" name="intent" value="setLoginAge" />
                <label htmlFor="loginAgeInput" className="block text-[11px] font-medium text-slate-400">
                  Login age (minutes):
                </label>
                <div className="flex gap-2">
                  <input
                    id="loginAgeInput"
                    type="number"
                    name="ageMinutes"
                    min={0}
                    max={1440}
                    step={1}
                    value={ageMinutesInput}
                    onChange={(e) => setAgeMinutesInput(e.target.value)}
                    disabled={!currentUser || !demoMode}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!currentUser || !demoMode}
                    className="whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Set login age
                  </button>
                </div>
              </Form>

              {/* Quick Preset Buttons */}
              <div className="pt-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Quick Presets:</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                  {[
                    { label: "Fresh (0)", value: 0 },
                    { label: "10 min", value: 10 },
                    { label: "20 min", value: 20 },
                    { label: "60 min", value: 60 },
                  ].map((preset) => (
                    <Form key={preset.value} method="post">
                      <input type="hidden" name="intent" value="setLoginAge" />
                      <input type="hidden" name="ageMinutes" value={preset.value} />
                      <button
                        type="submit"
                        disabled={!currentUser || !demoMode}
                        className="w-full py-1 px-1 rounded text-[11px] font-mono font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-center truncate"
                      >
                        {preset.label}
                      </button>
                    </Form>
                  ))}
                </div>
              </div>
            </div>

            {/* Control 3: Country Override */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <div className="text-xs font-bold text-slate-300 uppercase font-mono">03. Geolocation</div>
                <p className="text-xs text-slate-400 mt-1">
                  Override country for geo-fencing policies.
                </p>
              </div>
              <Form method="post" className="flex gap-2">
                <input type="hidden" name="intent" value="setCountry" />
                <select
                  name="country"
                  defaultValue={currentUser?.simulatedCountry || "NONE"}
                  disabled={!currentUser || !demoMode}
                  className="flex-1 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white disabled:opacity-50"
                >
                  <option value="NONE">None / Real IP</option>
                  {ALLOWED_DEMO_COUNTRIES.filter((c) => c !== "NONE").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!currentUser || !demoMode}
                  className="py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 disabled:opacity-50"
                >
                  Apply
                </button>
              </Form>
            </div>

            {/* Control 4: Time of Day Override */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <div className="text-xs font-bold text-slate-300 uppercase font-mono">04. Time of Day (UTC)</div>
                <p className="text-xs text-slate-400 mt-1">
                  Override UTC time (e.g. 14:00 inside, 20:00 outside).
                </p>
              </div>
              <Form method="post" className="space-y-1.5">
                <input type="hidden" name="intent" value="setTime" />
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="time"
                    placeholder="HH:MM (e.g. 14:00)"
                    defaultValue={currentUser?.simulatedTime || ""}
                    disabled={!currentUser || !demoMode}
                    className="flex-1 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!currentUser || !demoMode}
                    className="py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 disabled:opacity-50"
                  >
                    Set
                  </button>
                </div>
                {currentUser?.simulatedTime && (
                  <button
                    type="submit"
                    name="time"
                    value="NONE"
                    className="text-[10px] text-slate-400 hover:text-white underline block"
                  >
                    Clear Time Override
                  </button>
                )}
              </Form>
            </div>
          </div>
        </div>

        {/* Shortcut Links to Protected Apps */}
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white">Test Protected Applications</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              reloadDocument
              to="/apps/hr"
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-600 transition group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white group-hover:text-emerald-400 transition">
                  HR Portal
                </span>
                <span className="text-[10px] font-mono text-slate-500">/apps/hr</span>
              </div>
              <p className="text-xs text-slate-400">
                Rule: Allows role <strong>hr</strong> or <strong>admin</strong>.
              </p>
            </Link>

            <Link
              reloadDocument
              to="/apps/finance"
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-600 transition group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white group-hover:text-emerald-400 transition">
                  Finance Hub
                </span>
                <span className="text-[10px] font-mono text-slate-500">/apps/finance</span>
              </div>
              <p className="text-xs text-slate-400">
                Rule: Allows role <strong>finance</strong> or <strong>admin</strong> with <strong>secure device</strong>.
              </p>
            </Link>

            <Link
              reloadDocument
              to="/apps/admin"
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-600 transition group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-white group-hover:text-emerald-400 transition">
                  Admin Console
                </span>
                <span className="text-[10px] font-mono text-slate-500">/apps/admin</span>
              </div>
              <p className="text-xs text-slate-400">
                Rule: Allows role <strong>admin</strong> during <strong>09:00-18:00 UTC</strong> and <strong>authAge ≤ 15m</strong> (else STEP_UP).
              </p>
            </Link>
          </div>
        </div>

        {/* Recent Audit Log Decisions */}
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Your Recent Gateway Decisions</h2>
              <p className="text-xs text-slate-400">
                Latest 10 audit logs evaluated for your authenticated session identity.
              </p>
            </div>
            <Link
              to="/admin/logs"
              className="text-xs text-slate-400 hover:text-white underline font-mono"
            >
              View Global Logs →
            </Link>
          </div>

          {recentLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Time (UTC)</th>
                    <th className="p-2.5">App</th>
                    <th className="p-2.5">Path</th>
                    <th className="p-2.5">Decision</th>
                    <th className="p-2.5">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-950/40">
                      <td className="p-2.5 text-slate-400 truncate max-w-[140px]">
                        {new Date(log.createdAt).toISOString().replace("T", " ").slice(0, 19)}
                      </td>
                      <td className="p-2.5 text-white font-semibold">{log.appName}</td>
                      <td className="p-2.5 text-slate-300">{log.path}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.decision === "ALLOW"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : log.decision === "STEP_UP"
                              ? "bg-amber-950 text-amber-300 border border-amber-800"
                              : "bg-rose-950 text-rose-300 border border-rose-800"
                          }`}
                        >
                          {log.decision}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-400 max-w-xs truncate" title={log.reason}>
                        {log.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 bg-slate-950 rounded-xl text-center text-xs text-slate-500">
              No audit logs recorded for this user yet. Try accessing one of the protected applications above.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
