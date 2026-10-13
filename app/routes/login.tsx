import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { Form, redirect, useLoaderData, useSearchParams } from "react-router";

export const meta: MetaFunction = () => {
  return [{ title: "GateShield - Sign In" }];
};
import { Header } from "../components/Header";
import { prisma } from "../lib/db.server";
import {
  commitSession,
  computeAuthAgeMinutes,
  destroySession,
  getSession,
  getSessionUser,
  sanitizeReturnTo,
} from "../lib/session.server";

interface DemoUserMeta {
  id: string;
  name: string;
  email: string;
  role: string;
  accessSummary: string;
}

const DEMO_USER_PROFILES: DemoUserMeta[] = [
  {
    id: "demo-admin",
    name: "Alice Admin",
    email: "admin@gateshield.local",
    role: "admin",
    accessSummary:
      "Admin Console (requires secure device, 09:00-18:00 UTC, & fresh login <= 15m), plus HR & Finance.",
  },
  {
    id: "demo-finance",
    name: "Bob Finance",
    email: "finance@gateshield.local",
    role: "finance",
    accessSummary:
      "Finance Hub access when device posture is verified secure. Blocked from Admin Console.",
  },
  {
    id: "demo-hr",
    name: "Carol HR",
    email: "hr@gateshield.local",
    role: "hr",
    accessSummary:
      "HR Portal employee management. Blocked from Finance Hub and Admin Console.",
  },
  {
    id: "demo-intern",
    name: "Dave Intern",
    email: "intern@gateshield.local",
    role: "intern",
    accessSummary:
      "Restricted intern account. Denied access across all protected corporate applications.",
  },
];

export async function loader({ request }: LoaderFunctionArgs) {
  let demoUsers = DEMO_USER_PROFILES;

  try {
    const dbUsers = await prisma.demoUser.findMany({
      orderBy: { role: "asc" },
    });
    if (dbUsers.length > 0) {
      demoUsers = dbUsers.map((u) => {
        const profile = DEMO_USER_PROFILES.find(
          (p) => p.email.toLowerCase() === u.email.toLowerCase() || p.role === u.role
        );
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          accessSummary:
            profile?.accessSummary ?? `Role ${u.role} access defined by active policies.`,
        };
      });
    }
  } catch {
    // If DB is offline/unmigrated, use static profiles gracefully
  }

  const currentUser = await getSessionUser(request);
  const authAgeMinutes = currentUser
    ? computeAuthAgeMinutes(currentUser.authenticatedAt, new Date())
    : undefined;

  return {
    demoUsers,
    currentUser,
    authAgeMinutes,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("_action");
  const session = await getSession(request.headers.get("Cookie"));

  if (intent === "logout") {
    return redirect("/login", {
      headers: {
        "Set-Cookie": await destroySession(session),
        "Cache-Control": "no-store",
      },
    });
  }

  const userId = formData.get("userId")?.toString();
  const deviceSecure = formData.get("deviceSecure") === "on";
  const returnToRaw = formData.get("returnTo")?.toString();
  const returnTo = sanitizeReturnTo(returnToRaw);

  let selectedUser: { id: string; role: string; name: string } | null = null;

  try {
    if (userId) {
      const dbUser = await prisma.demoUser.findUnique({ where: { id: userId } });
      if (dbUser) selectedUser = dbUser;
    }
  } catch {
    // Fall back to memory check
  }

  if (!selectedUser && userId) {
    selectedUser = DEMO_USER_PROFILES.find((u) => u.id === userId) ?? null;
  }

  if (!selectedUser) {
    return { error: "Please select a valid user." };
  }

  session.set("userId", selectedUser.id);
  session.set("role", selectedUser.role);
  session.set("deviceSecure", deviceSecure);
  session.set("authenticatedAt", new Date().toISOString());
  session.set("reauthAttempts", 0);

  return redirect(returnTo, {
    headers: {
      "Set-Cookie": await commitSession(session),
      "Cache-Control": "no-store",
    },
  });
}

