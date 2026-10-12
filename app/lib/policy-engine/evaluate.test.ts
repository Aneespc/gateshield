import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate";
import type { RequestContext } from "./types";

describe("evaluate (policy engine)", () => {
  it("defaults to DENY when zero policies are provided", () => {
    const context: RequestContext = {
      timestamp: new Date("2026-10-12T10:00:00Z"),
      path: "/apps/finance/dashboard",
      method: "GET",
      role: "finance",
      deviceSecure: true,
      country: "US",
    };

    const decision = evaluate(context, []);

    expect(decision.action).toBe("DENY");
    expect(decision.matchedPolicyId).toBeNull();
    expect(decision.reason).toMatch(/default deny/i);
  });
});
