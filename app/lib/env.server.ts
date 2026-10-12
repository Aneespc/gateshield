import { z } from "zod";

/**
 * Environment Variable Loader and Validator
 *
 * Enforces strict presence and validates that placeholder values (e.g., 'PASTE_...')
 * have been properly replaced before runtime operations proceed.
 */

const placeholderValidator = (keyName: string, minLength = 1) =>
  z
    .string({ required_error: `${keyName} is required.` })
    .min(minLength, `${keyName} must be at least ${minLength} characters long.`)
    .refine((val) => !val.includes("PASTE_"), {
      message: `${keyName} contains unconfigured placeholder ('PASTE_...'). Replace it with your actual secret in .env`,
    });

export const envSchema = z.object({
  DATABASE_URL: placeholderValidator("DATABASE_URL"),
  DIRECT_URL: placeholderValidator("DIRECT_URL"),
  SESSION_SECRET: placeholderValidator("SESSION_SECRET", 32),
  GATEWAY_SHARED_SECRET: placeholderValidator("GATEWAY_SHARED_SECRET"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let envInstance: Env | null = null;

/**
 * Validates and returns environment variables.
 * Fails fast with a clear error message detailing all missing or placeholder variables.
 */
export function getEnv(): Env {
  if (envInstance) {
    return envInstance;
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formattedErrors = result.error.errors
      .map((issue) => `  - [${issue.path.join(".")}]: ${issue.message}`)
      .join("\n");

    throw new Error(
      `\n❌ Configuration Error: Environment variables failed validation:\n${formattedErrors}\n\nPlease check your .env file.\n`
    );
  }

  envInstance = result.data;
  return envInstance;
}

/**
 * Checks whether all required environment variables are configured without throwing.
 * Used by UI loaders to gracefully display configuration warnings in development.
 */
export function isEnvConfigured(): boolean {
  return envSchema.safeParse(process.env).success;
}
