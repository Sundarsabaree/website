import { Response } from "express";
import { DealStage, LeadStage, Prisma, Role, TaskStatus } from "@prisma/client";
import { prisma } from "../prisma.js";
import { AuthenticatedRequest } from "../types/index.js";
import {
  activityScope,
  customerScope,
  dealScope,
  leadScope,
  meetingScope,
  taskScope,
  userScope,
} from "../services/scope.service.js";
import { DEAL_STAGE_LABEL, OPEN_DEAL_STAGES } from "../utils/labels.js";

const DAY_MS = 86400000;
const SCOPE_LABEL: Record<Role, string> = {
  ADMIN: "Organisation",
  MANAGER: "Team",
  SALES_EXECUTIVE: "Personal",
};

function dayBounds(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function getDashboardStats(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const now = new Date();
  const { start: todayStart, end: todayEnd } = dayBounds(now);
  const weekAhead = new Date(now.getTime() + 7 * DAY_MS);
  const [cW, lW, dW, tW, mW] = await Promise.all([
    customerScope(actor),
    leadScope(actor),
    dealScope(actor),
    taskScope(actor),
    meetingScope(actor),
  ]);

  const [
    totalCustomers,
    totalLeads,
    activeLeads,
    hotLeadsCount,
    openDeals,
    won,
    lostCount,
    pendingTasks,
    overdueTasks,
    tasksDueToday,
    leadFollowUpsToday,
    meetingsToday,
    upcomingMeetings,
  ] = await Promise.all([
    prisma.customer.count({ where: cW }),
    prisma.lead.count({ where: lW }),
    prisma.lead.count({
      where: {
        AND: [lW, { stage: { notIn: [LeadStage.WON, LeadStage.LOST] } }],
      },
    }),
    prisma.customer.count({
      where: { AND: [cW, { leadScore: { contains: "Hot" } }] },
    }),
    prisma.deal.findMany({
      where: { AND: [dW, { stage: { in: OPEN_DEAL_STAGES } }] },
      select: { value: true, probability: true },
    }),
    prisma.deal.aggregate({
      where: { AND: [dW, { stage: DealStage.CLOSED_WON }] },
      _sum: { value: true },
      _count: { _all: true },
    }),
    prisma.deal.count({
      where: { AND: [dW, { stage: DealStage.CLOSED_LOST }] },
    }),
    prisma.task.count({
      where: {
        AND: [
          tW,
          { status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] } },
        ],
      },
    }),
    prisma.task.count({
      where: {
        AND: [
          tW,
          { status: { not: TaskStatus.COMPLETED }, dueDate: { lt: now } },
        ],
      },
    }),
    prisma.task.count({
      where: {
        AND: [
          tW,
          {
            status: { not: TaskStatus.COMPLETED },
            dueDate: { gte: todayStart, lte: todayEnd },
          },
        ],
      },
    }),
    prisma.lead.count({
      where: {
        AND: [
          lW,
          {
            stage: { notIn: [LeadStage.WON, LeadStage.LOST] },
            followUpDate: { gte: todayStart, lte: todayEnd },
          },
        ],
      },
    }),
    prisma.meeting.count({
      where: { AND: [mW, { startTime: { gte: todayStart, lte: todayEnd } }] },
    }),
    prisma.meeting.count({
      where: {
        AND: [
          mW,
          { status: "SCHEDULED", startTime: { gte: now, lte: weekAhead } },
        ],
      },
    }),
  ]);

  const wonCount = won._count._all;
  const closedTotal = wonCount + lostCount;
  res.json({
    success: true,
    data: {
      role: actor.role,
      scope: SCOPE_LABEL[actor.role],
      totalCustomers,
      totalLeads,
      activeLeads,
      leadsAwaitingContact: 0,
      totalDeals: openDeals.length + wonCount + lostCount,
      openDealsCount: openDeals.length,
      totalRevenue: won._sum.value ?? 0,
      pipelineValue: openDeals.reduce((sum, deal) => sum + deal.value, 0),
      expectedRevenue: Math.round(
        openDeals.reduce(
          (sum, deal) => sum + deal.value * (deal.probability / 100),
          0,
        ),
      ),
      winRate: closedTotal > 0 ? Math.round((wonCount / closedTotal) * 100) : 0,
      closedDeals: wonCount,
      pendingTasks,
      overdueTasks,
      todaysFollowUps: tasksDueToday + leadFollowUpsToday,
      meetingsToday,
      upcomingMeetings,
      hotLeadsCount,
    },
  });
}

