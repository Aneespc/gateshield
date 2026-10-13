import { PrismaClient } from "@prisma/client";
import { ConditionsArraySchema } from "../app/lib/policy-engine/schema";
import type { Condition } from "../app/lib/policy-engine/types";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  const rawBaseUrl = process.env.DUMMY_UPSTREAM_BASE_URL || "http://localhost:5173";
  const upstreamBase = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

  console.log(`  ℹ Using upstream base URL: ${upstreamBase}`);

  // 1. Seed Demo Users
  const demoUsers = [
    { email: "admin@gateshield.local", name: "Alice Admin", role: "admin" },
    { email: "finance@gateshield.local", name: "Bob Finance", role: "finance" },
    { email: "hr@gateshield.local", name: "Carol HR", role: "hr" },
    { email: "intern@gateshield.local", name: "Dave Intern", role: "intern" },
  ];

  for (const user of demoUsers) {
    await prisma.demoUser.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role },
      create: user,
    });
    console.log(`  ✓ DemoUser: ${user.name} (${user.role})`);
  }

  // 2. Seed Protected Apps
  const appsData = [
    {
      name: "HR Portal",
      slug: "hr",
      pathPrefix: "/apps/hr",
      upstreamUrl: `${upstreamBase}/dummy/hr`,
    },
    {
      name: "Finance Hub",
      slug: "finance",
      pathPrefix: "/apps/finance",
      upstreamUrl: `${upstreamBase}/dummy/finance`,
    },
    {
      name: "Admin Console",
      slug: "admin",
      pathPrefix: "/apps/admin",
      upstreamUrl: `${upstreamBase}/dummy/admin`,
    },
  ];

  const appMap = new Map<string, string>();

  for (const app of appsData) {
    const saved = await prisma.protectedApp.upsert({
      where: { slug: app.slug },
      update: {
        name: app.name,
        pathPrefix: app.pathPrefix,
        upstreamUrl: app.upstreamUrl,
        enabled: true,
      },
      create: app,
    });
    appMap.set(saved.slug, saved.id);
    console.log(`  ✓ ProtectedApp: ${app.name} (${app.pathPrefix}) -> ${app.upstreamUrl}`);
  }

  // 3. Starter Policies
  // Policy 1: Finance app allows role "finance" or "admin" if device is secure
  const financeConditions: Condition[] = [
    { field: "role", op: "in", value: ["finance", "admin"] },
    { field: "deviceSecure", op: "eq", value: true },
  ];
  ConditionsArraySchema.parse(financeConditions);

  // Clean up legacy admin policy name if it exists
  if (appMap.get("admin")) {
    await prisma.policy.deleteMany({
      where: {
        appId: appMap.get("admin"),
        name: "Admin: Allow admin role during business hours",
      },
    });
  }

  // Policy 2a: Admin app allows role "admin" on secure device during 09:00-18:00 UTC if auth is fresh (<= 15 min)
  const adminFreshConditions: Condition[] = [
    { field: "role", op: "in", value: ["admin"] },
    { field: "deviceSecure", op: "eq", value: true },
    { field: "timeOfDay", op: "between", value: { start: "09:00", end: "18:00" } },
    { field: "authAgeMinutes", op: "lte", value: 15 },
  ];
  ConditionsArraySchema.parse(adminFreshConditions);

  // Policy 2b: Admin app triggers STEP_UP if role "admin" on secure device during 09:00-18:00 UTC with stale auth (> 15 min)
  const adminStepUpConditions: Condition[] = [
    { field: "role", op: "in", value: ["admin"] },
    { field: "deviceSecure", op: "eq", value: true },
    { field: "timeOfDay", op: "between", value: { start: "09:00", end: "18:00" } },
  ];
  ConditionsArraySchema.parse(adminStepUpConditions);

  // Policy 3: HR app allows role "hr" or "admin"
  const hrConditions: Condition[] = [
    { field: "role", op: "in", value: ["hr", "admin"] },
  ];
  ConditionsArraySchema.parse(hrConditions);

  const starterPolicies = [
    {
      appId: appMap.get("finance"),
      name: "Finance: Allow finance or admin with secure posture",
      description: "Requires secure device posture and finance/admin role",
      priority: 10,
      action: "ALLOW" as const,
      conditions: financeConditions,
      enabled: true,
    },
    {
      appId: appMap.get("admin"),
      name: "Admin: Allow fresh login during business hours",
      description: "Restricts admin console to admin role, secure posture, business hours (09:00-18:00 UTC), and fresh authentication (<= 15 min)",
      priority: 10,
      action: "ALLOW" as const,
      conditions: adminFreshConditions,
      enabled: true,
    },
    {
      appId: appMap.get("admin"),
      name: "Admin: Step-up reauth required for stale session",
      description: "Requires step-up re-authentication if session is older than 15 minutes during business hours",
      priority: 20,
      action: "STEP_UP" as const,
      conditions: adminStepUpConditions,
      enabled: true,
    },
    {
      appId: appMap.get("hr"),
      name: "HR: Allow HR or admin personnel",
      description: "Grants access to HR portal for HR department and administrators",
      priority: 10,
      action: "ALLOW" as const,
      conditions: hrConditions,
      enabled: true,
    },
  ];

  for (const policy of starterPolicies) {
    const existing = await prisma.policy.findFirst({
      where: { name: policy.name, appId: policy.appId },
    });

    if (existing) {
      await prisma.policy.update({
        where: { id: existing.id },
        data: {
          description: policy.description,
          priority: policy.priority,
          action: policy.action,
          conditions: policy.conditions as unknown as object,
          enabled: policy.enabled,
        },
      });
    } else {
      await prisma.policy.create({
        data: {
          appId: policy.appId,
          name: policy.name,
          description: policy.description,
          priority: policy.priority,
          action: policy.action,
          conditions: policy.conditions as unknown as object,
          enabled: policy.enabled,
        },
      });
    }
    console.log(`  ✓ Policy: ${policy.name}`);
  }

  console.log("✅ Seed finished successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
