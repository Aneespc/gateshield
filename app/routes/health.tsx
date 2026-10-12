/**
 * Health Check Resource Route
 * Returns JSON { status: "ok" } for health monitoring and uptime probes.
 */

export async function loader() {
  return Response.json({ status: "ok", timestamp: new Date().toISOString() });
}
