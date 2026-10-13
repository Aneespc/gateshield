import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  type Employee,
  EMPLOYEES,
  type Invoice,
  INVOICES,
  LEAVE_REQUESTS,
  PAYROLL_SUMMARY,
  SYSTEM_ACCOUNTS,
  SYSTEM_SETTINGS,
} from "./data";
import { gatewayHref } from "./helpers";

// -------------------------------------------------------------
// App Theme Metadata
// -------------------------------------------------------------

interface AppTheme {
  name: string;
  icon: string;
  accentBadge: string;
  accentBorder: string;
  tagline: string;
}

const APP_THEMES: Record<string, AppTheme> = {
  hr: {
    name: "HR Portal",
    icon: "👥",
    accentBadge: "bg-indigo-950 text-indigo-300 border-indigo-700/60",
    accentBorder: "border-indigo-800/40",
    tagline: "Corporate People Operations & Directory",
  },
  finance: {
    name: "Finance Hub",
    icon: "💳",
    accentBadge: "bg-emerald-950 text-emerald-300 border-emerald-700/60",
    accentBorder: "border-emerald-800/40",
    tagline: "Accounts Payable, Treasury & Ledger",
  },
  admin: {
    name: "Admin Console",
    icon: "⚙️",
    accentBadge: "bg-rose-950 text-rose-300 border-rose-700/60",
    accentBorder: "border-rose-800/40",
    tagline: "System Administration & Security Governance",
  },
};

// -------------------------------------------------------------
// Shared Layout Component
// -------------------------------------------------------------

interface DummyLayoutProps {
  app: "hr" | "finance" | "admin";
  userId: string;
  role: string;
  activePath: string;
  children: React.ReactNode;
}

export function DummyLayout({
  app,
  userId,
  role,
  activePath,
  children,
}: DummyLayoutProps) {
  const theme = APP_THEMES[app] || APP_THEMES.hr;

  const hrLinks = [
    { label: "Overview", path: "" },
    { label: "Directory", path: "employees" },
    { label: "Leave Requests", path: "leave" },
    { label: "WhoAmI (API)", path: "api/whoami" },
  ];

  const financeLinks = [
    { label: "Overview", path: "" },
    { label: "Invoices", path: "invoices" },
    { label: "Payroll", path: "payroll" },
    { label: "WhoAmI (API)", path: "api/whoami" },
  ];

  const adminLinks = [
    { label: "Overview", path: "" },
    { label: "Accounts", path: "users" },
    { label: "Settings", path: "settings" },
    { label: "Audit Note", path: "audit-note" },
    { label: "WhoAmI (API)", path: "api/whoami" },
  ];

  const links =
    app === "hr" ? hrLinks : app === "finance" ? financeLinks : adminLinks;

  return (
    <div className="layout-container">
      {/* Top Banner: Fictional Data Notice */}
      <div className="fictional-banner">
        ⚠️ <strong>Notice:</strong> All data on this page is fictional and generated for simulation and demonstration.
      </div>

      {/* Upstream Navigation Bar */}
      <header className="upstream-header">
        <div className="header-left">
          <div className="app-icon">{theme.icon}</div>
          <div>
            <div className="header-title-row">
              <span className="app-name">{theme.name}</span>
              <span className={`status-badge ${theme.accentBadge}`}>
                Upstream Mock
              </span>
              <span className="gateway-verified-badge">
                ✓ Served by upstream, reached via gateway
              </span>
            </div>
            <p className="app-tagline">{theme.tagline}</p>
          </div>
        </div>

        {/* Identity Strip */}
        <div className="identity-strip">
          <span className="identity-label">Signed in as:</span>
          <span className="identity-user">{userId}</span>
          <span className="identity-role">({role})</span>
        </div>
      </header>

      {/* App Subnavigation Bar */}
      <nav className="subnav-bar">
        <div className="subnav-links">
          {links.map((link) => {
            const href = gatewayHref(app, link.path);
            const isMatch =
              link.path === ""
                ? activePath === "" || activePath === "/"
                : activePath.startsWith(link.path);

            return (
              <a
                key={link.label}
                href={href}
                className={`subnav-link ${isMatch ? "active" : ""}`}
              >
                {link.label}
              </a>
            );
          })}
        </div>

        <div className="subnav-shortcuts">
          <a href="/demo" className="shortcut-link">
            Demo Console
          </a>
          <a href="/login" className="shortcut-link">
            Switch Persona
          </a>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="content-area">{children}</main>

      {/* Footer */}
      <footer className="upstream-footer">
        <div>
          Protected by <strong>GateShield</strong> • Shared Secret Attested
        </div>
        <div className="footer-links">
          <a href="/demo">← Back to Demo Console</a>
          <span>•</span>
          <a href="/admin/logs">Gateway Audit Logs</a>
          <span>•</span>
          <a href="/login">Sign In / Switch Persona</a>
        </div>
      </footer>
    </div>
  );
}

