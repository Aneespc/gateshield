import type { Prisma } from "@prisma/client";
import { prisma } from "../db.server";
import { bucketRequestsOverTime, type TimeBucket } from "./helpers";
import type { AuditLogFilter, OverviewRange } from "./schemas";

export interface OverviewStats {
  range: OverviewRange;
  totalRequests: number;
  allowedRequests: number;
  deniedRequests: number;
  stepUpRequests: number;
  uniqueUsers: number;
  topBlockedUsers: {
    userId: string | null;
    displayName: string;
    email: string | null;
    count: number;
  }[];
  mostDeniedApps: {
    appId: string | null;
    appName: string;
    slug: string | null;
    count: number;
  }[];
  topMatchedPolicies: {
    policyId: string | null;
    policyName: string;
    count: number;
  }[];
  timeBuckets: TimeBucket[];
}

export async function getOverviewData(
  range: OverviewRange,
  now: Date = new Date()
): Promise<OverviewStats> {
  let cutoffMs: number;
  if (range === "1h") {
    cutoffMs = 60 * 60 * 1000;
  } else if (range === "24h") {
    cutoffMs = 24 * 60 * 60 * 1000;
  } else {
    cutoffMs = 7 * 24 * 60 * 60 * 1000;
  }

  const cutoff = new Date(now.getTime() - cutoffMs);
  const whereTime: Prisma.AuditLogWhereInput = {
    createdAt: { gte: cutoff },
  };

  // 1. Total Requests
  const totalRequests = await prisma.auditLog.count({
    where: whereTime,
  });

  // 2. Decision Counts
  const decisionGroups = await prisma.auditLog.groupBy({
    by: ["decision"],
    where: whereTime,
    _count: { id: true },
  });

  let allowedRequests = 0;
  let deniedRequests = 0;
  let stepUpRequests = 0;

  for (const group of decisionGroups) {
    if (group.decision === "ALLOW") {
      allowedRequests = group._count?.id ?? 0;
    } else if (group.decision === "DENY") {
      deniedRequests = group._count?.id ?? 0;
    } else if (group.decision === "STEP_UP") {
      stepUpRequests = group._count?.id ?? 0;
    }
  }

  // 3. Unique Users (excluding null)
  const uniqueUserGroups = await prisma.auditLog.groupBy({
    by: ["userId"],
    where: {
      ...whereTime,
      userId: { not: null },
    },
  });
  const uniqueUsers = uniqueUserGroups.length;

  // 4. Top Blocked Users (by DENY count)
  const blockedUserGroups = await prisma.auditLog.groupBy({
    by: ["userId"],
    where: {
      ...whereTime,
      decision: "DENY",
    },
    _count: { id: true },
    orderBy: {
      _count: { id: "desc" },
    },
    take: 5,
  });

  const distinctUserIds = blockedUserGroups
    .map((g) => g.userId)
    .filter((id): id is string => Boolean(id));

  const demoUsers =
    distinctUserIds.length > 0
      ? await prisma.demoUser.findMany({
          where: {
            OR: [
              { id: { in: distinctUserIds } },
              { email: { in: distinctUserIds } },
            ],
          },
        })
      : [];

  const demoUserMap = new Map<string, { name: string; email: string }>();
  for (const u of demoUsers) {
    demoUserMap.set(u.id, { name: u.name, email: u.email });
    demoUserMap.set(u.email, { name: u.name, email: u.email });
  }

  const topBlockedUsers = blockedUserGroups.map((g) => {
    const count = g._count?.id ?? 0;
    if (!g.userId) {
      return {
        userId: null,
        displayName: "anonymous",
        email: null,
        count,
      };
    }
    const userMeta = demoUserMap.get(g.userId);
    return {
      userId: g.userId,
      displayName: userMeta ? userMeta.name : g.userId,
      email: userMeta ? userMeta.email : null,
      count,
    };
  });

  // 5. Most Denied Apps
  const deniedAppGroups = await prisma.auditLog.groupBy({
    by: ["appId"],
    where: {
      ...whereTime,
      decision: "DENY",
    },
    _count: { id: true },
    orderBy: {
      _count: { id: "desc" },
    },
    take: 5,
  });

  const distinctAppIds = deniedAppGroups
    .map((g) => g.appId)
    .filter((id): id is string => Boolean(id));

  const protectedApps =
    distinctAppIds.length > 0
      ? await prisma.protectedApp.findMany({
          where: { id: { in: distinctAppIds } },
        })
      : [];

  const appMap = new Map<string, { name: string; slug: string }>();
  for (const a of protectedApps) {
    appMap.set(a.id, { name: a.name, slug: a.slug });
  }

  const mostDeniedApps = deniedAppGroups.map((g) => {
    const count = g._count?.id ?? 0;
    if (!g.appId) {
      return {
        appId: null,
        appName: "Unmapped / Unknown App",
        slug: null,
        count,
      };
    }
    const meta = appMap.get(g.appId);
    return {
      appId: g.appId,
      appName: meta ? meta.name : "Deleted App",
      slug: meta ? meta.slug : null,
      count,
    };
  });

  // 6. Top Matched Policies
  const matchedPolicyGroups = await prisma.auditLog.groupBy({
    by: ["matchedPolicyId"],
    where: whereTime,
    _count: { id: true },
    orderBy: {
      _count: { id: "desc" },
    },
    take: 5,
  });

  const distinctPolicyIds = matchedPolicyGroups
    .map((g) => g.matchedPolicyId)
    .filter((id): id is string => Boolean(id));

  const policies =
    distinctPolicyIds.length > 0
      ? await prisma.policy.findMany({
          where: { id: { in: distinctPolicyIds } },
          select: { id: true, name: true },
        })
      : [];

  const policyMap = new Map<string, string>();
  for (const p of policies) {
    policyMap.set(p.id, p.name);
  }

  const topMatchedPolicies = matchedPolicyGroups.map((g) => {
    const count = g._count?.id ?? 0;
    if (!g.matchedPolicyId) {
      return {
        policyId: null,
        policyName: "(no match, default deny)",
        count,
      };
    }
    return {
      policyId: g.matchedPolicyId,
      policyName: policyMap.get(g.matchedPolicyId) || `Policy ${g.matchedPolicyId}`,
      count,
    };
  });

  // 7. Requests Over Time
  const eventRows = await prisma.auditLog.findMany({
    where: whereTime,
    select: {
      createdAt: true,
      decision: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const timeBuckets = bucketRequestsOverTime(
    eventRows.map((r) => ({
      createdAt: r.createdAt,
      decision: r.decision as "ALLOW" | "DENY" | "STEP_UP",
    })),
    range,
    now
  );

  return {
    range,
    totalRequests,
    allowedRequests,
    deniedRequests,
    stepUpRequests,
    uniqueUsers,
    topBlockedUsers,
    mostDeniedApps,
    topMatchedPolicies,
    timeBuckets,
  };
}

export function buildAuditLogWhereClause(
  filters: AuditLogFilter
): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (filters.decision !== "all") {
    where.decision = filters.decision;
  }

  if (filters.app !== "all") {
    where.OR = [
      { appId: filters.app },
      { app: { slug: filters.app } },
    ];
  }

  if (filters.user !== "all") {
    if (filters.user === "anonymous") {
      where.userId = null;
    } else {
      where.userId = filters.user;
    }
  }

  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) {
      const fromDate = new Date(filters.from);
      if (!isNaN(fromDate.getTime())) {
        where.createdAt.gte = fromDate;
      }
    }
    if (filters.to) {
      const toDate = new Date(filters.to);
      if (!isNaN(toDate.getTime())) {
        where.createdAt.lte = toDate;
      }
    }
  }

  if (filters.q && filters.q.trim().length > 0) {
    where.path = {
      contains: filters.q.trim(),
      mode: "insensitive",
    };
  }

  return where;
}

