import { prisma } from "../db.server";
import type { PolicyAction, RequestContext } from "../policy-engine/types";

/**
 * Audit Logging Service
 *
 * Persists an immutable audit log entry for every evaluation processed by the gateway.
 * Zero Trust Principle:
 * - Every decision (ALLOW, DENY, STEP_UP) is recorded prior to upstream forwarding.
 * - If audit writing fails, the gateway fails closed (never forwards).
 * - Sensitive credentials (cookies, authorization headers, request bodies, secrets) are NEVER captured.
 */

export interface AuditLogInput {
  appId?: string | null;
  userId?: string | null;
  userRole?: string | null;
  path: string;
  method: string;
  ipAddress?: string | null;
  country?: string | null;
  deviceSecure?: boolean | null;
  decision: PolicyAction;
  matchedPolicyId?: string | null;
  reason: string;
  context: RequestContext;
  skippedPolicies?: number;
  simulated?: {
    country?: string;
    time?: string;
    deviceSecure: boolean;
  };
}

/**
 * Writes an audit record to PostgreSQL via Prisma.
 * Throws upon database error so caller can enforce fail-closed security.
 *
 * @returns The generated audit record ID
 */
export async function writeAuditLog(entry: AuditLogInput): Promise<string> {
  const contextSnapshot = {
    userId: entry.context.userId,
    role: entry.context.role,
    deviceSecure: entry.context.deviceSecure,
    country: entry.context.country,
    timestamp:
      entry.context.timestamp instanceof Date
        ? entry.context.timestamp.toISOString()
        : String(entry.context.timestamp),
    path: entry.context.path,
    method: entry.context.method,
    appId: entry.context.appId,
    authAgeMinutes: entry.context.authAgeMinutes,
    skippedPolicies: entry.skippedPolicies ?? 0,
    simulated: entry.simulated ?? {
      deviceSecure: Boolean(entry.context.deviceSecure),
    },
  };

  const record = await prisma.auditLog.create({
    data: {
      appId: entry.appId ?? null,
      userId: entry.userId ?? null,
      userRole: entry.userRole ?? null,
      path: entry.path,
      method: entry.method,
      ipAddress: entry.ipAddress ?? null,
      country: entry.country ?? null,
      deviceSecure: entry.deviceSecure ?? null,
      decision: entry.decision,
      matchedPolicyId: entry.matchedPolicyId ?? null,
      reason: entry.reason,
      contextSnapshot,
    },
    select: {
      id: true,
    },
  });

  return record.id;
}
