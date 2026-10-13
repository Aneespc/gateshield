import { Form, Link } from "react-router";
import type { SessionData } from "../lib/session.server";

interface HeaderProps {
  currentUser?: SessionData | null;
  authAgeMinutes?: number;
}

export function Header({ currentUser, authAgeMinutes }: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur px-4 sm:px-6 py-3 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo and Tagline */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/20 group-hover:border-emerald-500/40 transition">
              GS
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                GateShield
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation links */}
        <nav className="flex items-center gap-1 sm:gap-2 text-xs">
          <Link
            to="/"
            className="px-2.5 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
          >
            Overview
          </Link>
          <Link
            to="/demo"
            className="px-2.5 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/60 transition font-medium text-emerald-400 bg-emerald-500/5 border border-emerald-500/20"
          >
            Demo Console
          </Link>
          <div className="h-4 w-px bg-slate-800 hidden sm:block mx-1" />
          <Link
            to="/apps/hr"
            className="px-2 py-1 text-slate-400 hover:text-slate-200 hidden md:block"
          >
            HR
          </Link>
          <Link
            to="/apps/finance"
            className="px-2 py-1 text-slate-400 hover:text-slate-200 hidden md:block"
          >
            Finance
          </Link>
          <Link
            to="/apps/admin"
            className="px-2 py-1 text-slate-400 hover:text-slate-200 hidden md:block"
          >
            Admin
          </Link>
        </nav>

        {/* User state */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 font-mono">
                <span className="text-slate-400">User:</span>
                <span className="text-white font-semibold">{currentUser.userId}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-bold bg-slate-800 text-emerald-300 border border-slate-700">
                  {currentUser.role}
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    currentUser.deviceSecure
                      ? "bg-emerald-950/80 text-emerald-300 border border-emerald-700/50"
                      : "bg-rose-950/80 text-rose-300 border border-rose-700/50"
                  }`}
                  title={currentUser.deviceSecure ? "Device Secure" : "Device Insecure"}
                >
                  {currentUser.deviceSecure ? "SECURE" : "INSECURE"}
                </span>
                {typeof authAgeMinutes === "number" && (
                  <span className="text-[10px] text-slate-400">
                    ({authAgeMinutes}m)
                  </span>
                )}
              </div>

              <Form method="post" action="/login">
                <input type="hidden" name="_action" value="logout" />
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
                >
                  Logout
                </button>
              </Form>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold tracking-wide transition shadow-sm"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
