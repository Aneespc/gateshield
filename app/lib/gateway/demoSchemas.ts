import { z } from "zod";

export const ALLOWED_DEMO_COUNTRIES = ["IN", "US", "DE", "RU", "CN", "NONE"] as const;

export const DemoCountrySchema = z.enum(ALLOWED_DEMO_COUNTRIES, {
  errorMap: () => ({ message: "Country must be one of: IN, US, DE, RU, CN, or NONE" }),
});

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DemoTimeSchema = z.string().refine((val) => val === "NONE" || timePattern.test(val), {
  message: "Time must be in HH:MM format (24-hour) or NONE",
});

export const LoginAgeMinutesSchema = z.preprocess((val) => {
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || !/^\d+$/.test(trimmed)) {
      return Number.NaN;
    }
    return Number(trimmed);
  }
  return val;
}, z
  .number({
    required_error: "Login age is required",
    invalid_type_error: "Login age must be an integer between 0 and 1440",
  })
  .int({ message: "Login age must be an integer" })
  .min(0, { message: "Login age must be at least 0" })
  .max(1440, { message: "Login age cannot exceed 1440 minutes (24 hours)" })
);

export const DemoConsoleActionSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("toggleDevicePosture"),
  }),
  z.object({
    intent: z.literal("setCountry"),
    country: DemoCountrySchema,
  }),
  z.object({
    intent: z.literal("setTime"),
    time: DemoTimeSchema,
  }),
  z.object({
    intent: z.literal("setLoginAge"),
    ageMinutes: LoginAgeMinutesSchema,
  }),
  z.object({
    intent: z.literal("ageLogin"),
    ageMinutes: LoginAgeMinutesSchema.optional().default(20),
  }),
]);
