import { describe, expect, it } from "vitest";
import { verifyGatewaySecret } from "./verifySecret.server";
import {
  authenticatedAtFromAge,
  computeAuthAgeMinutes,
  applySimulation,
  isValidRedirectUrl,
  sanitizeReturnTo,
} from "../session.server";
import {
  DemoCountrySchema,
  DemoTimeSchema,
  DemoConsoleActionSchema,
  LoginAgeMinutesSchema,
} from "./demoSchemas";
import { resolveClientIp, resolveCountry } from "./buildContext";
import {
  buildUpstreamUrl,
  sanitizeRequestHeaders,
} from "./forward";

describe("buildUpstreamUrl (SSRF and Path Normalization)", () => {
  const upstreamBase = "http://localhost:5173/dummy/finance";
  const pathPrefix = "/apps/finance";

  it("handles normal single-segment path", () => {
    const reqUrl = new URL("http://gateway.local/apps/finance/dashboard");
    const result = buildUpstreamUrl(upstreamBase, pathPrefix, reqUrl);
    expect(result.toString()).toBe("http://localhost:5173/dummy/finance/dashboard");
  });

  it("handles deep nested paths", () => {
    const reqUrl = new URL("http://gateway.local/apps/finance/ledger/2026/q1");
    const result = buildUpstreamUrl(upstreamBase, pathPrefix, reqUrl);
    expect(result.toString()).toBe("http://localhost:5173/dummy/finance/ledger/2026/q1");
  });

  it("preserves query string parameters", () => {
    const reqUrl = new URL("http://gateway.local/apps/finance/transactions?limit=25&status=pending");
    const result = buildUpstreamUrl(upstreamBase, pathPrefix, reqUrl);
    expect(result.toString()).toBe(
      "http://localhost:5173/dummy/finance/transactions?limit=25&status=pending"
    );
  });

  it("handles root path without subpath", () => {
    const reqUrl = new URL("http://gateway.local/apps/finance");
    const result = buildUpstreamUrl(upstreamBase, pathPrefix, reqUrl);
    expect(result.toString()).toBe("http://localhost:5173/dummy/finance");
  });

  it("handles trailing slash on root", () => {
    const reqUrl = new URL("http://gateway.local/apps/finance/");
    const result = buildUpstreamUrl(upstreamBase, pathPrefix, reqUrl);
    expect(result.toString()).toBe("http://localhost:5173/dummy/finance");
  });

  it("rejects path traversal (..) attempting to escape upstream base path", () => {
    const reqUrl = new URL("http://gateway.local/apps/finance/../admin");
    expect(() => buildUpstreamUrl(upstreamBase, pathPrefix, reqUrl)).toThrow(
      /Path traversal/
    );
  });

  it("rejects percent-encoded path traversal (%2e%2e)", () => {
    const reqUrl = new URL("http://gateway.local/apps/finance/%2e%2e/admin");
    expect(() => buildUpstreamUrl(upstreamBase, pathPrefix, reqUrl)).toThrow(
      /Path traversal/
    );
  });

  it("rejects protocol-relative slashes (//evil.com)", () => {
    const reqUrl = new URL("http://gateway.local/apps/finance//evil.com");
    expect(() => buildUpstreamUrl(upstreamBase, pathPrefix, reqUrl)).toThrow(
      /protocol-relative slashes/
    );
  });

  it("rejects backslashes in request path", () => {
    const reqUrl = new URL("http://gateway.local/apps/finance/\\evil.com");
    expect(() => buildUpstreamUrl(upstreamBase, pathPrefix, reqUrl)).toThrow(
      /backslashes/
    );
  });

  it("guarantees origin never changes from upstream base origin", () => {
    const reqUrl = new URL("http://gateway.local/apps/finance/reports");
    const result = buildUpstreamUrl(upstreamBase, pathPrefix, reqUrl);
    expect(result.origin).toBe("http://localhost:5173");
  });
});