export interface EnrichedAuditLog {
  id: string;
  createdAt: Date;
  appId: string | null;
  appName: string;
  appSlug: string | null;
  userId: string | null;
  userName: string;
  userRole: string | null;
  path: string;
  method: string;
  ipAddress: string | null;
  country: string | null;
  deviceSecure: boolean | null;
  decision: "ALLOW" | "DENY" | "STEP_UP";
  matchedPolicyId: string | null;
  policyName: string;
  reason: string;
  contextSnapshot: unknown;
}

export async function getAuditLogsTable(
  filters: AuditLogFilter,
  pageSize = 25
): Promise<{
  logs: EnrichedAuditLog[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const where = buildAuditLogWhereClause(filters);
  const totalCount = await prisma.auditLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.max(1, Math.min(filters.page, totalPages));

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      app: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  // Resolve Policy Names
  const policyIds = rows
    .map((r) => r.matchedPolicyId)
    .filter((id): id is string => Boolean(id));
  const policies =
    policyIds.length > 0
      ? await prisma.policy.findMany({
          where: { id: { in: policyIds } },
          select: { id: true, name: true },
        })
      : [];
  const policyMap = new Map<string, string>();
  for (const p of policies) {
    policyMap.set(p.id, p.name);
  }

  // Resolve User Names
  const userIds = rows
    .map((r) => r.userId)
    .filter((id): id is string => Boolean(id));
  const demoUsers =
    userIds.length > 0
      ? await prisma.demoUser.findMany({
          where: {
            OR: [
              { id: { in: userIds } },
              { email: { in: userIds } },
            ],
          },
          select: { id: true, email: true, name: true },
        })
      : [];
  const userMap = new Map<string, string>();
  for (const u of demoUsers) {
    userMap.set(u.id, u.name);
    userMap.set(u.email, u.name);
  }

  const logs: EnrichedAuditLog[] = rows.map((r) => {
    let policyName = "(no match, default deny)";
    if (r.matchedPolicyId) {
      policyName = policyMap.get(r.matchedPolicyId) || `Policy ${r.matchedPolicyId}`;
    }

    let userName = "anonymous";
    if (r.userId) {
      userName = userMap.get(r.userId) || r.userId;
    }

    return {
      id: r.id,
      createdAt: r.createdAt,
      appId: r.appId,
      appName: r.app ? r.app.name : "Unmapped App",
      appSlug: r.app ? r.app.slug : null,
      userId: r.userId,
      userName,
      userRole: r.userRole,
      path: r.path,
      method: r.method,
      ipAddress: r.ipAddress,
      country: r.country,
      deviceSecure: r.deviceSecure,
      decision: r.decision as "ALLOW" | "DENY" | "STEP_UP",
      matchedPolicyId: r.matchedPolicyId,
      policyName,
      reason: r.reason,
      contextSnapshot: r.contextSnapshot,
    };
  });

  return {
    logs,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

export async function getAuditLogsForExport(
  filters: AuditLogFilter,
  maxRows = 5000
): Promise<EnrichedAuditLog[]> {
  const where = buildAuditLogWhereClause(filters);

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: maxRows,
    include: {
      app: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  const policyIds = rows
    .map((r) => r.matchedPolicyId)
    .filter((id): id is string => Boolean(id));
  const policies =
    policyIds.length > 0
      ? await prisma.policy.findMany({
          where: { id: { in: policyIds } },
          select: { id: true, name: true },
        })
      : [];
  const policyMap = new Map<string, string>();
  for (const p of policies) {
    policyMap.set(p.id, p.name);
  }

  const userIds = rows
    .map((r) => r.userId)
    .filter((id): id is string => Boolean(id));
  const demoUsers =
    userIds.length > 0
      ? await prisma.demoUser.findMany({
          where: {
            OR: [
              { id: { in: userIds } },
              { email: { in: userIds } },
            ],
          },
          select: { id: true, email: true, name: true },
        })
      : [];
  const userMap = new Map<string, string>();
  for (const u of demoUsers) {
    userMap.set(u.id, u.name);
    userMap.set(u.email, u.name);
  }

  return rows.map((r) => {
    let policyName = "(no match, default deny)";
    if (r.matchedPolicyId) {
      policyName = policyMap.get(r.matchedPolicyId) || `Policy ${r.matchedPolicyId}`;
    }

    let userName = "anonymous";
    if (r.userId) {
      userName = userMap.get(r.userId) || r.userId;
    }

    return {
      id: r.id,
      createdAt: r.createdAt,
      appId: r.appId,
      appName: r.app ? r.app.name : "Unmapped App",
      appSlug: r.app ? r.app.slug : null,
      userId: r.userId,
      userName,
      userRole: r.userRole,
      path: r.path,
      method: r.method,
      ipAddress: r.ipAddress,
      country: r.country,
      deviceSecure: r.deviceSecure,
      decision: r.decision as "ALLOW" | "DENY" | "STEP_UP",
      matchedPolicyId: r.matchedPolicyId,
      policyName,
      reason: r.reason,
      contextSnapshot: r.contextSnapshot,
    };
  });
}

export async function getFilterOptions() {
  const [apps, users] = await Promise.all([
    prisma.protectedApp.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    prisma.demoUser.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { apps, users };
}
