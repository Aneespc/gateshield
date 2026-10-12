import { PrismaClient } from "@prisma/client";
import { ConditionsArraySchema } from "../app/lib/policy-engine/schema";
import type { Condition } from "../app/lib/policy-engine/types";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // 1. Seed Demo Users
  const demoUsers = [
    { email: "admin@ztgate.local", name: "Alice Admin", role: "admin" },
    { email: "finance@ztgate.local", name: "Bob Finance", role: "finance" },
    { email: "hr@ztgate.local", name: "Carol HR", role: "hr" },
    { email: "intern@ztgate.local", name: "Dave Intern", role: "intern" },
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
      upstreamUrl: "http://localhost:3000/dummy/hr",
    },
    {
      name: "Finance Hub",
      slug: "finance",
      pathPrefix: "/apps/finance",
      upstreamUrl: "http://localhost:3000/dummy/finance",
    },
    {
      name: "Admin Console",
      slug: "admin",
      pathPrefix: "/apps/admin",
      upstreamUrl: "http://localhost:3000/dummy/admin",
    },
  ];

  const appMap = new Map<string, string>();

  for (const app of appsData) {
    const saved = await prisma.protectedApp.upsert({
      where: { slug: app.slug },
      update: { name: app.name, pathPrefix: app.pathPrefix, upstreamUrl: app.upstreamUrl },
      create: app,
    });
    appMap.set(saved.slug, saved.id);
    console.log(`  ✓ ProtectedApp: ${app.name} (${app.pathPrefix})`);
  }

  // 3. Starter Policies
  // Policy 1: Finance app allows role "finance" or "admin" if device is secure
  const financeConditions: Condition[] = [
    { field: "role", op: "in", value: ["finance", "admin"] },
    { field: "deviceSecure", op: "eq", value: true },
  ];
  ConditionsArraySchema.parse(financeConditions);

  // Policy 2: Admin app allows only role "admin" during 09:00-18:00
  const adminConditions: Condition[] = [
    { field: "role", op: "in", value: ["admin"] },
    { field: "timeOfDay", op: "between", value: { start: "09:00", end: "18:00" } },
  ];
  ConditionsArraySchema.parse(adminConditions);

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
      name: "Admin: Allow admin role during business hours",
      description: "Restricts admin console access to 09:00-18:00 for admin role",
      priority: 10,
      action: "ALLOW" as const,
      conditions: adminConditions,
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
