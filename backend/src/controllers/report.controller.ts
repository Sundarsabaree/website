import { Response } from "express";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "../prisma.js";
import { AuthenticatedRequest } from "../types/index.js";
import {
  customerScope,
  dealScope,
  leadScope,
  userScope,
} from "../services/scope.service.js";

/** All reports/exports run inside the caller's scope (organisation / team / own records). */

/** CSV-safe cell: quotes, and neutralises spreadsheet formula injection (=, +, -, @). */
function csvCell(value: string | number | null | undefined): string {
  if (typeof value === "number") return String(value);
  let text = value ?? "";
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function getReportsAnalytics(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const [cW, lW, dW, uW] = await Promise.all([
    customerScope(actor),
    leadScope(actor),
    dealScope(actor),
    userScope(actor),
  ]);

  const [customers, leads, deals, employees] = await Promise.all([
    prisma.customer.findMany({
      where: cW,
      select: {
        id: true,
        name: true,
        company: true,
        budget: true,
        status: true,
        industry: true,
        createdAt: true,
      },
    }),
    prisma.lead.findMany({
      where: lW,
      select: {
        id: true,
        title: true,
        stage: true,
        value: true,
        priority: true,
        createdAt: true,
      },
    }),
    prisma.deal.findMany({
      where: dW,
      select: {
        id: true,
        title: true,
        stage: true,
        value: true,
        probability: true,
        closingDate: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      where: {
        AND: [uW, { role: { in: [Role.SALES_EXECUTIVE, Role.MANAGER] } }],
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        assignedDeals: { where: dW, select: { value: true, stage: true } },
      },
    }),
  ]);

  const wonDeals = deals.filter((d) => d.stage === "CLOSED_WON");
  const totalRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);

  const industryMap: Record<string, { count: number; revenue: number }> = {};
  customers.forEach((c) => {
    const ind = c.industry || "General";
    if (!industryMap[ind]) industryMap[ind] = { count: 0, revenue: 0 };
    industryMap[ind].count++;
    industryMap[ind].revenue += c.budget;
  });
  const industryBreakdown = Object.keys(industryMap).map((k) => ({
    industry: k,
    customersCount: industryMap[k].count,
    totalBudget: industryMap[k].revenue,
  }));

  const totalLeads = leads.length;
  const wonLeads = leads.filter((l) => l.stage === "WON").length;
  const lostLeads = leads.filter((l) => l.stage === "LOST").length;
  const inPipelineLeads = totalLeads - wonLeads - lostLeads;
  const leadConversionRate =
    totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  const monthlyData: Record<string, number> = {};
  deals.forEach((d) => {
    const month = new Date(d.createdAt).toLocaleString("en-US", {
      month: "short",
      year: "numeric",
    });
    monthlyData[month] =
      (monthlyData[month] || 0) + (d.stage === "CLOSED_WON" ? d.value : 0);
  });

  const leaderboard = employees
    .map((emp) => {
      const closed = emp.assignedDeals.filter((d) => d.stage === "CLOSED_WON");
      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        department: emp.department,
        dealsWon: closed.length,
        revenueGenerated: closed.reduce((s, d) => s + d.value, 0),
      };
    })
    .sort((a, b) => b.revenueGenerated - a.revenueGenerated);

  res.json({
    success: true,
    data: {
      summary: {
        totalRevenue,
        totalCustomers: customers.length,
        totalLeads,
        wonLeads,
        leadConversionRate,
        inPipelineLeads,
      },
      industryBreakdown,
      leaderboard,
      monthlyData,
    },
  });
}

export async function exportReportCsv(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const actor = req.user!;
  const { type = "customers" } = req.query as { type?: string };

  if (type === "customers") {
    const customers = await prisma.customer.findMany({
      where: await customerScope(actor),
      orderBy: { createdAt: "desc" },
      take: 10000,
      include: { assignedTo: { select: { name: true } } },
    });

    const rows = [
      [
        "Name",
        "Email",
        "Company",
        "Industry",
        "Budget (INR)",
        "Lead Score",
        "Status",
        "Assigned To",
        "Created At",
      ].join(","),
    ];
    customers.forEach((c) => {
      rows.push(
        [
          csvCell(c.name),
          csvCell(c.email),
          csvCell(c.company),
          csvCell(c.industry),
          csvCell(c.budget),
          csvCell(c.leadScore),
          csvCell(c.status),
          csvCell(c.assignedTo?.name),
          csvCell(c.createdAt.toISOString()),
        ].join(","),
      );
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="smartcrm-customers-export.csv"',
    );
    res.send(rows.join("\n"));
    return;
  }

  if (type === "leads") {
    const leads = await prisma.lead.findMany({
      where: await leadScope(actor),
      orderBy: { createdAt: "desc" },
      take: 10000,
      include: { assignedTo: { select: { name: true } } },
    });

    const rows = [
      [
        "Title",
        "Contact Name",
        "Email",
        "Company",
        "Value (INR)",
        "Stage",
        "Priority",
        "Assigned To",
      ].join(","),
    ];
    leads.forEach((l) => {
      rows.push(
        [
          csvCell(l.title),
          csvCell(l.contactName),
          csvCell(l.email),
          csvCell(l.company),
          csvCell(l.value),
          csvCell(l.stage),
          csvCell(l.priority),
          csvCell(l.assignedTo?.name),
        ].join(","),
      );
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="smartcrm-leads-export.csv"',
    );
    res.send(rows.join("\n"));
    return;
  }

  res.status(400).json({ success: false, message: "Invalid report type" });
}