describe("sanitizeRequestHeaders", () => {
  it("removes hop-by-hop, host, cookie, and client-supplied x-gateway-* headers", () => {
    const raw = new Headers({
      connection: "keep-alive",
      "keep-alive": "timeout=5",
      "transfer-encoding": "chunked",
      upgrade: "websocket",
      host: "spoofed.host.com",
      cookie: "gateshield_session=secret-session-cookie",
      "x-gateway-secret": "attacker-spoofed-secret",
      "x-gateway-user-id": "fake-admin",
      "x-custom-allowed": "my-header-value",
    });

    const sanitized = sanitizeRequestHeaders(raw, {
      sharedSecret: "verified-gateway-secret-123",
      userId: "user-42",
      userRole: "finance",
      forwardedFor: "192.0.2.1",
      forwardedHost: "gateway.corp.net",
      forwardedProto: "https",
    });

    // Removed headers
    expect(sanitized.get("connection")).toBeNull();
    expect(sanitized.get("keep-alive")).toBeNull();
    expect(sanitized.get("transfer-encoding")).toBeNull();
    expect(sanitized.get("upgrade")).toBeNull();
    expect(sanitized.get("host")).toBeNull();
    expect(sanitized.get("cookie")).toBeNull();

    // Preserved custom headers
    expect(sanitized.get("x-custom-allowed")).toBe("my-header-value");

    // Injected trusted gateway headers
    expect(sanitized.get("x-gateway-secret")).toBe("verified-gateway-secret-123");
    expect(sanitized.get("x-gateway-user-id")).toBe("user-42");
    expect(sanitized.get("x-gateway-user-role")).toBe("finance");
    expect(sanitized.get("x-forwarded-for")).toBe("192.0.2.1");
    expect(sanitized.get("x-forwarded-host")).toBe("gateway.corp.net");
    expect(sanitized.get("x-forwarded-proto")).toBe("https");
  });
});

describe("resolveCountry & resolveClientIp", () => {
  it("trusts x-vercel-ip-country ONLY when running on Vercel", () => {
    const request = new Request("http://gateway.local", {
      headers: { "x-vercel-ip-country": "us" },
    });

    // On Vercel: trusted and capitalized
    expect(resolveCountry(request, undefined, true)).toBe("US");

    // Off Vercel: client header is ignored
    expect(resolveCountry(request, undefined, false)).toBeUndefined();
  });

  it("uses DEV_COUNTRY override in local development", () => {
    const request = new Request("http://gateway.local", {
      headers: { "x-vercel-ip-country": "ru" }, // Should be ignored off Vercel
    });

    expect(resolveCountry(request, "ca", false)).toBe("CA");
  });

  it("extracts client IP from x-forwarded-for only on Vercel", () => {
    const request = new Request("http://gateway.local", {
      headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
    });

    // On Vercel: first IP extracted
    expect(resolveClientIp(request, true)).toBe("203.0.113.195");

    // Off Vercel: not trusted from client
    expect(resolveClientIp(request, false)).toBeUndefined();
  });
});

describe("Open Redirect Protection (isValidRedirectUrl & sanitizeReturnTo)", () => {
  it("accepts valid relative redirect paths", () => {
    expect(isValidRedirectUrl("/apps/finance")).toBe(true);
    expect(isValidRedirectUrl("/apps/admin/settings?tab=security")).toBe(true);
    expect(isValidRedirectUrl("/")).toBe(true);

    expect(sanitizeReturnTo("/apps/finance")).toBe("/apps/finance");
  });

  it("rejects protocol-relative open redirect attacks (//evil.com)", () => {
    expect(isValidRedirectUrl("//evil.com")).toBe(false);
    expect(isValidRedirectUrl("//evil.com/path")).toBe(false);

    expect(sanitizeReturnTo("//evil.com")).toBe("/");
  });

  it("rejects absolute URLs with scheme (https://evil.com)", () => {
    expect(isValidRedirectUrl("https://evil.com")).toBe(false);
    expect(isValidRedirectUrl("http://evil.com/apps/finance")).toBe(false);
    expect(isValidRedirectUrl("javascript:alert(1)")).toBe(false);

    expect(sanitizeReturnTo("https://evil.com")).toBe("/");
  });

  it("rejects backslash evasion attempts (/\\evil.com)", () => {
    expect(isValidRedirectUrl("/\\evil.com")).toBe(false);
    expect(isValidRedirectUrl("\\evil.com")).toBe(false);

    expect(sanitizeReturnTo("/\\evil.com")).toBe("/");
  });

  it("defaults empty, null, or undefined to '/'", () => {
    expect(isValidRedirectUrl("")).toBe(false);
    expect(isValidRedirectUrl(null)).toBe(false);
    expect(isValidRedirectUrl(undefined)).toBe(false);

    expect(sanitizeReturnTo("")).toBe("/");
    expect(sanitizeReturnTo(null)).toBe("/");
    expect(sanitizeReturnTo(undefined)).toBe("/");
  });
});

