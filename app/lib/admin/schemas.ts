import { z } from "zod";

export const OverviewRangeSchema = z
  .enum(["1h", "24h", "7d"])
  .catch("24h")
  .default("24h");

export type OverviewRange = z.infer<typeof OverviewRangeSchema>;

export const AuditLogFilterSchema = z.object({
  decision: z
    .enum(["all", "ALLOW", "DENY", "STEP_UP"])
    .catch("all")
    .default("all"),
  app: z.string().trim().catch("all").default("all"),
  user: z.string().trim().catch("all").default("all"),
  from: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid ISO date string",
    })
    .catch(undefined),
  to: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid ISO date string",
    })
    .catch(undefined),
  q: z.string().trim().optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1).default(1),
});

export type AuditLogFilter = z.infer<typeof AuditLogFilterSchema>;
