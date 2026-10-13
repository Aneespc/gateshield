import { createCookieSessionStorage } from "react-router";

/**
 * Session Management
 *
 * Provides signed cookie-based session storage for identity and device posture simulation.
 * Cookie properties:
 * - httpOnly: true (prevents client-side script access)
 * - sameSite: "lax" (CSRF mitigation)
 * - secure: true in production (HTTPS enforcement)
 * - path: "/"
 * - maxAge: 8 hours
 */

export interface SessionData {
  userId: string;
  role: string;
  deviceSecure: boolean;
  authenticatedAt: string; // ISO string
  simulatedCountry?: string; // ISO code, e.g. "US", "DE"
  simulatedTime?: string; // "HH:MM", interpreted as UTC time of day
  reauthAttempts?: number;
}

export interface SessionFlashData {
  error?: string;
}

const secretKey =
  process.env.SESSION_SECRET && !process.env.SESSION_SECRET.includes("PASTE_")
    ? process.env.SESSION_SECRET
    : "development-fallback-secret-minimum-32-characters-long";

export const sessionStorage = createCookieSessionStorage<SessionData, SessionFlashData>({
  cookie: {
    name: "gateshield_session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [secretKey],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8 hours
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;

/**
 * Retrieves and validates typed user session data from incoming Request headers.
 */
export async function getSessionUser(request: Request): Promise<SessionData | null> {
  const session = await getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  const role = session.get("role");
  const deviceSecure = session.get("deviceSecure");
  const authenticatedAt = session.get("authenticatedAt");

  if (!userId || !role || typeof deviceSecure !== "boolean" || !authenticatedAt) {
    return null;
  }

  return {
    userId,
    role,
    deviceSecure,
    authenticatedAt,
    simulatedCountry: session.get("simulatedCountry") || undefined,
    simulatedTime: session.get("simulatedTime") || undefined,
    reauthAttempts: session.get("reauthAttempts") ?? 0,
  };
}

/**
 * Alias for getSessionUser to maintain backwards compatibility.
 */
export const getUserSession = getSessionUser;

/**
 * Computes authentication age in whole minutes.
 * - Pure function.
 * - Future timestamps are clamped to 0.
 * - Invalid or missing timestamps return undefined (never fresh).
 * - Never negative.
 */
export function computeAuthAgeMinutes(
  authenticatedAt: string | undefined | null,
  now: Date
): number | undefined {
  if (!authenticatedAt || typeof authenticatedAt !== "string") {
    return undefined;
  }

  const authTime = new Date(authenticatedAt).getTime();
  if (isNaN(authTime)) {
    return undefined;
  }

  const nowTime = now.getTime();
  if (isNaN(nowTime)) {
    return undefined;
  }

  const diffMs = nowTime - authTime;
  if (diffMs < 0) {
    return 0; // Future timestamp clamped to 0
  }

  return Math.floor(diffMs / (60 * 1000));
}

/**
 * Computes an authenticatedAt ISO string corresponding to an authentication
 * that occurred `minutes` ago relative to `now`.
 * - Pure function.
 * - Minutes is non-negative whole integer.
 */
export function authenticatedAtFromAge(minutes: number, now: Date): string {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  return new Date(now.getTime() - safeMinutes * 60 * 1000).toISOString();
}

export interface SimulationResult {
  effectiveCountry?: string;
  effectiveTimestamp: Date;
  simulated: {
    country?: string;
    time?: string;
    deviceSecure: boolean;
  };
}

/**
 * Applies simulated context parameters (country, time of day) when DEMO_MODE is true.
 * When DEMO_MODE is false, simulation overrides are strictly ignored.
 * - Pure function.
 */
export function applySimulation(
  baseContextInputs: { country?: string; timestamp: Date },
  session: SessionData | null,
  demoMode: boolean
): SimulationResult {
  let effectiveCountry = baseContextInputs.country;
  let effectiveTimestamp = new Date(baseContextInputs.timestamp.getTime());

  const hasSimCountry =
    Boolean(session?.simulatedCountry) &&
    session!.simulatedCountry !== "NONE" &&
    session!.simulatedCountry!.trim() !== "";

  const hasSimTime =
    Boolean(session?.simulatedTime) &&
    session!.simulatedTime !== "NONE" &&
    session!.simulatedTime!.trim() !== "";

  if (demoMode) {
    if (hasSimCountry) {
      effectiveCountry = session!.simulatedCountry!.trim().toUpperCase();
    }
    if (hasSimTime) {
      const [hStr, mStr] = session!.simulatedTime!.split(":");
      const h = Number(hStr);
      const m = Number(mStr);
      if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        effectiveTimestamp.setUTCHours(h, m, 0, 0);
      }
    }
  }

  return {
    effectiveCountry,
    effectiveTimestamp,
    simulated: {
      country: demoMode && hasSimCountry ? session!.simulatedCountry : undefined,
      time: demoMode && hasSimTime ? session!.simulatedTime : undefined,
      deviceSecure: session?.deviceSecure ?? false,
    },
  };
}

/**
 * Validates whether a redirect URL is safe from open redirect vulnerabilities.
 * Accepts only relative paths starting with a single '/' and rejects:
 * - Protocol-relative paths (e.g., '//evil.com')
 * - Absolute URLs with schemes (e.g., 'https://evil.com')
 * - Backslash-separated paths (e.g., '/\evil.com')
 * - Empty strings, null, or undefined
 */
export function isValidRedirectUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }
  const trimmed = url.trim();
  return trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\");
}

/**
 * Sanitizes returnTo parameter, defaulting to '/' if invalid.
 */
export function sanitizeReturnTo(url: string | null | undefined): string {
  if (isValidRedirectUrl(url)) {
    return url!.trim();
  }
  return "/";
}
