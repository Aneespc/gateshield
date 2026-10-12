/**
 * Policy Engine Evaluator
 *
 * Core principles enforced:
 * 1. DEFAULT DENY: If no policy matches (or zero policies exist), decision is DENY.
 * 2. FAIL CLOSED: Any unexpected error returns DENY with reason 'Evaluation error (fail closed)'.
 * 3. PURE FUNCTION: Pure synchronous logic; no DB, no network, no framework imports, no Date.now().
 * 4. POLICIES AS DATA: Evaluated dynamically using Zod schema validation; invalid policies are skipped.
 * 5. FIRST MATCH WINS: Evaluated in ascending priority order (tie-break by ID).
 * 6. SPECIFIC REASONS: Output decision reasons cite policy names and matching rationale.
 */

import { PolicyDefinitionSchema } from "./schema";
import type {
  Condition,
  Decision,
  EvaluationResult,
  PolicyDefinition,
  RequestContext,
  SkippedPolicy,
} from "./types";

/**
 * Checks if a given Date's UTC time falls within a [start, end) time window.
 *
 * - Compare against context timestamp in UTC.
 * - Start is inclusive, end is exclusive.
 * - Supports windows that cross midnight (e.g., "22:00" to "06:00").
 */
export function isWithinTimeWindow(
  timestamp: Date,
  start: string,
  end: string
): boolean {
  if (!(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
    return false;
  }

  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  if (
    isNaN(startH) ||
    isNaN(startM) ||
    isNaN(endH) ||
    isNaN(endM) ||
    startH < 0 ||
    startH > 23 ||
    startM < 0 ||
    startM > 59 ||
    endH < 0 ||
    endH > 23 ||
    endM < 0 ||
    endM > 59
  ) {
    return false;
  }

  const startMs = (startH * 3600 + startM * 60) * 1000;
  const endMs = (endH * 3600 + endM * 60) * 1000;

  const currentMs =
    (timestamp.getUTCHours() * 3600 +
      timestamp.getUTCMinutes() * 60 +
      timestamp.getUTCSeconds()) *
      1000 +
    timestamp.getUTCMilliseconds();

  // Empty window (start === end) contains no time points under [start, end)
  if (startMs === endMs) {
    return false;
  }

  if (startMs < endMs) {
    // Standard window within the same day (e.g., 09:00 to 18:00)
    return currentMs >= startMs && currentMs < endMs;
  } else {
    // Window crossing midnight (e.g., 22:00 to 06:00)
    return currentMs >= startMs || currentMs < endMs;
  }
}

/**
 * Evaluates a single Condition against the RequestContext.
 * Missing context data never satisfies a condition (returns false).
 */
export function evaluateCondition(
  condition: Condition,
  context: RequestContext
): boolean {
  switch (condition.field) {
    case "role": {
      if (context.role === undefined) {
        return false;
      }
      if (condition.op === "in") {
        return condition.value.includes(context.role);
      }
      if (condition.op === "not_in") {
        return !condition.value.includes(context.role);
      }
      return false;
    }

    case "deviceSecure": {
      if (context.deviceSecure === undefined) {
        return false;
      }
      if (condition.op === "eq") {
        return context.deviceSecure === condition.value;
      }
      return false;
    }

    case "country": {
      if (context.country === undefined) {
        return false;
      }
      const ctxCountry = context.country.toUpperCase();
      const targetCountries = condition.value.map((c) => c.toUpperCase());
      if (condition.op === "in") {
        return targetCountries.includes(ctxCountry);
      }
      if (condition.op === "not_in") {
        return !targetCountries.includes(ctxCountry);
      }
      return false;
    }

    case "timeOfDay": {
      if (!(context.timestamp instanceof Date) || isNaN(context.timestamp.getTime())) {
        return false;
      }
      if (condition.op === "between") {
        return isWithinTimeWindow(
          context.timestamp,
          condition.value.start,
          condition.value.end
        );
      }
      return false;
    }

    default:
      return false;
  }
}

/**
 * Pure function to evaluate a RequestContext against an array of policy inputs.
 *
 * 1. Validates each policy using Zod; malformed policies are skipped and recorded.
 * 2. Policies with empty conditions are rejected as invalid (must never allow-all).
 * 3. Filters to enabled policies, sorts by priority ascending (tie-break by ID).
 * 4. First match wins when all conditions match (AND semantics).
 * 5. Returns DEFAULT DENY if no policy matches.
 * 6. Fails closed (DENY) upon any exception.
 */
export function evaluate(
  context: RequestContext,
  policies: unknown[]
): EvaluationResult {
  const skipped: SkippedPolicy[] = [];

  try {
    if (!context || !(context.timestamp instanceof Date)) {
      throw new TypeError("RequestContext must be provided with a valid timestamp Date");
    }

    if (!Array.isArray(policies)) {
      throw new TypeError("Policies argument must be an array");
    }

    const validPolicies: PolicyDefinition[] = [];

    for (const raw of policies) {
      const policyId =
        typeof raw === "object" &&
        raw !== null &&
        "id" in raw &&
        typeof (raw as Record<string, unknown>).id === "string"
          ? ((raw as Record<string, unknown>).id as string)
          : undefined;

      const parseResult = PolicyDefinitionSchema.safeParse(raw);
      if (!parseResult.success) {
        const errorMsg = parseResult.error.issues
          .map((issue) => `${issue.path.join(".") || "policy"}: ${issue.message}`)
          .join("; ");
        skipped.push({ policyId, error: errorMsg });
        continue;
      }

      const policy = parseResult.data;
      if (!policy.conditions || policy.conditions.length === 0) {
        skipped.push({
          policyId: policy.id,
          error: "Policy has zero conditions (empty conditions are not permitted)",
        });
        continue;
      }

      validPolicies.push(policy);
    }

    // Filter to enabled policies and sort ascending by priority, breaking ties by id
    const candidatePolicies = validPolicies
      .filter((p) => p.enabled)
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.id.localeCompare(b.id);
      });

    // First match wins
    for (const policy of candidatePolicies) {
      const matches = policy.conditions.every((cond) =>
        evaluateCondition(cond, context)
      );

      if (matches) {
        let reason: string;
        if (policy.action === "ALLOW") {
          reason = `Allowed by policy '${policy.name}'`;
        } else if (policy.action === "DENY") {
          reason = `Denied by policy '${policy.name}'`;
        } else {
          reason = `Step-up required by policy '${policy.name}'`;
        }

        return {
          decision: {
            action: policy.action,
            reason,
            matchedPolicyId: policy.id,
          },
          skipped,
        };
      }
    }

    // Default deny if no matching policy
    return {
      decision: {
        action: "DENY",
        reason: "No matching policy (default deny)",
        matchedPolicyId: null,
      },
      skipped,
    };
  } catch (error) {
    // Fail closed
    return {
      decision: {
        action: "DENY",
        reason: "Evaluation error (fail closed)",
        matchedPolicyId: null,
      },
      skipped,
    };
  }
}
