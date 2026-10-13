import { describe, expect, it } from "vitest";
import { assertSameOrigin } from "../adminAuth.server";
import { bucketRequestsOverTime, csvEscape, maskIp } from "./helpers";
import { AuditLogFilterSchema, OverviewRangeSchema } from "./schemas";

describe("maskIp", () => {
  it("masks valid IPv4 addresses by replacing the last octet with xxx", () => {
    expect(maskIp("203.0.113.195")).toBe("203.0.113.xxx");
    expect(maskIp("192.168.1.1")).toBe("192.168.1.xxx");
    expect(maskIp("10.0.0.254")).toBe("10.0.0.xxx");
  });

  it("masks valid IPv6 addresses by keeping the first two groups then ::xxxx", () => {
    expect(maskIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe("2001:0db8::xxxx");
    expect(maskIp("2001:db8::1")).toBe("2001:db8::xxxx");
    expect(maskIp("fe80::1")).toBe("fe80:1::xxxx");
    expect(maskIp("::1")).toBe("::xxxx");
  });

  it("handles null, undefined, empty string, and whitespace", () => {
    expect(maskIp(null)).toBe("-");
    expect(maskIp(undefined)).toBe("-");
    expect(maskIp("")).toBe("-");
    expect(maskIp("   ")).toBe("-");
  });

  it("handles garbage or invalid inputs gracefully", () => {
    expect(maskIp("not-an-ip")).toBe("-");
    expect(maskIp("123.456")).toBe("-");
    expect(maskIp("999.999.999.999")).toBe("-");
    expect(maskIp("invalid:ipv6:garbage:xyz")).toBe("-");
  });
});

describe("csvEscape", () => {
  it("handles standard text without alteration", () => {
    expect(csvEscape("simple")).toBe("simple");
    expect(csvEscape(12345)).toBe("12345");
  });

  it("handles null and undefined as empty string", () => {
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
  });

  it("wraps fields containing commas, quotes, or newlines in double quotes and escapes internal quotes", () => {
    expect(csvEscape("hello, world")).toBe('"hello, world"');
    expect(csvEscape('hello "world"')).toBe('"hello ""world"""');
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
    expect(csvEscape("line1\r\nline2")).toBe('"line1\r\nline2"');
  });

  it("prevents CSV formula injection by prepending a single quote to =, +, -, @ prefixes", () => {
    expect(csvEscape("=1+2")).toBe("'=1+2");
    expect(csvEscape("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0");
    expect(csvEscape("-payload")).toBe("'-payload");
    expect(csvEscape("@user")).toBe("'@user");
    expect(csvEscape("@SUM(1,2)")).toBe("\"'@SUM(1,2)\"");
  });

  it("properly handles formula prefixes combined with commas or quotes", () => {
    expect(csvEscape("=SUM(A1, B1)")).toBe("\"'=SUM(A1, B1)\"");
    expect(csvEscape('-danger, with "quotes"')).toBe("\"'-danger, with \"\"quotes\"\"\"");
  });
});

describe("AuditLogFilterSchema & OverviewRangeSchema", () => {
  it("validates correct range and filter params", () => {
    const parsedRange = OverviewRangeSchema.parse("1h");
    expect(parsedRange).toBe("1h");

    const parsedFilter = AuditLogFilterSchema.parse({
      decision: "DENY",
      app: "finance",
      user: "demo-finance",
      from: "2026-10-12T00:00:00Z",
      to: "2026-10-13T00:00:00Z",
      q: "/invoices",
      page: 3,
    });

    expect(parsedFilter.decision).toBe("DENY");
    expect(parsedFilter.app).toBe("finance");
    expect(parsedFilter.user).toBe("demo-finance");
    expect(parsedFilter.q).toBe("/invoices");
    expect(parsedFilter.page).toBe(3);
  });

  it("gracefully falls back on missing or invalid params without throwing", () => {
    const defaultRange = OverviewRangeSchema.parse(undefined);
    expect(defaultRange).toBe("24h");

    const invalidRange = OverviewRangeSchema.parse("invalid-range");
    expect(invalidRange).toBe("24h");

    const invalidFilter = AuditLogFilterSchema.parse({
      decision: "MALICIOUS_DECISION",
      page: -10,
      from: "invalid-date-format",
      to: "not-a-date",
    });

    expect(invalidFilter.decision).toBe("all");
    expect(invalidFilter.page).toBe(1);
    expect(invalidFilter.from).toBeUndefined();
    expect(invalidFilter.to).toBeUndefined();
  });
});

describe("bucketRequestsOverTime", () => {
  const baseNow = new Date("2026-10-13T12:00:00Z");

  it("creates 12 5-minute buckets for 1h range", () => {
    const buckets = bucketRequestsOverTime([], "1h", baseNow);
    expect(buckets).toHaveLength(12);
    expect(buckets[0].total).toBe(0);
    expect(buckets[11].total).toBe(0);
    expect(buckets[11].timeEnd.getTime()).toBe(baseNow.getTime());
  });

  it("creates 24 1-hour buckets for 24h range and aggregates events correctly", () => {
    const events = [
      // 30 minutes before baseNow
      { createdAt: new Date("2026-10-13T11:30:00Z"), decision: "ALLOW" as const },
      { createdAt: new Date("2026-10-13T11:45:00Z"), decision: "DENY" as const },
      // 2 hours before baseNow
      { createdAt: new Date("2026-10-13T10:15:00Z"), decision: "STEP_UP" as const },
      // Outside 24h window (26 hours ago) -> should be ignored
      { createdAt: new Date("2026-10-12T09:00:00Z"), decision: "ALLOW" as const },
    ];

    const buckets = bucketRequestsOverTime(events, "24h", baseNow);
    expect(buckets).toHaveLength(24);

    // The last bucket (11:00 - 12:00) should have 1 allow, 1 deny, total 2
    const lastBucket = buckets[23];
    expect(lastBucket.allow).toBe(1);
    expect(lastBucket.deny).toBe(1);
    expect(lastBucket.total).toBe(2);

    // The bucket before that (10:00 - 11:00) should have 1 stepUp
    const prevBucket = buckets[22];
    expect(prevBucket.stepUp).toBe(1);
    expect(prevBucket.total).toBe(1);
  });

  it("handles empty event lists gracefully", () => {
    const buckets = bucketRequestsOverTime([], "24h", baseNow);
    expect(buckets.every((b) => b.total === 0)).toBe(true);
  });
});

describe("assertSameOrigin", () => {
  it("allows requests where Origin matches request URL origin", () => {
    const req = new Request("https://gateway.example.com/admin/actions", {
      headers: { origin: "https://gateway.example.com" },
    });
    expect(assertSameOrigin(req)).toBe(true);
  });

  it("allows requests where Origin is absent but Referer matches request URL origin", () => {
    const req = new Request("https://gateway.example.com/admin/actions", {
      headers: { referer: "https://gateway.example.com/admin/overview" },
    });
    expect(assertSameOrigin(req)).toBe(true);
  });

  it("rejects requests where Origin mismatches request URL origin", () => {
    const req = new Request("https://gateway.example.com/admin/actions", {
      headers: { origin: "https://evil-attacker.com" },
    });
    expect(() => assertSameOrigin(req)).toThrowError();
  });

  it("rejects requests where Referer mismatches request URL origin", () => {
    const req = new Request("https://gateway.example.com/admin/actions", {
      headers: { referer: "https://evil-attacker.com/malicious" },
    });
    expect(() => assertSameOrigin(req)).toThrowError();
  });

  it("rejects requests where both Origin and Referer are missing", () => {
    const req = new Request("https://gateway.example.com/admin/actions");
    expect(() => assertSameOrigin(req)).toThrowError();
  });
});