// -------------------------------------------------------------
// HR Portal Pages
// -------------------------------------------------------------

export function HrIndexPage({ app }: { app: string }) {
  return (
    <div className="space-y-6">
      <div className="page-intro">
        <h2>People & Organization Directory</h2>
        <p>
          Welcome to the HR management portal. Review company headcount, explore staff profiles, and oversee pending employee leave requests.
        </p>
      </div>

      <div className="cards-grid">
        <div className="summary-card">
          <div className="card-header">
            <h3>Employee Directory</h3>
            <span className="counter-pill">{EMPLOYEES.length} Active</span>
          </div>
          <p className="card-desc">
            Browse corporate employee records, roles, reporting chains, and directory contact info.
          </p>
          <a href={gatewayHref(app, "employees")} className="btn-action">
            View Directory →
          </a>
        </div>

        <div className="summary-card">
          <div className="card-header">
            <h3>Leave Requests</h3>
            <span className="counter-pill">{LEAVE_REQUESTS.length} Scheduled</span>
          </div>
          <p className="card-desc">
            Review submitted annual, parental, and educational leave entries.
          </p>
          <a href={gatewayHref(app, "leave")} className="btn-action">
            Review Leave →
          </a>
        </div>
      </div>
    </div>
  );
}

export function HrEmployeesPage({ app }: { app: string }) {
  return (
    <div className="space-y-6">
      <div className="page-header-row">
        <div>
          <h2>Employee Directory</h2>
          <p>Complete fictional roster of {EMPLOYEES.length} staff members across all business departments.</p>
        </div>
        <span className="tag-info">All emails @example.com</span>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Title</th>
              <th>Email</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {EMPLOYEES.map((emp) => (
              <tr key={emp.id}>
                <td className="font-mono text-muted">{emp.id}</td>
                <td className="font-semibold text-white">{emp.name}</td>
                <td>
                  <span className="dept-tag">{emp.department}</span>
                </td>
                <td>{emp.title}</td>
                <td className="font-mono text-muted">{emp.email}</td>
                <td>
                  <a
                    href={gatewayHref(app, `employees/${emp.id}`)}
                    className="table-link"
                  >
                    View Details →
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function HrEmployeeDetailPage({
  app,
  employee,
}: {
  app: string;
  employee: Employee;
}) {
  return (
    <div className="space-y-6">
      <div className="detail-card">
        <div className="detail-header">
          <div className="avatar-placeholder">
            {employee.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div>
            <h2>{employee.name}</h2>
            <p className="text-muted">
              {employee.title} • {employee.department}
            </p>
          </div>
        </div>

        <div className="properties-grid">
          <div className="property-item">
            <span className="property-label">Employee ID</span>
            <span className="property-value font-mono">{employee.id}</span>
          </div>
          <div className="property-item">
            <span className="property-label">Work Email</span>
            <span className="property-value font-mono">{employee.email}</span>
          </div>
          <div className="property-item">
            <span className="property-label">Telephone (555 range)</span>
            <span className="property-value font-mono">{employee.phone}</span>
          </div>
          <div className="property-item">
            <span className="property-label">Start Date</span>
            <span className="property-value">{employee.startDate}</span>
          </div>
          <div className="property-item">
            <span className="property-label">Direct Manager</span>
            <span className="property-value">{employee.manager}</span>
          </div>
          <div className="property-item">
            <span className="property-label">Employment Status</span>
            <span className="property-value text-emerald">Active Full-Time</span>
          </div>
        </div>

        <div className="detail-actions">
          <a href={gatewayHref(app, "employees")} className="btn-secondary">
            ← Back to Directory
          </a>
        </div>
      </div>
    </div>
  );
}

export function HrLeavePage({ app }: { app: string }) {
  return (
    <div className="space-y-6">
      <div className="page-header-row">
        <div>
          <h2>Leave Requests</h2>
          <p>Recent time-off schedules and status.</p>
        </div>
        <a href={gatewayHref(app, "employees")} className="btn-secondary">
          View Employees
        </a>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Employee</th>
              <th>Category</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {LEAVE_REQUESTS.map((req) => (
              <tr key={req.id}>
                <td className="font-mono text-muted">{req.id}</td>
                <td className="font-semibold text-white">{req.employeeName}</td>
                <td>{req.type}</td>
                <td className="font-mono">{req.startDate}</td>
                <td className="font-mono">{req.endDate}</td>
                <td>
                  <span
                    className={`status-pill ${
                      req.status === "Approved" ? "status-approved" : "status-pending"
                    }`}
                  >
                    {req.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Finance Hub Pages
// -------------------------------------------------------------

export function FinanceIndexPage({ app }: { app: string }) {
  return (
    <div className="space-y-6">
      <div className="page-intro">
        <h2>Treasury & Financial Operations</h2>
        <p>
          Corporate treasury console. Inspect external vendor payables, authorize purchase invoices, and view current monthly payroll allocations.
        </p>
      </div>

      <div className="cards-grid">
        <div className="summary-card">
          <div className="card-header">
            <h3>Vendor Invoices</h3>
            <span className="counter-pill">{INVOICES.length} Total</span>
          </div>
          <p className="card-desc">
            Manage incoming supplier charges, review compliance artifacts, and execute approval workflows.
          </p>
          <a href={gatewayHref(app, "invoices")} className="btn-action">
            Review Invoices →
          </a>
        </div>

        <div className="summary-card">
          <div className="card-header">
            <h3>Payroll Summary</h3>
            <span className="counter-pill">{PAYROLL_SUMMARY.totalGrossPay}</span>
          </div>
          <p className="card-desc">
            Aggregated corporate salary disbursements across {PAYROLL_SUMMARY.headcount} personnel.
          </p>
          <a href={gatewayHref(app, "payroll")} className="btn-action">
            Inspect Payroll →
          </a>
        </div>
      </div>
    </div>
  );
}

export function FinanceInvoicesPage({ app }: { app: string }) {
  return (
    <div className="space-y-6">
      <div className="page-header-row">
        <div>
          <h2>Accounts Payable Invoices</h2>
          <p>Fictional supplier charges awaiting review and payment authorization.</p>
        </div>
        <span className="tag-info">10 Fictional Invoices</span>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Invoice ID</th>
              <th>Vendor</th>
              <th>Amount (USD)</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((inv) => (
              <tr key={inv.id}>
                <td className="font-mono text-muted">{inv.id}</td>
                <td className="font-semibold text-white">{inv.vendor}</td>
                <td className="font-mono font-bold">
                  ${inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </td>
                <td className="font-mono text-muted">{inv.dueDate}</td>
                <td>
                  <span
                    className={`status-pill ${
                      inv.status === "Approved"
                        ? "status-approved"
                        : inv.status === "Paid"
                        ? "status-paid"
                        : "status-pending"
                    }`}
                  >
                    {inv.status}
                  </span>
                </td>
                <td>
                  <a
                    href={gatewayHref(app, `invoices/${inv.id}`)}
                    className="table-link"
                  >
                    Details & Approve →
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FinanceInvoiceDetailPage({
  app,
  invoice,
}: {
  app: string;
  invoice: Invoice;
}) {
  return (
    <div className="space-y-6">
      <div className="detail-card">
        <div className="detail-header">
          <div className="avatar-placeholder">📄</div>
          <div>
            <h2>Invoice {invoice.id}</h2>
            <p className="text-muted">{invoice.vendor}</p>
          </div>
        </div>

        <div className="properties-grid">
          <div className="property-item">
            <span className="property-label">Invoice Number</span>
            <span className="property-value font-mono">{invoice.id}</span>
          </div>
          <div className="property-item">
            <span className="property-label">Payable Vendor</span>
            <span className="property-value">{invoice.vendor}</span>
          </div>
          <div className="property-item">
            <span className="property-label">Total Amount</span>
            <span className="property-value font-mono font-bold text-emerald">
              ${invoice.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
            </span>
          </div>
          <div className="property-item">
            <span className="property-label">Payment Due Date</span>
            <span className="property-value font-mono">{invoice.dueDate}</span>
          </div>
          <div className="property-item">
            <span className="property-label">Current Status</span>
            <span className="property-value font-semibold">{invoice.status}</span>
          </div>
          <div className="property-item col-span-2">
            <span className="property-label">Service Description</span>
            <span className="property-value">{invoice.description}</span>
          </div>
        </div>

        {/* POST Action: Approve Form routed via gatewayHref */}
        <div className="approve-action-bar">
          <form
            method="post"
            action={gatewayHref("finance", `invoices/${invoice.id}/approve`)}
          >
            <button type="submit" className="btn-approve">
              ✓ Approve Invoice (Simulated POST)
            </button>
          </form>
          <a href={gatewayHref(app, "invoices")} className="btn-secondary">
            ← Back to Invoices
          </a>
        </div>
      </div>
    </div>
  );
}

export function FinanceInvoiceApprovedPage({
  app,
  invoiceId,
}: {
  app: string;
  invoiceId: string;
}) {
  return (
    <div className="space-y-6">
      <div className="success-card">
        <div className="success-icon">✓</div>
        <h2>Invoice {invoiceId} approved (demo only, nothing was saved)</h2>
        <p className="text-muted">
          This non-GET request was successfully intercepted by GateShield, evaluated against access policies, logged in the audit trail, and delivered to the upstream application.
        </p>

        <div className="detail-actions">
          <a href={gatewayHref(app, "invoices")} className="btn-action">
            Return to Invoices List →
          </a>
        </div>
      </div>
    </div>
  );
}

export function FinancePayrollPage({ app }: { app: string }) {
  return (
    <div className="space-y-6">
      <div className="page-header-row">
        <div>
          <h2>Corporate Payroll Allocation</h2>
          <p>Pay Period: {PAYROLL_SUMMARY.payPeriod}</p>
        </div>
        <span className="tag-info">Currency: {PAYROLL_SUMMARY.currency}</span>
      </div>

      <div className="properties-grid">
        <div className="property-item">
          <span className="property-label">Gross Monthly Pay</span>
          <span className="property-value font-mono font-bold text-emerald text-lg">
            {PAYROLL_SUMMARY.totalGrossPay}
          </span>
        </div>
        <div className="property-item">
          <span className="property-label">Covered Headcount</span>
          <span className="property-value font-mono font-bold">
            {PAYROLL_SUMMARY.headcount} Employees
          </span>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Department</th>
              <th>Monthly Budget Allocation</th>
              <th>Staff Headcount</th>
            </tr>
          </thead>
          <tbody>
            {PAYROLL_SUMMARY.departmentBreakdown.map((row) => (
              <tr key={row.department}>
                <td className="font-semibold text-white">{row.department}</td>
                <td className="font-mono">{row.allocation}</td>
                <td className="font-mono text-muted">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <a href={gatewayHref(app)} className="btn-secondary">
        ← Back to Overview
      </a>
    </div>
  );
}

// -------------------------------------------------------------
// Admin Console Pages
// -------------------------------------------------------------

export function AdminIndexPage({ app }: { app: string }) {
  return (
    <div className="space-y-6">
      <div className="page-intro">
        <h2>Enterprise Administration Console</h2>
        <p>
          Governing directory for system identities, security parameters, and cryptographic perimeter controls. Access is restricted to authenticated administrators on secure devices.
        </p>
      </div>

      <div className="cards-grid">
        <div className="summary-card">
          <div className="card-header">
            <h3>System Accounts</h3>
            <span className="counter-pill">{SYSTEM_ACCOUNTS.length} Registered</span>
          </div>
          <p className="card-desc">
            View administrative personnel, role allocations, account status, and MFA status.
          </p>
          <a href={gatewayHref(app, "users")} className="btn-action">
            Manage Accounts →
          </a>
        </div>

        <div className="summary-card">
          <div className="card-header">
            <h3>Security Settings</h3>
            <span className="counter-pill">Enforced</span>
          </div>
          <p className="card-desc">
            Inspect active perimeter configuration, cipher suites, and session lifetime policies.
          </p>
          <a href={gatewayHref(app, "settings")} className="btn-action">
            Review Settings →
          </a>
        </div>

        <div className="summary-card">
          <div className="card-header">
            <h3>Audit Log Notice</h3>
            <span className="counter-pill">Gateway Central</span>
          </div>
          <p className="card-desc">
            Read details about centralized zero trust evaluation logging and open the audit trail.
          </p>
          <a href={gatewayHref(app, "audit-note")} className="btn-action">
            Read Audit Note →
          </a>
        </div>
      </div>
    </div>
  );
}

export function AdminUsersPage({ app }: { app: string }) {
  return (
    <div className="space-y-6">
      <div className="page-header-row">
        <div>
          <h2>System Accounts</h2>
          <p>Configured administrative accounts and service identities.</p>
        </div>
        <span className="tag-info">{SYSTEM_ACCOUNTS.length} Total Accounts</span>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>MFA Enforced</th>
              <th>Last Sign-In</th>
            </tr>
          </thead>
          <tbody>
            {SYSTEM_ACCOUNTS.map((acc) => (
              <tr key={acc.id}>
                <td className="font-mono text-muted">{acc.id}</td>
                <td className="font-semibold text-white font-mono">{acc.username}</td>
                <td>{acc.role}</td>
                <td>
                  <span
                    className={`status-pill ${
                      acc.status === "Active" ? "status-approved" : "status-pending"
                    }`}
                  >
                    {acc.status}
                  </span>
                </td>
                <td className="font-mono">
                  {acc.mfaEnforced ? (
                    <span className="text-emerald">✓ Enforced</span>
                  ) : (
                    <span className="text-rose">✗ Disabled</span>
                  )}
                </td>
                <td className="font-mono text-muted text-xs">{acc.lastLogin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <a href={gatewayHref(app)} className="btn-secondary">
        ← Back to Overview
      </a>
    </div>
  );
}

export function AdminSettingsPage({ app }: { app: string }) {
  return (
    <div className="space-y-6">
      <div className="page-header-row">
        <div>
          <h2>Security & System Parameters</h2>
          <p>Read-only display of active security hardening controls and posture parameters.</p>
        </div>
        <span className="tag-info">Read-Only</span>
      </div>

      <div className="settings-list">
        {SYSTEM_SETTINGS.map((setting) => (
          <div key={setting.name} className="setting-card">
            <div className="setting-header">
              <div>
                <span className="setting-category">{setting.category}</span>
                <h3 className="setting-title">{setting.name}</h3>
              </div>
              <span className="setting-status">{setting.status}</span>
            </div>
            <p className="setting-desc">{setting.description}</p>
            <div className="setting-value font-mono">{setting.value}</div>
          </div>
        ))}
      </div>

      <a href={gatewayHref(app)} className="btn-secondary">
        ← Back to Overview
      </a>
    </div>
  );
}

export function AdminAuditNotePage({ app }: { app: string }) {
  return (
    <div className="space-y-6">
      <div className="detail-card">
        <div className="detail-header">
          <div className="avatar-placeholder">🛡️</div>
          <div>
            <h2>Centralized Zero Trust Audit Trail</h2>
            <p className="text-muted">Security Architecture Note</p>
          </div>
        </div>

        <div className="space-y-4 text-sm leading-relaxed text-muted">
          <p>
            In a true Zero Trust architecture, upstream applications do not maintain separate, fragmented access decision logs. Instead, all access evaluations are centrally recorded at the gateway perimeter before any request is permitted to reach the upstream service.
          </p>
          <p>
            Every single request to this application has already been inspected by the policy engine, evaluated against identity, device posture, location, and authentication age, and permanently recorded in the append-only database.
          </p>
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-emerald">
            ✓ Evaluated by: Pure Policy Engine<br />
            ✓ Verified with: GATEWAY_SHARED_SECRET<br />
            ✓ Storage: Immutable PostgreSQL AuditLog Table
          </div>
        </div>

        <div className="detail-actions">
          <a href="/admin/logs" className="btn-action">
            Open Gateway Audit Logs Dashboard →
          </a>
          <a href={gatewayHref(app)} className="btn-secondary">
            ← Back to Overview
          </a>
        </div>
      </div>
    </div>
  );
}

export function InAppNotFoundPage({
  app,
  message,
}: {
  app: string;
  message?: string;
}) {
  return (
    <div className="space-y-6 text-center py-12">
      <div className="max-w-md mx-auto p-8 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <div className="text-3xl">🔍</div>
        <h2 className="text-xl font-bold text-white">Resource Not Found</h2>
        <p className="text-sm text-muted">
          {message || "The requested item does not exist in this upstream application."}
        </p>
        <a href={gatewayHref(app)} className="btn-action inline-block">
          Return to {app.toUpperCase()} Overview →
        </a>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// HTML Page Wrapper with Embedded CSS
// -------------------------------------------------------------

export function renderDummyAppPage(element: React.ReactElement): string {
  const content = renderToStaticMarkup(element);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Protected Upstream Application - GateShield</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #020617;
      color: #f8fafc;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .layout-container {
      max-width: 72rem;
      width: 100%;
      margin: 0 auto;
      padding: 1.5rem 1rem;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .fictional-banner {
      background-color: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fde68a;
      font-size: 0.75rem;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
      text-align: center;
      font-family: ui-monospace, monospace;
    }
    .upstream-header {
      background-color: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 0.75rem;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .app-icon {
      font-size: 2rem;
      background: #020617;
      border: 1px solid #1e293b;
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .header-title-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .app-name {
      font-size: 1.25rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.015em;
    }
    .app-tagline {
      font-size: 0.75rem;
      color: #94a3b8;
      margin-top: 0.15rem;
    }
    .status-badge {
      font-size: 0.6875rem;
      font-family: ui-monospace, monospace;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      font-weight: 600;
      border: 1px solid;
    }
    .gateway-verified-badge {
      font-size: 0.6875rem;
      font-family: ui-monospace, monospace;
      background: rgba(6, 78, 59, 0.4);
      color: #6ee7b7;
      border: 1px solid #059669;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      font-weight: 600;
    }
    .identity-strip {
      background-color: #020617;
      border: 1px solid #1e293b;
      border-radius: 0.5rem;
      padding: 0.5rem 0.875rem;
      font-size: 0.75rem;
      font-family: ui-monospace, monospace;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .identity-label {
      color: #64748b;
    }
    .identity-user {
      color: #38bdf8;
      font-weight: 700;
    }
    .identity-role {
      color: #34d399;
      font-weight: 700;
      text-transform: uppercase;
    }
    .subnav-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #1e293b;
      padding: 0.25rem 0.5rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .subnav-links {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .subnav-link {
      padding: 0.5rem 0.875rem;
      font-size: 0.8125rem;
      color: #94a3b8;
      text-decoration: none;
      border-radius: 0.375rem;
      font-weight: 500;
      transition: all 0.15s ease;
    }
    .subnav-link:hover {
      background-color: #0f172a;
      color: #f8fafc;
    }
    .subnav-link.active {
      background-color: #1e293b;
      color: #ffffff;
      font-weight: 700;
    }
    .subnav-shortcuts {
      display: flex;
      gap: 0.5rem;
    }
    .shortcut-link {
      font-size: 0.75rem;
      color: #64748b;
      text-decoration: none;
      padding: 0.375rem 0.625rem;
      border-radius: 0.375rem;
      border: 1px solid #1e293b;
      transition: all 0.15s;
    }
    .shortcut-link:hover {
      color: #38bdf8;
      border-color: #334155;
    }
    .content-area {
      flex: 1;
    }
    .page-intro {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 0.75rem;
      padding: 1.5rem;
    }
    .page-intro h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.35rem;
    }
    .page-intro p {
      font-size: 0.875rem;
      color: #94a3b8;
    }
    .page-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .page-header-row h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #ffffff;
    }
    .page-header-row p {
      font-size: 0.8125rem;
      color: #94a3b8;
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
      gap: 1rem;
    }
    .summary-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 0.75rem;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1rem;
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card-header h3 {
      font-size: 1rem;
      font-weight: 700;
      color: #ffffff;
    }
    .counter-pill {
      font-size: 0.6875rem;
      font-family: ui-monospace, monospace;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      background: #020617;
      color: #34d399;
      border: 1px solid #1e293b;
    }
    .card-desc {
      font-size: 0.8125rem;
      color: #94a3b8;
      line-height: 1.5;
    }
    .btn-action {
      background-color: #059669;
      color: #ffffff;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
      text-align: center;
      transition: background-color 0.15s;
    }
    .btn-action:hover {
      background-color: #10b981;
    }
    .btn-secondary {
      background-color: #1e293b;
      color: #e2e8f0;
      padding: 0.5rem 0.875rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
      border: 1px solid #334155;
    }
    .btn-secondary:hover {
      background-color: #334155;
    }
    .btn-approve {
      background-color: #059669;
      color: #ffffff;
      padding: 0.625rem 1.25rem;
      border-radius: 0.375rem;
      font-size: 0.8125rem;
      font-weight: 700;
      border: none;
      cursor: pointer;
      transition: background-color 0.15s;
    }
    .btn-approve:hover {
      background-color: #10b981;
    }
    .table-wrapper {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 0.75rem;
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;
      text-align: left;
    }
    thead {
      background-color: #020617;
      border-bottom: 1px solid #1e293b;
      color: #94a3b8;
      font-size: 0.6875rem;
      text-transform: uppercase;
      font-family: ui-monospace, monospace;
      letter-spacing: 0.05em;
    }
    th {
      padding: 0.75rem 1rem;
    }
    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #1e293b;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .table-link {
      color: #38bdf8;
      text-decoration: none;
      font-weight: 600;
    }
    .table-link:hover {
      text-decoration: underline;
    }
    .dept-tag {
      font-size: 0.6875rem;
      background: #020617;
      border: 1px solid #1e293b;
      padding: 0.2rem 0.5rem;
      border-radius: 0.25rem;
      color: #cbd5e1;
    }
    .status-pill {
      font-size: 0.6875rem;
      font-family: ui-monospace, monospace;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      font-weight: 600;
      border: 1px solid;
    }
    .status-approved {
      background: rgba(6, 78, 59, 0.4);
      color: #6ee7b7;
      border-color: #059669;
    }
    .status-pending {
      background: rgba(120, 53, 15, 0.4);
      color: #fde68a;
      border-color: #d97706;
    }
    .status-paid {
      background: rgba(30, 58, 138, 0.4);
      color: #93c5fd;
      border-color: #2563eb;
    }
    .detail-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 0.75rem;
      padding: 2rem;
      max-width: 44rem;
      margin: 0 auto;
    }
    .detail-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .avatar-placeholder {
      width: 3.5rem;
      height: 3.5rem;
      background: #020617;
      border: 1px solid #1e293b;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      font-weight: 800;
      color: #38bdf8;
    }
    .properties-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .property-item {
      background: #020617;
      border: 1px solid #1e293b;
      border-radius: 0.5rem;
      padding: 0.875rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .property-label {
      font-size: 0.6875rem;
      color: #64748b;
      text-transform: uppercase;
      font-family: ui-monospace, monospace;
    }
    .property-value {
      font-size: 0.875rem;
      color: #ffffff;
    }
    .detail-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #1e293b;
    }
    .approve-action-bar {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #1e293b;
    }
    .success-card {
      background: #0f172a;
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-radius: 0.75rem;
      padding: 2.5rem;
      text-align: center;
      max-width: 36rem;
      margin: 2rem auto;
    }
    .success-icon {
      font-size: 2.5rem;
      color: #34d399;
      margin-bottom: 1rem;
    }
    .success-card h2 {
      font-size: 1.25rem;
      color: #ffffff;
      margin-bottom: 0.75rem;
    }
    .settings-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .setting-card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 0.5rem;
      padding: 1.25rem;
    }
    .setting-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5rem;
    }
    .setting-category {
      font-size: 0.6875rem;
      color: #38bdf8;
      font-family: ui-monospace, monospace;
      text-transform: uppercase;
    }
    .setting-title {
      font-size: 0.9375rem;
      font-weight: 700;
      color: #ffffff;
    }
    .setting-status {
      font-size: 0.6875rem;
      font-family: ui-monospace, monospace;
      background: rgba(6, 78, 59, 0.4);
      color: #6ee7b7;
      border: 1px solid #059669;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
    }
    .setting-desc {
      font-size: 0.8125rem;
      color: #94a3b8;
      margin-bottom: 0.75rem;
    }
    .setting-value {
      background: #020617;
      border: 1px solid #1e293b;
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      color: #e2e8f0;
      display: inline-block;
    }
    .upstream-footer {
      border-top: 1px solid #1e293b;
      padding: 1.5rem 0 0.5rem;
      margin-top: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      font-size: 0.75rem;
      color: #64748b;
      font-family: ui-monospace, monospace;
    }
    .footer-links {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .footer-links a {
      color: #94a3b8;
      text-decoration: none;
    }
    .footer-links a:hover {
      color: #38bdf8;
    }
    .font-mono { font-family: ui-monospace, monospace; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .text-white { color: #ffffff; }
    .text-muted { color: #94a3b8; }
    .text-emerald { color: #34d399; }
    .text-rose { color: #fb7185; }
    .tag-info {
      font-size: 0.6875rem;
      font-family: ui-monospace, monospace;
      padding: 0.2rem 0.5rem;
      border-radius: 0.25rem;
      background: #0f172a;
      border: 1px solid #1e293b;
      color: #94a3b8;
    }
    .space-y-6 > * + * { margin-top: 1.5rem; }
    .space-y-4 > * + * { margin-top: 1rem; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
}
