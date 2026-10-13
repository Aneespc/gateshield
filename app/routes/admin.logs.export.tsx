import type { LoaderFunctionArgs } from "react-router";
import { requireAdmin } from "../lib/adminAuth.server";
import { getAuditLogsForExport } from "../lib/admin/queries.server";
import { csvEscape, maskIp } from "../lib/admin/helpers";
import { AuditLogFilterSchema } from "../lib/admin/schemas";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);

  const url = new URL(request.url);
  const rawParams = Object.fromEntries(url.searchParams.entries());
  const filters = AuditLogFilterSchema.parse(rawParams);

  const logs = await getAuditLogsForExport(filters, 5000);

  const headers = [
    "ID",
    "Timestamp (UTC)",
    "User",
    "Role",
    "Application",
    "Method",
    "Path",
    "Decision",
    "Matched Policy",
    "Reason",
    "Masked IP",
    "Country",
    "Device Secure",
  ];

  const csvRows: string[] = [];
  csvRows.push(headers.map((h) => csvEscape(h)).join(","));

  for (const log of logs) {
    const row = [
      csvEscape(log.id),
      csvEscape(log.createdAt.toISOString()),
      csvEscape(log.userName),
      csvEscape(log.userRole || "-"),
      csvEscape(log.appName),
      csvEscape(log.method),
      csvEscape(log.path),
      csvEscape(log.decision),
      csvEscape(log.policyName),
      csvEscape(log.reason),
      csvEscape(maskIp(log.ipAddress)),
      csvEscape(log.country || "-"),
      csvEscape(
        log.deviceSecure === null
          ? "-"
          : log.deviceSecure
          ? "SECURE"
          : "INSECURE"
      ),
    ];
    csvRows.push(row.join(","));
  }

  const csvContent = csvRows.join("\r\n");
  const dateStr = new Date().toISOString().slice(0, 10);

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gateshield-audit-logs-${dateStr}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
