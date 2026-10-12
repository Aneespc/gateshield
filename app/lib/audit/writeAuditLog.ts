/**
 * Audit Log Writer (Stub)
 *
 * Purpose:
 * Records an immutable audit log entry for every evaluation processed by the gateway.
 * Captures request details, context snapshot, policy decision, matched policy ID, and reason.
 * Adheres to principle 5: Every decision is audit-logged, including denials caused by errors.
 *
 * TODO (Step 5):
 * - Persist audit record to Prisma `auditLog` table.
 * - Ensure fail-safe execution: audit logging errors should not crash the request flow,
 *   but must be surfaced to server logs.
 */

import type { Decision, RequestContext } from "../policy-engine/types";

export interface AuditLogEntryInput {
  context: RequestContext;
  decision: Decision;
  ipAddress?: string;
}

export async function writeAuditLog(_entry: AuditLogEntryInput): Promise<void> {
  // Stub implementation for skeleton milestone
  // In the skeleton phase, this is a non-blocking stub.
}
