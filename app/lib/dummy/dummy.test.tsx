import React from "react";
import { describe, expect, it } from "vitest";
import {
  EMPLOYEES,
  getEmployeeById,
  getInvoiceById,
  INVOICES,
  LEAVE_REQUESTS,
  PAYROLL_SUMMARY,
  SYSTEM_ACCOUNTS,
  SYSTEM_SETTINGS,
} from "./data";
import { gatewayHref, verifyGatewayRequest } from "./helpers";
import {
  AdminAuditNotePage,
  DummyLayout,
  FinanceInvoiceApprovedPage,
  renderDummyAppPage,
} from "./views";

describe("verifyGatewayRequest (Bypass Protection)", () => {
  const trustedSecret = "test-super-secret-gateway-token-123";

  it("accepts request with valid secret and extracts identity headers", () => {
    const req = new Request("http://localhost:5173/dummy/hr", {
      headers: {
        "x-gateway-secret": trustedSecret,
        "x-gateway-user-id": "alice.security",
        "x-gateway-user-role": "admin",
      },
    });

    const result = verifyGatewayRequest(req, trustedSecret);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe("alice.security");
      expect(result.role).toBe("admin");
    }
  });

  it("falls back to default identity strings when identity headers are absent", () => {
    const req = new Request("http://localhost:5173/dummy/hr", {
      headers: {
        "x-gateway-secret": trustedSecret,
      },
    });

    const result = verifyGatewayRequest(req, trustedSecret);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe("anonymous");
      expect(result.role).toBe("unknown");
    }
  });

  it("rejects request when x-gateway-secret is missing with 403 Direct access not allowed", async () => {
    const req = new Request("http://localhost:5173/dummy/hr", {
      headers: {
        "x-gateway-user-id": "attacker",
        "x-gateway-user-role": "admin",
      },
    });

    const result = verifyGatewayRequest(req, trustedSecret);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      expect(result.response.headers.get("Cache-Control")).toBe("no-store");
      const text = await result.response.text();
      expect(text).toBe("Direct access not allowed");
    }
  });

  it("rejects request when secret is wrong (same length)", async () => {
    const wrongSecret = "test-super-secret-gateway-token-999";
    const req = new Request("http://localhost:5173/dummy/finance", {
      headers: {
        "x-gateway-secret": wrongSecret,
      },
    });

    const result = verifyGatewayRequest(req, trustedSecret);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      const text = await result.response.text();
      expect(text).toBe("Direct access not allowed");
    }
  });

  it("handles wrong length secret gracefully without throwing (timingSafeEqual safety)", async () => {
    // Shorter secret
    const shortReq = new Request("http://localhost:5173/dummy/admin", {
      headers: { "x-gateway-secret": "short" },
    });
    expect(() => verifyGatewayRequest(shortReq, trustedSecret)).not.toThrow();
    const shortResult = verifyGatewayRequest(shortReq, trustedSecret);
    expect(shortResult.ok).toBe(false);
    if (!shortResult.ok) {
      expect(shortResult.response.status).toBe(403);
    }

    // Longer secret
    const longReq = new Request("http://localhost:5173/dummy/admin", {
      headers: {
        "x-gateway-secret": "test-super-secret-gateway-token-123-extra-bytes-padding",
      },
    });
    expect(() => verifyGatewayRequest(longReq, trustedSecret)).not.toThrow();
    const longResult = verifyGatewayRequest(longReq, trustedSecret);
    expect(longResult.ok).toBe(false);
  });

  it("ensures identity headers are completely ignored when secret is invalid", () => {
    const maliciousReq = new Request("http://localhost:5173/dummy/admin", {
      headers: {
        "x-gateway-secret": "invalid-secret",
        "x-gateway-user-id": "spoofed-admin-root",
        "x-gateway-user-role": "super-admin",
      },
    });

    const result = verifyGatewayRequest(maliciousReq, trustedSecret);
    expect(result.ok).toBe(false);
    // Identity fields must not exist on failure
    expect((result as Record<string, unknown>).userId).toBeUndefined();
    expect((result as Record<string, unknown>).role).toBeUndefined();
  });
});

