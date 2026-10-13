import type { OverviewRange } from "./schemas";

/**
 * Masks an IP address for privacy in UI displays and CSV exports.
 * - IPv4: Replaces the final octet with 'xxx' (e.g., 203.0.113.195 -> 203.0.113.xxx).
 * - IPv6: Keeps the first two groups, followed by '::xxxx' (e.g., 2001:0db8:85a3:... -> 2001:0db8::xxxx).
 * - null, undefined, empty, or unparseable input returns '-'.
 */
export function maskIp(ip: string | null | undefined): string {
  if (!ip || typeof ip !== "string") {
    return "-";
  }

  const clean = ip.trim();
  if (!clean) {
    return "-";
  }

  // IPv4 check: 4 dot-separated decimal numbers (0-255)
  const ipv4Match = clean.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
  if (ipv4Match) {
    const parts = clean.split(".");
    const isValidIpv4 = parts.every((p) => {
      const n = Number(p);
      return n >= 0 && n <= 255;
    });
    if (isValidIpv4) {
      return `${ipv4Match[1]}.xxx`;
    }
  }

  // IPv6 check: contains colon
  if (clean.includes(":")) {
    // Standardize or split segments
    // Handle compressed format like "::1" or "2001:db8::1" or full "2001:0db8:85a3:..."
    if (clean.startsWith("::")) {
      return "::xxxx";
    }

    const segments = clean.split(":").filter((s) => s.length > 0);
    if (segments.length >= 2) {
      // Validate that the segments look like hex groups
      const isHex = /^[0-9a-fA-F]{1,4}$/;
      if (isHex.test(segments[0]) && isHex.test(segments[1])) {
        return `${segments[0]}:${segments[1]}::xxxx`;
      }
    } else if (segments.length === 1 && /^[0-9a-fA-F]{1,4}$/.test(segments[0])) {
      return `${segments[0]}::xxxx`;
    }
  }

  return "-";
}

/**
 * Escapes values for CSV output with strict protection against formula injection.
 * - Any string starting with '=', '+', '-', or '@' is prefixed with a single quote.
 * - Strings containing commas, double quotes, or newlines are wrapped in double quotes.
 * - Existing double quotes are escaped as double quotes ("").
 */
export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  // CSV Injection Mitigation:
  // Spreadsheet engines (Excel, Calc) execute formulas starting with =, +, -, @
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }

  // If containing special characters (quotes, commas, newlines, carriage returns) or edge whitespace, wrap in quotes
  if (/[",\n\r]/.test(str) || str.startsWith(" ") || str.endsWith(" ")) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export interface TimeBucket {
  label: string;
  timeStart: Date;
  timeEnd: Date;
  allow: number;
  deny: number;
  stepUp: number;
  total: number;
}

export interface RequestEvent {
  createdAt: Date | string;
  decision: "ALLOW" | "DENY" | "STEP_UP";
}

/**
 * Aggregates a list of request events into fixed chronological time buckets.
 * - 1h: 12 buckets of 5 minutes each.
 * - 24h: 24 buckets of 1 hour each.
 * - 7d: 168 buckets of 1 hour each (or aggregated view).
 */
export function bucketRequestsOverTime(
  events: RequestEvent[],
  range: OverviewRange,
  now: Date = new Date()
): TimeBucket[] {
  const endTime = now.getTime();
  let bucketSizeMs: number;
  let totalBuckets: number;

  if (range === "1h") {
    bucketSizeMs = 5 * 60 * 1000; // 5 minutes
    totalBuckets = 12;
  } else if (range === "24h") {
    bucketSizeMs = 60 * 60 * 1000; // 1 hour
    totalBuckets = 24;
  } else {
    // 7d: 24h * 7 = 168 hours
    bucketSizeMs = 60 * 60 * 1000; // 1 hour
    totalBuckets = 168;
  }

  const startTime = endTime - bucketSizeMs * totalBuckets;

  // Initialize empty buckets
  const buckets: TimeBucket[] = [];
  for (let i = 0; i < totalBuckets; i++) {
    const bStart = new Date(startTime + i * bucketSizeMs);
    const bEnd = new Date(startTime + (i + 1) * bucketSizeMs);

    let label: string;
    if (range === "1h") {
      const hours = String(bStart.getUTCHours()).padStart(2, "0");
      const mins = String(bStart.getUTCMinutes()).padStart(2, "0");
      label = `${hours}:${mins}`;
    } else if (range === "24h") {
      const hours = String(bStart.getUTCHours()).padStart(2, "0");
      label = `${hours}:00`;
    } else {
      const month = bStart.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
      const day = bStart.getUTCDate();
      const hours = String(bStart.getUTCHours()).padStart(2, "0");
      label = `${month} ${day} ${hours}:00`;
    }

    buckets.push({
      label,
      timeStart: bStart,
      timeEnd: bEnd,
      allow: 0,
      deny: 0,
      stepUp: 0,
      total: 0,
    });
  }

  // Populate counts from events
  for (const event of events) {
    const eventTime =
      typeof event.createdAt === "string"
        ? new Date(event.createdAt).getTime()
        : event.createdAt.getTime();

    if (isNaN(eventTime) || eventTime < startTime || eventTime >= endTime) {
      continue;
    }

    const bucketIndex = Math.floor((eventTime - startTime) / bucketSizeMs);
    if (bucketIndex >= 0 && bucketIndex < buckets.length) {
      const b = buckets[bucketIndex];
      b.total += 1;
      if (event.decision === "ALLOW") {
        b.allow += 1;
      } else if (event.decision === "DENY") {
        b.deny += 1;
      } else if (event.decision === "STEP_UP") {
        b.stepUp += 1;
      }
    }
  }

  return buckets;
}