export async function getDashboardCharts(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const now = new Date();
  const [lW, dW] = await Promise.all([leadScope(actor), dealScope(actor)]);
  const leadGroups = await prisma.lead.groupBy({
    by: ["stage"],
    where: lW,
    _count: { _all: true },
  });
  const leadConversionChart = (Object.values(LeadStage) as LeadStage[]).map(
    (stage) => ({
      stage,
      count:
        leadGroups.find((group) => group.stage === stage)?._count._all ?? 0,
    }),
  );

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const buckets = new Map<
    string,
    { month: string; sales: number; deals: number }
  >();
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    buckets.set(`${date.getFullYear()}-${date.getMonth()}`, {
      month: monthNames[date.getMonth()],
      sales: 0,
      deals: 0,
    });
  }
  const wonDeals = await prisma.deal.findMany({
    where: { AND: [dW, { stage: DealStage.CLOSED_WON }] },
    select: { value: true, closingDate: true, updatedAt: true },
  });
  wonDeals.forEach((deal) => {
    const date = deal.closingDate ?? deal.updatedAt;
    const bucket = buckets.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) {
      bucket.sales += deal.value;
      bucket.deals += 1;
    }
  });

  const dealGroups = await prisma.deal.groupBy({
    by: ["stage"],
    where: dW,
    _count: { _all: true },
    _sum: { value: true },
  });
  const chartStages: DealStage[] = [
    "DISCOVERY",
    "QUALIFICATION",
    "NEEDS_ANALYSIS",
    "PROPOSAL",
    "NEGOTIATION",
    "CLOSED_WON",
  ];
  const dealDistribution = chartStages.map((stage) => {
    const group = dealGroups.find((item) => item.stage === stage);
    return {
      stage,
      name: stage === "CLOSED_WON" ? "Won" : DEAL_STAGE_LABEL[stage],
      count: group?._count._all ?? 0,
      value: group?._sum.value ?? 0,
    };
  });
  res.json({
    success: true,
    data: {
      leadConversionChart,
      monthlyTrend: [...buckets.values()],
      dealDistribution,
    },
  });
}

export async function getDashboardActivities(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const activities = await prisma.activity.findMany({
    where: await activityScope(req.user!),
    orderBy: { createdAt: "desc" },
    take: 12,
    include: {
      user: { select: { id: true, name: true, avatar: true, email: true } },
    },
  });
  res.json({ success: true, data: activities });
}