export default function LoginPage() {
  const { demoUsers, currentUser, authAgeMinutes } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  const [selectedUserId, setSelectedUserId] = useState<string>(
    currentUser?.userId || demoUsers[0]?.id || ""
  );
  const [isSwitchingUser, setIsSwitchingUser] = useState<boolean>(!currentUser);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header currentUser={currentUser} authAgeMinutes={authAgeMinutes} />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          {/* Visible Simulation Banner */}
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-700/60 text-amber-200 text-xs sm:text-sm flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <strong className="text-amber-100 font-semibold block mb-0.5">
                Demo environment: Identity and device posture are simulated.
              </strong>
              <p className="text-amber-300/90 text-xs leading-relaxed">
                In a real zero trust deployment, identity is provided via an OIDC IdP (Okta / Entra ID)
                and device posture is cryptographically attested by an endpoint agent (e.g. CrowdStrike Falcon, osquery, or enterprise MDM).
                Client-supplied posture headers are never trusted in production.
              </p>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Sign In to GateShield
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Select a persona card below to simulate role credentials and device posture.
            </p>
          </div>

          {currentUser && !isSwitchingUser ? (
            <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold font-mono">
                  Currently Authenticated
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Age: {authAgeMinutes ?? 0}m
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-900 rounded border border-slate-800">
                  <div className="text-slate-400">User ID</div>
                  <div className="text-white font-bold mt-0.5">{currentUser.userId}</div>
                </div>
                <div className="p-3 bg-slate-900 rounded border border-slate-800">
                  <div className="text-slate-400">Role</div>
                  <div className="text-emerald-400 font-bold uppercase mt-0.5">
                    {currentUser.role}
                  </div>
                </div>
                <div className="p-3 bg-slate-900 rounded border border-slate-800 col-span-2 flex items-center justify-between">
                  <span className="text-slate-400">Device Posture:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      currentUser.deviceSecure
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        : "bg-rose-950 text-rose-300 border border-rose-800"
                    }`}
                  >
                    {currentUser.deviceSecure ? "✓ Secure (Compliant)" : "✗ Insecure Posture"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSwitchingUser(true)}
                  className="flex-1 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
                >
                  Switch User / Persona
                </button>
                <Form method="post">
                  <input type="hidden" name="_action" value="logout" />
                  <button
                    type="submit"
                    className="py-2 px-4 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-semibold border border-rose-800 transition"
                  >
                    Log Out
                  </button>
                </Form>
              </div>
            </div>
          ) : (
            <Form method="post" reloadDocument className="space-y-6">
              <input type="hidden" name="returnTo" value={returnTo} />
              <input type="hidden" name="userId" value={selectedUserId} />

              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                  Select Persona:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {demoUsers.map((user) => {
                    const isSelected = selectedUserId === user.id;
                    return (
                      <button
                        type="button"
                        key={user.id}
                        onClick={() => setSelectedUserId(user.id)}
                        className={`text-left p-3.5 rounded-xl border transition relative flex flex-col justify-between ${
                          isSelected
                            ? "bg-emerald-950/30 border-emerald-500 shadow-md ring-1 ring-emerald-500/50"
                            : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-sm text-white">{user.name}</span>
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                                user.role === "admin"
                                  ? "bg-purple-950 text-purple-300 border border-purple-800"
                                  : user.role === "finance"
                                  ? "bg-blue-950 text-blue-300 border border-blue-800"
                                  : user.role === "hr"
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                  : "bg-slate-800 text-slate-300 border border-slate-700"
                              }`}
                            >
                              {user.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mb-2">
                            {user.email}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {user.accessSummary}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="mt-2 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                            ✓ Selected Persona
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Simulated Device Posture Toggle */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label
                      htmlFor="deviceSecure"
                      className="text-sm font-semibold text-white select-none cursor-pointer"
                    >
                      Simulate secure device
                    </label>
                    <p className="text-xs text-slate-400 mt-0.5">
                      In a real deployment, a device agent would report this. Here you set it yourself.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="deviceSecure"
                    name="deviceSecure"
                    defaultChecked
                    className="h-5 w-5 rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                {currentUser && (
                  <button
                    type="button"
                    onClick={() => setIsSwitchingUser(false)}
                    className="py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold tracking-wide transition shadow-lg shadow-emerald-950/50"
                >
                  Log In as Selected User
                </button>
              </div>
            </Form>
          )}
        </div>
      </main>
    </div>
  );
}
