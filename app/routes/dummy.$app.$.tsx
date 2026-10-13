import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  getEmployeeById,
  getInvoiceById,
} from "../lib/dummy/data";
import { verifyGatewayRequest } from "../lib/dummy/helpers";
import {
  AdminAuditNotePage,
  AdminIndexPage,
  AdminSettingsPage,
  AdminUsersPage,
  DummyLayout,
  FinanceIndexPage,
  FinanceInvoiceApprovedPage,
  FinanceInvoiceDetailPage,
  FinanceInvoicesPage,
  FinancePayrollPage,
  HrEmployeeDetailPage,
  HrEmployeesPage,
  HrIndexPage,
  HrLeavePage,
  InAppNotFoundPage,
  renderDummyAppPage,
} from "../lib/dummy/views";

const VALID_APPS = new Set(["hr", "finance", "admin"]);

/**
 * Splat Route for Protected Upstream Dummy Applications
 *
 * Route Pattern: /dummy/:app/*
 *
 * Requirements:
 * 1. Verifies timing-safe x-gateway-secret. If invalid/missing -> 403 Forbidden.
 * 2. Only accepts valid apps: hr, finance, admin. Anything else -> 404.
 * 3. Handles all subpaths and actions (GET and POST).
 * 4. Renders completely standalone static HTML with no client hydration scripts,
 *    guaranteeing seamless proxying through the gateway.
 * 5. Returns Cache-Control: no-store on all responses.
 */
async function handleUpstreamRequest(
  request: Request,
  params: { app?: string; "*"?: string }
): Promise<Response> {
  const appSlug = params.app?.toLowerCase();

  // 1. Validate application
  if (!appSlug || !VALID_APPS.has(appSlug)) {
    return new Response("Not Found: Upstream application does not exist", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  // 2. Timing-safe bypass protection check
  const auth = verifyGatewayRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const rawPath = params["*"] || "";
  const cleanPath = rawPath.replace(/^\/+|\/+$/g, "");

  // 3. API endpoint: /api/whoami (available on all 3 apps)
  if (cleanPath === "api/whoami") {
    return new Response(
      JSON.stringify(
        {
          app: appSlug,
          userId: auth.userId,
          role: auth.role,
          viaGateway: true,
        },
        null,
        2
      ),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  let pageContent: React.ReactElement;
  let statusCode = 200;

  // 4. HR Portal Routing
  if (appSlug === "hr") {
    if (cleanPath === "") {
      pageContent = <HrIndexPage app="hr" />;
    } else if (cleanPath === "employees") {
      pageContent = <HrEmployeesPage app="hr" />;
    } else if (cleanPath.startsWith("employees/")) {
      const empId = cleanPath.slice("employees/".length);
      const employee = getEmployeeById(empId);
      if (!employee) {
        statusCode = 404;
        pageContent = (
          <InAppNotFoundPage
            app="hr"
            message={`Employee with ID '${empId}' was not found in the HR directory.`}
          />
        );
      } else {
        pageContent = <HrEmployeeDetailPage app="hr" employee={employee} />;
      }
    } else if (cleanPath === "leave") {
      pageContent = <HrLeavePage app="hr" />;
    } else {
      statusCode = 404;
      pageContent = (
        <InAppNotFoundPage
          app="hr"
          message={`The path '/${cleanPath}' is not a valid section of the HR Portal.`}
        />
      );
    }
  }
  // 5. Finance Hub Routing
  else if (appSlug === "finance") {
    if (cleanPath === "") {
      pageContent = <FinanceIndexPage app="finance" />;
    } else if (cleanPath === "invoices") {
      pageContent = <FinanceInvoicesPage app="finance" />;
    } else if (cleanPath.startsWith("invoices/")) {
      const remainder = cleanPath.slice("invoices/".length);

      if (remainder.endsWith("/approve")) {
        // Approve Invoice action (GET or POST)
        const invoiceId = remainder.slice(0, -"/approve".length);
        pageContent = (
          <FinanceInvoiceApprovedPage app="finance" invoiceId={invoiceId} />
        );
      } else {
        const invoice = getInvoiceById(remainder);
        if (!invoice) {
          statusCode = 404;
          pageContent = (
            <InAppNotFoundPage
              app="finance"
              message={`Invoice with ID '${remainder}' was not found in accounts payable.`}
            />
          );
        } else {
          pageContent = (
            <FinanceInvoiceDetailPage app="finance" invoice={invoice} />
          );
        }
      }
    } else if (cleanPath === "payroll") {
      pageContent = <FinancePayrollPage app="finance" />;
    } else {
      statusCode = 404;
      pageContent = (
        <InAppNotFoundPage
          app="finance"
          message={`The path '/${cleanPath}' is not a valid section of the Finance Hub.`}
        />
      );
    }
  }
  // 6. Admin Console Routing
  else {
    if (cleanPath === "") {
      pageContent = <AdminIndexPage app="admin" />;
    } else if (cleanPath === "users") {
      pageContent = <AdminUsersPage app="admin" />;
    } else if (cleanPath === "settings") {
      pageContent = <AdminSettingsPage app="admin" />;
    } else if (cleanPath === "audit-note") {
      pageContent = <AdminAuditNotePage app="admin" />;
    } else {
      statusCode = 404;
      pageContent = (
        <InAppNotFoundPage
          app="admin"
          message={`The path '/${cleanPath}' is not a valid section of the Admin Console.`}
        />
      );
    }
  }

  const fullHtml = renderDummyAppPage(
    <DummyLayout
      app={appSlug as "hr" | "finance" | "admin"}
      userId={auth.userId}
      role={auth.role}
      activePath={cleanPath}
    >
      {pageContent}
    </DummyLayout>
  );

  return new Response(fullHtml, {
    status: statusCode,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  return handleUpstreamRequest(request, params);
}

export async function action({ request, params }: ActionFunctionArgs) {
  return handleUpstreamRequest(request, params);
}
