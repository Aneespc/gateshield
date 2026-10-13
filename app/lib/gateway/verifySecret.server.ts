import crypto from "node:crypto";

/**
 * Timing-safe comparison to prevent direct bypass access.
 */
export function verifyGatewaySecret(
  provided: string | null,
  expected: string
): boolean {
  if (!provided) return false;

  const providedBuf = Buffer.from(provided, "utf-8");
  const expectedBuf = Buffer.from(expected, "utf-8");

  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}