describe("gatewayHref (Reverse-Proxy Link Normalization)", () => {
  it("builds clean gateway links for root app path", () => {
    expect(gatewayHref("hr")).toBe("/apps/hr");
    expect(gatewayHref("finance")).toBe("/apps/finance");
    expect(gatewayHref("admin")).toBe("/apps/admin");
    expect(gatewayHref("hr", "")).toBe("/apps/hr");
  });

  it("builds links for normal paths", () => {
    expect(gatewayHref("hr", "employees")).toBe("/apps/hr/employees");
    expect(gatewayHref("finance", "invoices/inv-101")).toBe(
      "/apps/finance/invoices/inv-101"
    );
    expect(gatewayHref("admin", "settings")).toBe("/apps/admin/settings");
  });

  it("handles leading and trailing slashes correctly", () => {
    expect(gatewayHref("/hr/", "/employees/")).toBe("/apps/hr/employees");
    expect(gatewayHref("finance", "/invoices/123/")).toBe(
      "/apps/finance/invoices/123"
    );
  });

  it("collapses multiple consecutive slashes", () => {
    expect(gatewayHref("hr", "employees///emp-01")).toBe(
      "/apps/hr/employees/emp-01"
    );
  });

  it("never produces a path starting with /dummy", () => {
    const href1 = gatewayHref("hr", "employees");
    const href2 = gatewayHref("finance", "invoices");
    const href3 = gatewayHref("admin", "audit-note");

    expect(href1.startsWith("/dummy")).toBe(false);
    expect(href2.startsWith("/dummy")).toBe(false);
    expect(href3.startsWith("/dummy")).toBe(false);

    expect(href1.startsWith("/apps/")).toBe(true);
    expect(href2.startsWith("/apps/")).toBe(true);
    expect(href3.startsWith("/apps/")).toBe(true);
  });

  it("throws when destination targets dummy directly", () => {
    expect(() => gatewayHref("dummy/hr", "employees")).toThrow(
      "gatewayHref: destination must target /apps, never /dummy"
    );
    expect(() => gatewayHref("hr", "dummy/employees")).toThrow(
      "gatewayHref: path segment must not target /dummy"
    );
  });

  it("throws when app parameter is empty", () => {
    expect(() => gatewayHref("")).toThrow("gatewayHref: app parameter is required");
    expect(() => gatewayHref("   ")).toThrow("gatewayHref: app parameter is required");
  });
});

