import { describe, expect, it } from "vitest";
import { evaluate, evaluateCondition, isWithinTimeWindow } from "./evaluate";
import type { PolicyDefinition, RequestContext } from "./types";

const baseContext: RequestContext = {
  timestamp: new Date("2026-10-12T12:00:00.000Z"),
  path: "/apps/finance/reports",
  method: "GET",
  role: "finance",
  deviceSecure: true,
  country: "US",
  userId: "user-123",
  appId: "app-finance",
};

describe("evaluate (policy engine)", () => {
  it("defaults to DENY with zero policies", () => {
    const result = evaluate(baseContext, []);

    expect(result.decision).toEqual({
      action: "DENY",
      reason: "No matching policy (default deny)",
      matchedPolicyId: null,
    });
    expect(result.skipped).toEqual([]);
  });

  it("defaults to DENY when policies exist but none match", () => {
    const policies: PolicyDefinition[] = [
      {
        id: "policy-admin-only",
        name: "Admin Only",
        priority: 1,
        enabled: true,
        action: "ALLOW",
        conditions: [{ field: "role", op: "in", value: ["admin"] }],
      },
    ];

    const result = evaluate(baseContext, policies);

    expect(result.decision).toEqual({
      action: "DENY",
      reason: "No matching policy (default deny)",
      matchedPolicyId: null,
    });
    expect(result.skipped).toEqual([]);
  });

  it("allows access with a simple role match", () => {
    const policies: PolicyDefinition[] = [
      {
        id: "policy-allow-finance",
        name: "Finance Access",
        priority: 10,
        enabled: true,
        action: "ALLOW",
        conditions: [{ field: "role", op: "in", value: ["finance", "admin"] }],
      },
    ];

    const result = evaluate(baseContext, policies);

    expect(result.decision).toEqual({
      action: "ALLOW",
      reason: "Allowed by policy 'Finance Access'",
      matchedPolicyId: "policy-allow-finance",
    });
    expect(result.skipped).toEqual([]);
  });

  it("enforces priority ordering (lower number wins)", () => {
    const policies: PolicyDefinition[] = [
      {
        id: "policy-p20",
        name: "Low Priority Allow",
        priority: 20,
        enabled: true,
        action: "ALLOW",
        conditions: [{ field: "role", op: "in", value: ["finance"] }],
      },
      {
        id: "policy-p5",
        name: "High Priority Deny",
        priority: 5,
        enabled: true,
        action: "DENY",
        conditions: [{ field: "role", op: "in", value: ["finance"] }],
      },
    ];

    const result = evaluate(baseContext, policies);

    expect(result.decision).toEqual({
      action: "DENY",
      reason: "Denied by policy 'High Priority Deny'",
      matchedPolicyId: "policy-p5",
    });
  });

  it("breaks priority ties deterministically by policy ID regardless of input order", () => {
    const policyA: PolicyDefinition = {
      id: "policy-alpha",
      name: "Alpha Rule",
      priority: 10,
      enabled: true,
      action: "ALLOW",
      conditions: [{ field: "role", op: "in", value: ["finance"] }],
    };

    const policyB: PolicyDefinition = {
      id: "policy-beta",
      name: "Beta Rule",
      priority: 10,
      enabled: true,
      action: "DENY",
      conditions: [{ field: "role", op: "in", value: ["finance"] }],
    };

    // Alpha should win because "policy-alpha" < "policy-beta"
    const order1 = evaluate(baseContext, [policyA, policyB]);
    expect(order1.decision.matchedPolicyId).toBe("policy-alpha");

    const order2 = evaluate(baseContext, [policyB, policyA]);
    expect(order2.decision.matchedPolicyId).toBe("policy-alpha");
  });

  it("handles conflicting policies: higher-priority DENY beats lower-priority ALLOW, and reverse", () => {
    const denyPolicy: PolicyDefinition = {
      id: "p-deny",
      name: "Emergency Lockdown",
      priority: 1,
      enabled: true,
      action: "DENY",
      conditions: [{ field: "role", op: "in", value: ["finance"] }],
    };
    const allowPolicy: PolicyDefinition = {
      id: "p-allow",
      name: "Standard Access",
      priority: 10,
      enabled: true,
      action: "ALLOW",
      conditions: [{ field: "role", op: "in", value: ["finance"] }],
    };

    // Case 1: Deny has priority 1, Allow has priority 10 -> DENY wins
    const result1 = evaluate(baseContext, [allowPolicy, denyPolicy]);
    expect(result1.decision.action).toBe("DENY");
    expect(result1.decision.matchedPolicyId).toBe("p-deny");

    // Case 2: Reverse priorities: Allow priority 1, Deny priority 10 -> ALLOW wins
    const allowPriority1 = { ...allowPolicy, priority: 1 };
    const denyPriority10 = { ...denyPolicy, priority: 10 };
    const result2 = evaluate(baseContext, [denyPriority10, allowPriority1]);
    expect(result2.decision.action).toBe("ALLOW");
    expect(result2.decision.matchedPolicyId).toBe("p-allow");
  });

  it("ignores disabled policies", () => {
    const policies: PolicyDefinition[] = [
      {
        id: "disabled-allow",
        name: "Disabled Allow",
        priority: 1,
        enabled: false,
        action: "ALLOW",
        conditions: [{ field: "role", op: "in", value: ["finance"] }],
      },
      {
        id: "enabled-allow",
        name: "Enabled Allow",
        priority: 10,
        enabled: true,
        action: "ALLOW",
        conditions: [{ field: "role", op: "in", value: ["finance"] }],
      },
    ];

    const result = evaluate(baseContext, policies);

    expect(result.decision).toEqual({
      action: "ALLOW",
      reason: "Allowed by policy 'Enabled Allow'",
      matchedPolicyId: "enabled-allow",
    });
  });

  it("skips malformed policies and records them in skipped without granting access", () => {
    const malformedPolicies = [
      // Unknown condition field
      {
        id: "bad-field",
        name: "Bad Field",
        priority: 1,
        enabled: true,
        action: "ALLOW",
        conditions: [{ field: "department", op: "in", value: ["finance"] }],
      },
      // Bad operator
      {
        id: "bad-op",
        name: "Bad Operator",
        priority: 2,
        enabled: true,
        action: "ALLOW",
        conditions: [{ field: "role", op: "contains", value: ["finance"] }],
      },
      // Wrong value type
      {
        id: "bad-value-type",
        name: "Bad Value Type",
        priority: 3,
        enabled: true,
        action: "ALLOW",
        conditions: [{ field: "deviceSecure", op: "eq", value: "yes" }],
      },
      // Empty conditions list
      {
        id: "bad-empty-conditions",
        name: "Empty Conditions",
        priority: 4,
        enabled: true,
        action: "ALLOW",
        conditions: [],
      },
      // Missing action
      {
        id: "bad-missing-action",
        name: "Missing Action",
        priority: 5,
        enabled: true,
        conditions: [{ field: "role", op: "in", value: ["finance"] }],
      },
    ];

    const result = evaluate(baseContext, malformedPolicies);

    expect(result.decision).toEqual({
      action: "DENY",
      reason: "No matching policy (default deny)",
      matchedPolicyId: null,
    });
    expect(result.skipped).toHaveLength(5);
    expect(result.skipped.map((s) => s.policyId)).toEqual([
      "bad-field",
      "bad-op",
      "bad-value-type",
      "bad-empty-conditions",
      "bad-missing-action",
    ]);
  });

  it("allows a subsequent valid policy while logging earlier malformed policies", () => {
    const policies = [
      {
        id: "corrupted-p1",
        name: "Corrupted",
        priority: 1,
        enabled: true,
        action: "ALLOW",
        conditions: [{ field: "invalid", op: "eq", value: true }],
      },
      {
        id: "valid-p2",
        name: "Valid Policy",
        priority: 10,
        enabled: true,
        action: "ALLOW",
        conditions: [{ field: "role", op: "in", value: ["finance"] }],
      },
    ];

    const result = evaluate(baseContext, policies);

    expect(result.decision.action).toBe("ALLOW");
    expect(result.decision.matchedPolicyId).toBe("valid-p2");
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].policyId).toBe("corrupted-p1");
  });

  it("ensures missing context fields never satisfy conditions, including 'not_in'", () => {
    const unauthenticatedContext: RequestContext = {
      timestamp: new Date("2026-10-12T12:00:00Z"),
      path: "/apps/finance",
      method: "GET",
      // role, deviceSecure, country are all undefined
    };

    // Role missing
    expect(
      evaluateCondition(
        { field: "role", op: "in", value: ["admin"] },
        unauthenticatedContext
      )
    ).toBe(false);
    expect(
      evaluateCondition(
        { field: "role", op: "not_in", value: ["admin"] },
        unauthenticatedContext
      )
    ).toBe(false);

    // Device posture missing
    expect(
      evaluateCondition(
        { field: "deviceSecure", op: "eq", value: true },
        unauthenticatedContext
      )
    ).toBe(false);
    expect(
      evaluateCondition(
        { field: "deviceSecure", op: "eq", value: false },
        unauthenticatedContext
      )
    ).toBe(false);

    // Country missing
    expect(
      evaluateCondition(
        { field: "country", op: "in", value: ["US"] },
        unauthenticatedContext
      )
    ).toBe(false);
    expect(
      evaluateCondition(
        { field: "country", op: "not_in", value: ["US"] },
        unauthenticatedContext
      )
    ).toBe(false);
  });

  it("evaluates country conditions case-insensitively", () => {
    const contextLower: RequestContext = { ...baseContext, country: "us" };
    const contextUpper: RequestContext = { ...baseContext, country: "GB" };

    // Lowercase context against uppercase policy
    expect(
      evaluateCondition({ field: "country", op: "in", value: ["US", "CA"] }, contextLower)
    ).toBe(true);

    // Uppercase context against lowercase policy
    expect(
      evaluateCondition({ field: "country", op: "in", value: ["gb", "fr"] }, contextUpper)
    ).toBe(true);

    // not_in with case matching
    expect(
      evaluateCondition({ field: "country", op: "not_in", value: ["US"] }, contextLower)
    ).toBe(false);
    expect(
      evaluateCondition({ field: "country", op: "not_in", value: ["FR", "DE"] }, contextLower)
    ).toBe(true);
  });

  it("handles timeOfDay windows: inside, outside, boundaries (start inclusive, end exclusive), and midnight crossing", () => {
    // 1. Standard window: 09:00 to 18:00 UTC
    const at0859 = new Date("2026-10-12T08:59:59.999Z");
    const at0900 = new Date("2026-10-12T09:00:00.000Z"); // Start boundary (inclusive)
    const at1200 = new Date("2026-10-12T12:00:00.000Z"); // Inside
    const at1759 = new Date("2026-10-12T17:59:59.999Z"); // Inside
    const at1800 = new Date("2026-10-12T18:00:00.000Z"); // End boundary (exclusive)
    const at1801 = new Date("2026-10-12T18:01:00.000Z");

    expect(isWithinTimeWindow(at0859, "09:00", "18:00")).toBe(false);
    expect(isWithinTimeWindow(at0900, "09:00", "18:00")).toBe(true);
    expect(isWithinTimeWindow(at1200, "09:00", "18:00")).toBe(true);
    expect(isWithinTimeWindow(at1759, "09:00", "18:00")).toBe(true);
    expect(isWithinTimeWindow(at1800, "09:00", "18:00")).toBe(false);
    expect(isWithinTimeWindow(at1801, "09:00", "18:00")).toBe(false);

    // 2. Overnight window crossing midnight: 22:00 to 06:00 UTC
    const at2159 = new Date("2026-10-12T21:59:59.999Z");
    const at2200 = new Date("2026-10-12T22:00:00.000Z"); // Start boundary (inclusive)
    const at2330 = new Date("2026-10-12T23:30:00.000Z");
    const at0000 = new Date("2026-10-13T00:00:00.000Z");
    const at0400 = new Date("2026-10-13T04:00:00.000Z");
    const at0559 = new Date("2026-10-13T05:59:59.999Z");
    const at0600 = new Date("2026-10-13T06:00:00.000Z"); // End boundary (exclusive)
    const at1400 = new Date("2026-10-13T14:00:00.000Z");

    expect(isWithinTimeWindow(at2159, "22:00", "06:00")).toBe(false);
    expect(isWithinTimeWindow(at2200, "22:00", "06:00")).toBe(true);
    expect(isWithinTimeWindow(at2330, "22:00", "06:00")).toBe(true);
    expect(isWithinTimeWindow(at0000, "22:00", "06:00")).toBe(true);
    expect(isWithinTimeWindow(at0400, "22:00", "06:00")).toBe(true);
    expect(isWithinTimeWindow(at0559, "22:00", "06:00")).toBe(true);
    expect(isWithinTimeWindow(at0600, "22:00", "06:00")).toBe(false);
    expect(isWithinTimeWindow(at1400, "22:00", "06:00")).toBe(false);
  });

  it("returns STEP_UP action with matching policy information", () => {
    const policies: PolicyDefinition[] = [
      {
        id: "step-up-policy",
        name: "Require MFA For Offsite",
        priority: 1,
        enabled: true,
        action: "STEP_UP",
        conditions: [
          { field: "role", op: "in", value: ["finance"] },
          { field: "deviceSecure", op: "eq", value: false },
        ],
      },
    ];

    const contextInsecure: RequestContext = { ...baseContext, deviceSecure: false };
    const result = evaluate(contextInsecure, policies);

    expect(result.decision).toEqual({
      action: "STEP_UP",
      reason: "Step-up required by policy 'Require MFA For Offsite'",
      matchedPolicyId: "step-up-policy",
    });
  });

  it("fails closed (DENY) when an exception or invalid parameter occurs", () => {
    // Non-array policies argument
    const result1 = evaluate(baseContext, "not-an-array" as unknown as unknown[]);
    expect(result1.decision).toEqual({
      action: "DENY",
      reason: "Evaluation error (fail closed)",
      matchedPolicyId: null,
    });

    // Null context
    const result2 = evaluate(null as unknown as RequestContext, []);
    expect(result2.decision).toEqual({
      action: "DENY",
      reason: "Evaluation error (fail closed)",
      matchedPolicyId: null,
    });

    // Invalid timestamp in context
    const result3 = evaluate(
      { ...baseContext, timestamp: "invalid-date" as unknown as Date },
      []
    );
    expect(result3.decision).toEqual({
      action: "DENY",
      reason: "Evaluation error (fail closed)",
      matchedPolicyId: null,
    });
  });

  it("includes policy names in all match reason strings", () => {
    const policyAllow: PolicyDefinition = {
      id: "allow-p",
      name: "Payroll Allowed",
      priority: 1,
      enabled: true,
      action: "ALLOW",
      conditions: [{ field: "role", op: "in", value: ["finance"] }],
    };
    const resAllow = evaluate(baseContext, [policyAllow]);
    expect(resAllow.decision.reason).toBe("Allowed by policy 'Payroll Allowed'");

    const policyDeny: PolicyDefinition = {
      id: "deny-p",
      name: "Embargoed Region Denied",
      priority: 1,
      enabled: true,
      action: "DENY",
      conditions: [{ field: "country", op: "in", value: ["US"] }],
    };
    const resDeny = evaluate(baseContext, [policyDeny]);
    expect(resDeny.decision.reason).toBe("Denied by policy 'Embargoed Region Denied'");

    const policyStepUp: PolicyDefinition = {
      id: "step-up-p",
      name: "Re-auth Required",
      priority: 1,
      enabled: true,
      action: "STEP_UP",
      conditions: [{ field: "deviceSecure", op: "eq", value: true }],
    };
    const resStepUp = evaluate(baseContext, [policyStepUp]);
    expect(resStepUp.decision.reason).toBe("Step-up required by policy 'Re-auth Required'");
  });

  describe("authAgeMinutes condition", () => {
    it("evaluates lte correctly (true when within, false when exceeding, true at boundary)", () => {
      const condition = { field: "authAgeMinutes" as const, op: "lte" as const, value: 15 };

      expect(evaluateCondition(condition, { ...baseContext, authAgeMinutes: 0 })).toBe(true);
      expect(evaluateCondition(condition, { ...baseContext, authAgeMinutes: 10 })).toBe(true);
      expect(evaluateCondition(condition, { ...baseContext, authAgeMinutes: 15 })).toBe(true); // boundary
      expect(evaluateCondition(condition, { ...baseContext, authAgeMinutes: 16 })).toBe(false);
      expect(evaluateCondition(condition, { ...baseContext, authAgeMinutes: 120 })).toBe(false);
    });

    it("evaluates to false (fail closed) when authAgeMinutes is undefined or NaN in context", () => {
      const condition = { field: "authAgeMinutes" as const, op: "lte" as const, value: 15 };

      // Missing in context
      expect(evaluateCondition(condition, { ...baseContext, authAgeMinutes: undefined })).toBe(false);
      // NaN in context
      expect(evaluateCondition(condition, { ...baseContext, authAgeMinutes: Number.NaN })).toBe(false);
      // Negative in context
      expect(evaluateCondition(condition, { ...baseContext, authAgeMinutes: -5 })).toBe(false);
    });

    it("skips policies with invalid authAgeMinutes condition values", () => {
      const badPolicies = [
        // Negative value
        {
          id: "bad-neg",
          name: "Negative Auth Age",
          priority: 1,
          enabled: true,
          action: "ALLOW",
          conditions: [{ field: "authAgeMinutes", op: "lte", value: -1 }],
        },
        // Non-number value
        {
          id: "bad-str",
          name: "String Auth Age",
          priority: 2,
          enabled: true,
          action: "ALLOW",
          conditions: [{ field: "authAgeMinutes", op: "lte", value: "15" }],
        },
        // Unsupported operator
        {
          id: "bad-op",
          name: "Wrong Operator Auth Age",
          priority: 3,
          enabled: true,
          action: "ALLOW",
          conditions: [{ field: "authAgeMinutes", op: "gte", value: 15 }],
        },
        // Infinity
        {
          id: "bad-inf",
          name: "Infinity Auth Age",
          priority: 4,
          enabled: true,
          action: "ALLOW",
          conditions: [{ field: "authAgeMinutes", op: "lte", value: Number.POSITIVE_INFINITY }],
        },
      ];

      const result = evaluate({ ...baseContext, authAgeMinutes: 5 }, badPolicies);

      expect(result.decision.action).toBe("DENY");
      expect(result.skipped).toHaveLength(4);
      expect(result.skipped.map((s) => s.policyId)).toEqual([
        "bad-neg",
        "bad-str",
        "bad-op",
        "bad-inf",
      ]);
    });

    it("evaluates Admin fresh vs stale step-up policies deterministically", () => {
      const adminPolicies: PolicyDefinition[] = [
        {
          id: "admin-fresh-allow",
          name: "Admin Fresh Allow",
          priority: 10,
          enabled: true,
          action: "ALLOW",
          conditions: [
            { field: "role", op: "in", value: ["admin"] },
            { field: "deviceSecure", op: "eq", value: true },
            { field: "timeOfDay", op: "between", value: { start: "09:00", end: "18:00" } },
            { field: "authAgeMinutes", op: "lte", value: 15 },
          ],
        },
        {
          id: "admin-stale-step-up",
          name: "Admin Stale Step Up",
          priority: 20,
          enabled: true,
          action: "STEP_UP",
          conditions: [
            { field: "role", op: "in", value: ["admin"] },
            { field: "deviceSecure", op: "eq", value: true },
            { field: "timeOfDay", op: "between", value: { start: "09:00", end: "18:00" } },
          ],
        },
      ];

      const adminCtx: RequestContext = {
        timestamp: new Date("2026-10-12T12:00:00.000Z"), // 12:00 UTC (inside 09:00-18:00)
        path: "/apps/admin",
        method: "GET",
        role: "admin",
        deviceSecure: true,
        country: "US",
        userId: "admin-1",
        appId: "app-admin",
      };

      // Scenario 1: Fresh login (authAgeMinutes = 5) -> ALLOW by policy 10
      const freshResult = evaluate({ ...adminCtx, authAgeMinutes: 5 }, adminPolicies);
      expect(freshResult.decision.action).toBe("ALLOW");
      expect(freshResult.decision.matchedPolicyId).toBe("admin-fresh-allow");

      // Scenario 2: Stale login (authAgeMinutes = 30) -> STEP_UP by policy 20
      const staleResult = evaluate({ ...adminCtx, authAgeMinutes: 30 }, adminPolicies);
      expect(staleResult.decision.action).toBe("STEP_UP");
      expect(staleResult.decision.matchedPolicyId).toBe("admin-stale-step-up");

      // Scenario 3: Undefined auth age -> STEP_UP by policy 20 (fails fresh check, matches stale)
      const missingAgeResult = evaluate({ ...adminCtx, authAgeMinutes: undefined }, adminPolicies);
      expect(missingAgeResult.decision.action).toBe("STEP_UP");
      expect(missingAgeResult.decision.matchedPolicyId).toBe("admin-stale-step-up");

      // Scenario 4: Admin outside business hours (20:00 UTC) -> DENY (neither policy matches)
      const afterHoursCtx = { ...adminCtx, timestamp: new Date("2026-10-12T20:00:00.000Z"), authAgeMinutes: 5 };
      const afterHoursResult = evaluate(afterHoursCtx, adminPolicies);
      expect(afterHoursResult.decision.action).toBe("DENY");
      expect(afterHoursResult.decision.matchedPolicyId).toBeNull();
    });
  });
});
