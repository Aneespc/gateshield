import { z } from "zod";

/**
 * Zod Schemas for Policy Engine
 * Validates request contexts, conditions, policy definitions, and decisions.
 * A malformed policy fails validation and will be handled fail-closed.
 */

export const PolicyActionSchema = z.enum(["ALLOW", "DENY", "STEP_UP"]);

export const RoleConditionSchema = z.object({
  field: z.literal("role"),
  op: z.enum(["in", "not_in"]),
  value: z.array(z.string().min(1)).min(1),
});

export const DeviceSecureConditionSchema = z.object({
  field: z.literal("deviceSecure"),
  op: z.literal("eq"),
  value: z.boolean(),
});

export const CountryConditionSchema = z.object({
  field: z.literal("country"),
  op: z.enum(["in", "not_in"]),
  value: z.array(z.string().regex(/^[A-Za-z]{2}$/, "Must be a 2-letter ISO country code")).min(1),
});

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const TimeOfDayConditionSchema = z.object({
  field: z.literal("timeOfDay"),
  op: z.literal("between"),
  value: z.object({
    start: z.string().regex(timeRegex, "Start time must be in HH:MM format (24-hour)"),
    end: z.string().regex(timeRegex, "End time must be in HH:MM format (24-hour)"),
  }),
});

export const ConditionSchema = z.discriminatedUnion("field", [
  RoleConditionSchema,
  DeviceSecureConditionSchema,
  CountryConditionSchema,
  TimeOfDayConditionSchema,
]);

export const ConditionsArraySchema = z.array(ConditionSchema);

export const PolicyDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  priority: z.number().int(),
  enabled: z.boolean(),
  action: PolicyActionSchema,
  conditions: ConditionsArraySchema,
});

export const RequestContextSchema = z.object({
  userId: z.string().optional(),
  role: z.string().optional(),
  deviceSecure: z.boolean().optional(),
  country: z.string().optional(),
  timestamp: z.date(),
  path: z.string(),
  method: z.string(),
  appId: z.string().optional(),
});

export const DecisionSchema = z.object({
  action: PolicyActionSchema,
  reason: z.string(),
  matchedPolicyId: z.string().nullable(),
});