describe("verifyGatewaySecret (Timing-Safe Comparison)", () => {
  const secret = "super-secret-gateway-token-value-12345";

  it("returns true for matching secret", () => {
    expect(verifyGatewaySecret(secret, secret)).toBe(true);
  });

  it("returns false for mismatched secret", () => {
    expect(verifyGatewaySecret("attacker-provided-token-wrong", secret)).toBe(false);
  });

  it("returns false safely when lengths differ", () => {
    expect(verifyGatewaySecret("short", secret)).toBe(false);
  });

  it("returns false for null or empty secret", () => {
    expect(verifyGatewaySecret(null, secret)).toBe(false);
    expect(verifyGatewaySecret("", secret)).toBe(false);
  });
});

describe("computeAuthAgeMinutes", () => {
  const baseTime = new Date("2026-10-12T12:30:00.000Z");

  it("returns 0 when authenticated right now", () => {
    expect(computeAuthAgeMinutes(baseTime.toISOString(), baseTime)).toBe(0);
  });

  it("returns 15 for an authentication exactly 15 minutes ago", () => {
    const authTime = new Date("2026-10-12T12:15:00.000Z");
    expect(computeAuthAgeMinutes(authTime.toISOString(), baseTime)).toBe(15);
  });

  it("returns 20 for an authentication 20 minutes and 30 seconds ago", () => {
    const authTime = new Date("2026-10-12T12:09:30.000Z");
    expect(computeAuthAgeMinutes(authTime.toISOString(), baseTime)).toBe(20);
  });

  it("clamps future timestamps to 0", () => {
    const futureTime = new Date("2026-10-12T13:00:00.000Z");
    expect(computeAuthAgeMinutes(futureTime.toISOString(), baseTime)).toBe(0);
  });

  it("returns undefined for invalid, empty, or non-string inputs", () => {
    expect(computeAuthAgeMinutes("invalid-date-string", baseTime)).toBeUndefined();
    expect(computeAuthAgeMinutes("", baseTime)).toBeUndefined();
    expect(computeAuthAgeMinutes(null, baseTime)).toBeUndefined();
    expect(computeAuthAgeMinutes(undefined, baseTime)).toBeUndefined();
  });
});

