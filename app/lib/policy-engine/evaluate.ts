/**
 * Policy Engine Evaluator (Stub)
 *
 * Purpose: Evaluates a RequestContext against an array of PolicyDefinitions.
 * Principles enforced:
 * 1. DEFAULT DENY: If no policy matches (e.g. zero policies), return DENY.
 * 2. FAIL CLOSED: Any error or unhandled state yields DENY.
 * 3. PURE FUNCTION: No database, no network calls, no framework/web imports.
 *
 * TODO (Step 3): Implement complete condition matching (role, deviceSecure, country, timeOfDay),
 * AND semantics per policy, and first-match-wins priority sorting.
 */

import type { Decision, PolicyDefinition, RequestContext } from "./types";

export function evaluate(
  _context: RequestContext,
  policies: PolicyDefinition[]
): Decision {
  if (policies.length === 0) {
    return {
      action: "DENY",
      reason: "Default deny: no matching policy found",
      matchedPolicyId: null,
    };
  }

  // Fallback stub response until step 3 is implemented
  return {
    action: "DENY",
    reason: "Policy engine stub: evaluation not implemented yet",
    matchedPolicyId: null,
  };
}