describe("Dummy App Fictional Data Integrity", () => {
  it("contains 12 employees with unique IDs and fictional contacts", () => {
    expect(EMPLOYEES.length).toBe(12);

    const ids = EMPLOYEES.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(12);

    for (const emp of EMPLOYEES) {
      expect(emp.email.endsWith("@example.com")).toBe(true);
      expect(emp.phone).toMatch(/^555-\d{4}$/);
      expect(emp.name.trim().length).toBeGreaterThan(0);
      expect(emp.department.trim().length).toBeGreaterThan(0);
    }
  });

  it("getEmployeeById returns matching employee or null", () => {
    // Valid lookup
    const found = getEmployeeById("emp-01");
    expect(found).not.toBeNull();
    expect(found?.name).toBe("Elena Rostova");

    // Case-insensitive lookup
    const foundUpper = getEmployeeById("EMP-01");
    expect(foundUpper).not.toBeNull();
    expect(foundUpper?.id).toBe("emp-01");

    // All employees resolve correctly
    for (const emp of EMPLOYEES) {
      expect(getEmployeeById(emp.id)?.id).toBe(emp.id);
    }

    // Invalid lookup returns null
    expect(getEmployeeById("emp-999")).toBeNull();
    expect(getEmployeeById("")).toBeNull();
  });

  it("contains 10 invoices with unique IDs and positive amounts", () => {
    expect(INVOICES.length).toBe(10);

    const ids = INVOICES.map((i) => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(10);

    for (const inv of INVOICES) {
      expect(inv.amount).toBeGreaterThan(0);
      expect(inv.vendor.trim().length).toBeGreaterThan(0);
      expect(["Pending", "Approved", "Paid"]).toContain(inv.status);
    }
  });

  it("getInvoiceById returns matching invoice or null", () => {
    const found = getInvoiceById("inv-101");
    expect(found).not.toBeNull();
    expect(found?.vendor).toBe("CloudScale Infrastructure LLC");

    // Case-insensitive lookup
    const foundUpper = getInvoiceById("INV-101");
    expect(foundUpper).not.toBeNull();
    expect(foundUpper?.id).toBe("inv-101");

    // All invoices resolve correctly
    for (const inv of INVOICES) {
      expect(getInvoiceById(inv.id)?.id).toBe(inv.id);
    }

    // Invalid lookup returns null
    expect(getInvoiceById("inv-999")).toBeNull();
    expect(getInvoiceById("")).toBeNull();
  });

  it("validates leave requests have unique IDs", () => {
    const ids = LEAVE_REQUESTS.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(LEAVE_REQUESTS.length);
  });

  it("validates system accounts have unique IDs and usernames", () => {
    const ids = SYSTEM_ACCOUNTS.map((a) => a.id);
    const usernames = SYSTEM_ACCOUNTS.map((a) => a.username);
    expect(new Set(ids).size).toBe(SYSTEM_ACCOUNTS.length);
    expect(new Set(usernames).size).toBe(SYSTEM_ACCOUNTS.length);
  });

  it("validates system settings have unique names", () => {
    const names = SYSTEM_SETTINGS.map((s) => s.name);
    expect(new Set(names).size).toBe(SYSTEM_SETTINGS.length);
  });

  it("validates payroll summary aggregate fields", () => {
    expect(PAYROLL_SUMMARY.headcount).toBeGreaterThan(0);
    expect(PAYROLL_SUMMARY.departmentBreakdown.length).toBeGreaterThan(0);
  });
});

describe("Rendered Dummy Pages & Security Rules", () => {
  it("renders static markup with required badges, banners, and links", () => {
    const html = renderDummyAppPage(
      <DummyLayout
        app="hr"
        userId="alice.test"
        role="admin"
        activePath="employees"
      >
        <div>Test Content</div>
      </DummyLayout>
    );

    // Fictional data banner
    expect(html).toContain("All data on this page is fictional");

    // Verification badge
    expect(html).toContain("Served by upstream, reached via gateway");

    // Identity strip
    expect(html).toContain("Signed in as:");
    expect(html).toContain("alice.test");
    expect(html).toContain("(admin)");

    // Demo navigation link
    expect(html).toContain('href="/demo"');

    // Content rendered
    expect(html).toContain("Test Content");

    // No client scripts (zero hydration)
    expect(html).not.toContain("<script");
  });

  it("renders non-GET approved page with exact text required by spec", () => {
    const html = renderDummyAppPage(
      <DummyLayout
        app="finance"
        userId="bob.finance"
        role="finance"
        activePath="invoices/inv-101/approve"
      >
        <FinanceInvoiceApprovedPage app="finance" invoiceId="inv-101" />
      </DummyLayout>
    );

    expect(html).toContain(
      "Invoice inv-101 approved (demo only, nothing was saved)"
    );
  });

  it("renders admin audit-note page linking to /admin/logs", () => {
    const html = renderDummyAppPage(
      <DummyLayout
        app="admin"
        userId="alice.admin"
        role="admin"
        activePath="audit-note"
      >
        <AdminAuditNotePage app="admin" />
      </DummyLayout>
    );

    expect(html).toContain('href="/admin/logs"');
    expect(html).toContain("Gateway Audit Logs Dashboard");
  });
});