describe("applySimulation", () => {
  const baseDate = new Date("2026-10-12T10:00:00.000Z");
  const baseInputs = { country: "US", timestamp: baseDate };

  const fakeSession = {
    userId: "admin-1",
    role: "admin",
    deviceSecure: true,
    authenticatedAt: baseDate.toISOString(),
    simulatedCountry: "DE",
    simulatedTime: "15:45",
  };

  it("overrides country and time when DEMO_MODE is true", () => {
    const result = applySimulation(baseInputs, fakeSession, true);

    expect(result.effectiveCountry).toBe("DE");
    expect(result.effectiveTimestamp.toISOString()).toBe("2026-10-12T15:45:00.000Z");
    expect(result.simulated).toEqual({
      country: "DE",
      time: "15:45",
      deviceSecure: true,
    });
  });

  it("ignores session simulation overrides when DEMO_MODE is false", () => {
    const result = applySimulation(baseInputs, fakeSession, false);

    expect(result.effectiveCountry).toBe("US");
    expect(result.effectiveTimestamp.toISOString()).toBe("2026-10-12T10:00:00.000Z");
    expect(result.simulated).toEqual({
      country: undefined,
      time: undefined,
      deviceSecure: true,
    });
  });

  it("handles NONE reset values gracefully", () => {
    const sessionWithNone = {
      ...fakeSession,
      simulatedCountry: "NONE",
      simulatedTime: "NONE",
    };

    const result = applySimulation(baseInputs, sessionWithNone, true);

    expect(result.effectiveCountry).toBe("US");
    expect(result.effectiveTimestamp.toISOString()).toBe("2026-10-12T10:00:00.000Z");
    expect(result.simulated.country).toBeUndefined();
    expect(result.simulated.time).toBeUndefined();
  });

  it("preserves UTC date while changing UTC hours and minutes", () => {
    const result = applySimulation(baseInputs, { ...fakeSession, simulatedTime: "23:59" }, true);

    expect(result.effectiveTimestamp.getUTCFullYear()).toBe(2026);
    expect(result.effectiveTimestamp.getUTCMonth()).toBe(9); // 0-indexed October
    expect(result.effectiveTimestamp.getUTCDate()).toBe(12);
    expect(result.effectiveTimestamp.getUTCHours()).toBe(23);
    expect(result.effectiveTimestamp.getUTCMinutes()).toBe(59);
  });
});

describe("Demo Console Schemas (Zod)", () => {
  it("validates allowed demo countries and rejects invalid ones", () => {
    expect(DemoCountrySchema.safeParse("US").success).toBe(true);
    expect(DemoCountrySchema.safeParse("IN").success).toBe(true);
    expect(DemoCountrySchema.safeParse("DE").success).toBe(true);
    expect(DemoCountrySchema.safeParse("RU").success).toBe(true);
    expect(DemoCountrySchema.safeParse("CN").success).toBe(true);
    expect(DemoCountrySchema.safeParse("NONE").success).toBe(true);

    expect(DemoCountrySchema.safeParse("XX").success).toBe(false);
    expect(DemoCountrySchema.safeParse("FR").success).toBe(false);
    expect(DemoCountrySchema.safeParse("").success).toBe(false);
  });

  it("validates 24-hour time format and NONE", () => {
    expect(DemoTimeSchema.safeParse("09:00").success).toBe(true);
    expect(DemoTimeSchema.safeParse("14:30").success).toBe(true);
    expect(DemoTimeSchema.safeParse("23:59").success).toBe(true);
    expect(DemoTimeSchema.safeParse("00:00").success).toBe(true);
    expect(DemoTimeSchema.safeParse("NONE").success).toBe(true);

    expect(DemoTimeSchema.safeParse("24:00").success).toBe(false);
    expect(DemoTimeSchema.safeParse("12:60").success).toBe(false);
    expect(DemoTimeSchema.safeParse("9:00").success).toBe(false);
    expect(DemoTimeSchema.safeParse("invalid").success).toBe(false);
  });

  it("validates discriminated union actions", () => {
    expect(DemoConsoleActionSchema.safeParse({ intent: "toggleDevicePosture" }).success).toBe(true);
    expect(DemoConsoleActionSchema.safeParse({ intent: "ageLogin" }).success).toBe(true);
    expect(DemoConsoleActionSchema.safeParse({ intent: "setCountry", country: "DE" }).success).toBe(true);
    expect(DemoConsoleActionSchema.safeParse({ intent: "setTime", time: "18:00" }).success).toBe(true);
    expect(DemoConsoleActionSchema.safeParse({ intent: "setLoginAge", ageMinutes: 20 }).success).toBe(true);
    expect(DemoConsoleActionSchema.safeParse({ intent: "setLoginAge", ageMinutes: "0" }).success).toBe(true);
    expect(DemoConsoleActionSchema.safeParse({ intent: "setLoginAge", ageMinutes: "60" }).success).toBe(true);

    expect(DemoConsoleActionSchema.safeParse({ intent: "invalidIntent" }).success).toBe(false);
    expect(DemoConsoleActionSchema.safeParse({ intent: "setCountry", country: "INVALID" }).success).toBe(false);
    expect(DemoConsoleActionSchema.safeParse({ intent: "setLoginAge", ageMinutes: -1 }).success).toBe(false);
    expect(DemoConsoleActionSchema.safeParse({ intent: "setLoginAge", ageMinutes: "abc" }).success).toBe(false);
  });
});