export async function getTeamPerformance(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  if (actor.role === Role.SALES_EXECUTIVE) {
    res.status(403).json({ success: false, message: "Forbidden." });
    return;
  }
  const now = new Date();
  const { start: todayStart } = dayBounds(now);
  const weekStart = new Date(now.getTime() - 7 * DAY_MS);
  const [uW, lW, dW, tW, aW] = await Promise.all([
    userScope(actor),
    leadScope(actor),
    dealScope(actor),
    taskScope(actor),
    activityScope(actor),
  ]);
  const [
    users,
    leadGroups,
    dealGroups,
    taskGroups,
    overdueGroups,
    activityGroups,
    activityTodayGroups,
  ] = await Promise.all([
    prisma.user.findMany({
      where: {
        AND: [
          uW,
          {
            role: { in: [Role.MANAGER, Role.SALES_EXECUTIVE] },
            status: "ACTIVE",
          },
        ],
      },
      select: {
        id: true,
        name: true,
        role: true,
        managerId: true,
        avatar: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.lead.groupBy({
      by: ["assignedToId", "stage"],
      where: lW,
      _count: { _all: true },
    }),
    prisma.deal.groupBy({
      by: ["assignedToId", "stage"],
      where: dW,
      _count: { _all: true },
      _sum: { value: true },
    }),
    prisma.task.groupBy({
      by: ["assignedToId", "status"],
      where: tW,
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ["assignedToId"],
      where: {
        AND: [
          tW,
          { status: { not: TaskStatus.COMPLETED }, dueDate: { lt: now } },
        ],
      },
      _count: { _all: true },
    }),
    prisma.activity.groupBy({
      by: ["userId"],
      where: { AND: [aW, { createdAt: { gte: weekStart } }] },
      _count: { _all: true },
    }),
    prisma.activity.groupBy({
      by: ["userId"],
      where: { AND: [aW, { createdAt: { gte: todayStart } }] },
      _count: { _all: true },
    }),
  ]);
  const data = users.map((user) => {
    const leads = leadGroups.filter((group) => group.assignedToId === user.id);
    const deals = dealGroups.filter((group) => group.assignedToId === user.id);
    const tasks = taskGroups.filter((group) => group.assignedToId === user.id);
    const won = deals.find((group) => group.stage === DealStage.CLOSED_WON);
    const open = deals.filter((group) =>
      OPEN_DEAL_STAGES.includes(group.stage),
    );
    const totalTasks = tasks.reduce((sum, group) => sum + group._count._all, 0);
    const completedTasks =
      tasks.find((group) => group.status === TaskStatus.COMPLETED)?._count
        ._all ?? 0;
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      managerId: user.managerId,
      avatar: user.avatar,
      wonRevenue: won?._sum.value ?? 0,
      dealsWon: won?._count._all ?? 0,
      openDeals: open.reduce((sum, group) => sum + group._count._all, 0),
      openPipeline: open.reduce(
        (sum, group) => sum + (group._sum.value ?? 0),
        0,
      ),
      totalTasks,
      completedTasks,
      inProgressTasks:
        tasks.find((group) => group.status === TaskStatus.IN_PROGRESS)?._count
          ._all ?? 0,
      pendingTasks:
        tasks.find((group) => group.status === TaskStatus.PENDING)?._count
          ._all ?? 0,
      overdueTasks:
        overdueGroups.find((group) => group.assignedToId === user.id)?._count
          ._all ?? 0,
      taskCompletionRate:
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      totalLeads: leads.reduce((sum, group) => sum + group._count._all, 0),
      qualifiedLeads:
        leads.find((group) => group.stage === LeadStage.QUALIFIED)?._count
          ._all ?? 0,
      convertedLeads:
        leads.find((group) => group.stage === LeadStage.WON)?._count._all ?? 0,
      activityThisWeek:
        activityGroups.find((group) => group.userId === user.id)?._count._all ??
        0,
      activityToday:
        activityTodayGroups.find((group) => group.userId === user.id)?._count
          ._all ?? 0,
    };
  });
  res.json({ success: true, data });
}

export async function getNeedsAttention(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const now = new Date();
  const [tW, dW, lW] = await Promise.all([
    taskScope(actor),
    dealScope(actor),
    leadScope(actor),
  ]);
  const [overdueTasks, closingDeals, uncontactedLeads] = await Promise.all([
    prisma.task.count({
      where: {
        AND: [
          tW,
          { status: { not: TaskStatus.COMPLETED }, dueDate: { lt: now } },
        ],
      },
    }),
    prisma.deal.count({
      where: {
        AND: [
          dW,
          {
            stage: { in: OPEN_DEAL_STAGES },
            closingDate: {
              gte: now,
              lte: new Date(now.getTime() + 7 * DAY_MS),
            },
          },
        ],
      },
    }),
    prisma.lead.count({
      where: {
        AND: [
          lW,
          {
            stage: LeadStage.NEW,
            createdAt: { lt: new Date(now.getTime() - 24 * 3600000) },
          },
        ],
      },
    }),
  ]);
  const items = [
    overdueTasks > 0 && {
      key: "overdue_tasks",
      title: `${overdueTasks} overdue task${overdueTasks === 1 ? "" : "s"}`,
      count: overdueTasks,
      severity: "high",
      link: "/tasks",
    },
    closingDeals > 0 && {
      key: "closing_deals",
      title: `${closingDeals} deal${closingDeals === 1 ? "" : "s"} closing soon`,
      count: closingDeals,
      severity: "medium",
      link: "/sales",
    },
    uncontactedLeads > 0 && {
      key: "uncontacted_leads",
      title: `${uncontactedLeads} lead${uncontactedLeads === 1 ? "" : "s"} waiting for contact`,
      count: uncontactedLeads,
      severity: "medium",
      link: "/leads",
    },
  ].filter(Boolean);
  res.json({
    success: true,
    data: {
      totalCount: items.reduce((sum, item) => sum + (item as any).count, 0),
      items,
    },
  });
}
