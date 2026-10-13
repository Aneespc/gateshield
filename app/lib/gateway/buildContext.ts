import type { RequestContext } from "../policy-engine/types";
import {
  applySimulation,
  computeAuthAgeMinutes,
  type SessionData,
} from "../session.server";

/**
 * Context Builder & Identity Extractor
 *
 * Enforces Zero Trust Principle:
 * - Identity (userId, role, deviceSecure) is derived EXCLUSIVELY from the verified signed session.
 * - Client headers or query parameters are NEVER trusted for identity or device posture.
 * - Country is trusted from 'x-vercel-ip-country' ONLY when running on the Vercel edge infrastructure
 *   (guaranteed by process.env.VERCEL). In local development, the optional DEV_COUNTRY env var is used.
 * - In DEMO_MODE, simulated country and time from session are applied to allow interactive testing.
 */

/**
 * Resolves geolocation country code securely.
 * Ignores client-supplied country headers unless verified to be running on Vercel.
 */
export function resolveCountry(
  request: Request,
  devCountryOverride?: string,
  isVercelEnv?: boolean
): string | undefined {
  const onVercel = isVercelEnv ?? Boolean(process.env.VERCEL);

  if (onVercel) {
    const vercelCountry = request.headers.get("x-vercel-ip-country");
    if (vercelCountry && vercelCountry.trim()) {
      return vercelCountry.trim().toUpperCase();
    }
    return undefined;
  }

  // Local development fallback
  const devCountry = devCountryOverride ?? process.env.DEV_COUNTRY;
  if (devCountry && devCountry.trim()) {
    return devCountry.trim().toUpperCase();
  }

  return undefined;
}

/**
 * Resolves client IP address securely for audit logging only.
 * Only extracts on Vercel via x-forwarded-for or x-real-ip.
 */
export function resolveClientIp(
  request: Request,
  isVercelEnv?: boolean
): string | undefined {
  const onVercel = isVercelEnv ?? Boolean(process.env.VERCEL);

  if (!onVercel) {
    return undefined;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  return undefined;
}

export interface BuildContextAppParam {
  id: string;
  slug?: string;
}

export interface BuildContextResult {
  context: RequestContext;
  meta: {
    ipAddress?: string;
    simulated: {
      country?: string;
      time?: string;
      deviceSecure: boolean;
    };
  };
}

/**
 * Transforms an incoming HTTP request into a validated RequestContext.
 */
export function buildContext(
  request: Request,
  session: SessionData | null,
  app?: BuildContextAppParam | null,
  now?: Date,
  demoModeOverride?: boolean
): BuildContextResult {
  const url = new URL(request.url);
  const timestamp = now ?? new Date();
  const rawCountry = resolveCountry(request);
  const ipAddress = resolveClientIp(request);

  const isDemoMode =
    demoModeOverride ??
    (process.env.DEMO_MODE !== "false" && process.env.DEMO_MODE !== "0");

  const simulation = applySimulation(
    { country: rawCountry, timestamp },
    session,
    isDemoMode
  );

  const authAgeMinutes = computeAuthAgeMinutes(session?.authenticatedAt, timestamp);

  const context: RequestContext = {
    userId: session?.userId,
    role: session?.role,
    deviceSecure: session?.deviceSecure,
    country: simulation.effectiveCountry,
    timestamp: simulation.effectiveTimestamp,
    path: url.pathname,
    method: request.method,
    appId: app?.id,
    authAgeMinutes,
  };

  return {
    context,
    meta: {
      ipAddress,
      simulated: simulation.simulated,
    },
  };
}
