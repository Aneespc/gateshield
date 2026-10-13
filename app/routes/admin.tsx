import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import {
  Link,
  NavLink,
  Outlet,
  useLoaderData,
  useLocation,
  useRouteError,
  isRouteErrorResponse,
  Form,
} from "react-router";
import { requireAdmin } from "../lib/adminAuth.server";

export const meta: MetaFunction = () => {
  return [{ title: "GateShield Admin Console" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAdmin(request);
  return { user };
}

export default function AdminLayout() {
  const { user } = useLoaderData<typeof loader>();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/20 group-hover:border-emerald-500/40 transition">
              GS
            </div>
            <div>
              <span className="font-bold text-white tracking-tight text-sm block">
                GateShield
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">
                Admin Console
              </span>
            </div>
          </Link>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                isActive
                  ? "bg-emerald-600/15 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`
            }
          >
            <span>📊</span>
            <span>Overview</span>
          </NavLink>

          <NavLink
            to="/admin/logs"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                isActive
                  ? "bg-emerald-600/15 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`
            }
          >
            <span>📋</span>
            <span>Audit Logs</span>
          </NavLink>

          {/* Policies link disabled until Part B */}
          <div
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-500 cursor-not-allowed select-none bg-slate-950/40 border border-slate-900"
            title="Policy Editor will be implemented in Step 8 Part B"
          >
            <div className="flex items-center gap-2.5">
              <span>⚖️</span>
              <span>Policies</span>
            </div>
            <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
              Part B
            </span>
          </div>

          <div className="pt-3 my-2 border-t border-slate-800/60" />

          <Link
            to="/demo"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition"
          >
            <span>🎛️</span>
            <span>Demo Console</span>
          </Link>

          <Link
            to="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition"
          >
            <span>🏠</span>
            <span>Public Home</span>
          </Link>
        </nav>

        {/* User Card in Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-[10px] border border-emerald-800">
                A
              </div>
              <div className="text-xs truncate">
                <div className="font-semibold text-white truncate max-w-[120px]">
                  {user.userId}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono uppercase">
                  {user.role}
                </div>
              </div>
            </div>

            <Form method="post" action="/login">
              <input type="hidden" name="_action" value="logout" />
              <button
                type="submit"
                className="px-2 py-1 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                title="Sign Out"
              >
                Sign Out
              </button>
            </Form>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-mono">GateShield Admin</span>
            <span className="text-slate-600">/</span>
            <span className="text-white font-medium capitalize">
              {location.pathname === "/admin"
                ? "Overview"
                : location.pathname.replace("/admin/", "").replace("/", " ")}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Admin Session Verified
            </span>
            <Link
              to="/login"
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
            >
              Switch Persona
            </Link>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 403) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto text-2xl font-bold border border-rose-500/20">
            🚫
          </div>
          <h1 className="text-xl font-bold text-white">403 Forbidden</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Administrator privileges are required to access the GateShield dashboard.
            Your current persona does not hold the admin role.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/demo"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition"
            >
              Return to Demo Console →
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition"
            >
              Sign In as Admin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
        <div className="text-2xl">⚠️</div>
        <h1 className="text-lg font-bold text-white">An unexpected error occurred</h1>
        <p className="text-xs text-slate-400">
          {error instanceof Error ? error.message : "Internal error loading dashboard"}
        </p>
        <Link
          to="/admin"
          className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
        >
          Reload Dashboard
        </Link>
      </div>
    </div>
  );
}