describe("authenticatedAtFromAge", () => {
  const baseTime = new Date("2026-10-12T12:00:00.000Z");

  it("calculates correct ISO timestamps for 0, 20, and 1440 minutes ago", () => {
    // 0 minutes: same timestamp
    expect(authenticatedAtFromAge(0, baseTime)).toBe("2026-10-12T12:00:00.000Z");

    // 20 minutes ago: 11:40:00.000Z
    expect(authenticatedAtFromAge(20, baseTime)).toBe("2026-10-12T11:40:00.000Z");

    // 1440 minutes (24 hours) ago: 2026-10-11T12:00:00.000Z
    expect(authenticatedAtFromAge(1440, baseTime)).toBe("2026-10-11T12:00:00.000Z");
  });

  it("round trips cleanly with computeAuthAgeMinutes (age 20 gives 20, age 0 gives 0, age 1440 gives 1440)", () => {
    const age0Timestamp = authenticatedAtFromAge(0, baseTime);
    expect(computeAuthAgeMinutes(age0Timestamp, baseTime)).toBe(0);

    const age20Timestamp = authenticatedAtFromAge(20, baseTime);
    expect(computeAuthAgeMinutes(age20Timestamp, baseTime)).toBe(20);

    const age1440Timestamp = authenticatedAtFromAge(1440, baseTime);
    expect(computeAuthAgeMinutes(age1440Timestamp, baseTime)).toBe(1440);
  });
});

describe("LoginAgeMinutesSchema", () => {
  it("accepts valid numbers and coerced strings (0, 20, 1440)", () => {
    expect(LoginAgeMinutesSchema.parse(0)).toBe(0);
    expect(LoginAgeMinutesSchema.parse(20)).toBe(20);
    expect(LoginAgeMinutesSchema.parse(1440)).toBe(1440);

    expect(LoginAgeMinutesSchema.parse("0")).toBe(0);
    expect(LoginAgeMinutesSchema.parse("20")).toBe(20);
    expect(LoginAgeMinutesSchema.parse("1440")).toBe(1440);
    expect(LoginAgeMinutesSchema.parse(" 20 ")).toBe(20);
  });

  it("rejects invalid inputs: NaN, negatives, decimals, empty, non-numeric, out-of-range", () => {
    // NaN
    expect(LoginAgeMinutesSchema.safeParse(Number.NaN).success).toBe(false);

    // Negatives
    expect(LoginAgeMinutesSchema.safeParse(-1).success).toBe(false);
    expect(LoginAgeMinutesSchema.safeParse("-1").success).toBe(false);
    expect(LoginAgeMinutesSchema.safeParse("-20").success).toBe(false);

    // Decimals
    expect(LoginAgeMinutesSchema.safeParse(10.5).success).toBe(false);
    expect(LoginAgeMinutesSchema.safeParse("20.5").success).toBe(false);
    expect(LoginAgeMinutesSchema.safeParse("0.1").success).toBe(false);

    // Empty or whitespace
    expect(LoginAgeMinutesSchema.safeParse("").success).toBe(false);
    expect(LoginAgeMinutesSchema.safeParse("   ").success).toBe(false);
    expect(LoginAgeMinutesSchema.safeParse(null).success).toBe(false);
    expect(LoginAgeMinutesSchema.safeParse(undefined).success).toBe(false);

    // Non-numeric
    expect(LoginAgeMinutesSchema.safeParse("abc").success).toBe(false);
    expect(LoginAgeMinutesSchema.safeParse("20min").success).toBe(false);

    // Out of range (> 1440)
    expect(LoginAgeMinutesSchema.safeParse(1441).success).toBe(false);
    expect(LoginAgeMinutesSchema.safeParse("1441").success).toBe(false);
    expect(LoginAgeMinutesSchema.safeParse("5000").success).toBe(false);
  });
});
