import { Response } from 'express';
import { prisma } from '../prisma.js';
import { AuthenticatedRequest } from '../types/index.js';

export async function getReportsAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const [customers, leads, deals, employees] = await Promise.all([
    prisma.customer.findMany({
      select: { id: true, name: true, company: true, budget: true, status: true, industry: true, createdAt: true }
    }),
    prisma.lead.findMany({
      select: { id: true, title: true, stage: true, value: true, priority: true, createdAt: true }
    }),
    prisma.deal.findMany({
      select: { id: true, title: true, stage: true, value: true, probability: true, closingDate: true, createdAt: true }
    }),
    prisma.user.findMany({
      where: { role: { in: ['SALES_EXECUTIVE', 'MANAGER'] } },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        assignedDeals: { select: { value: true, stage: true } },
        assignedCustomers: { select: { budget: true } }
      }
    })
  ]);

  // Total Won Revenue
  const wonDeals = deals.filter(d => d.stage === 'CLOSED_WON');
  const totalRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);

  // Industry Breakdown
  const industryMap: Record<string, { count: number; revenue: number }> = {};
  customers.forEach(c => {
    const ind = c.industry || 'General';
    if (!industryMap[ind]) industryMap[ind] = { count: 0, revenue: 0 };
    industryMap[ind].count++;
    industryMap[ind].revenue += c.budget;
  });

  const industryBreakdown = Object.keys(industryMap).map(k => ({
    industry: k,
    customersCount: industryMap[k].count,
    totalBudget: industryMap[k].revenue
  }));

  // Conversion Metrics
  const totalLeads = leads.length;
  const wonLeads = leads.filter(l => l.stage === 'WON').length;
  const lostLeads = leads.filter(l => l.stage === 'LOST').length;
  const inPipelineLeads = totalLeads - wonLeads - lostLeads;
  const leadConversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  // Monthly Sales Aggregation
  const monthlyData: Record<string, number> = {};
  deals.forEach(d => {
    const month = new Date(d.createdAt).toLocaleString('en-US', { month: 'short', year: 'numeric' });
    monthlyData[month] = (monthlyData[month] || 0) + (d.stage === 'CLOSED_WON' ? d.value : 0);
  });

  // Employee Leaderboard
  const leaderboard = employees.map(emp => {
    const closed = emp.assignedDeals.filter(d => d.stage === 'CLOSED_WON');
    const revenue = closed.reduce((s, d) => s + d.value, 0);
    return {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      department: emp.department,
      dealsWon: closed.length,
      revenueGenerated: revenue
    };
  }).sort((a, b) => b.revenueGenerated - a.revenueGenerated);

  res.json({
    success: true,
    data: {
      summary: {
        totalRevenue,
        totalCustomers: customers.length,
        totalLeads,
        wonLeads,
        leadConversionRate,
        inPipelineLeads
      },
      industryBreakdown,
      leaderboard,
      monthlyData
    }
  });
}

export async function exportReportCsv(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { type = 'customers' } = req.query as { type: string };

  if (type === 'customers') {
    const customers = await prisma.customer.findMany({
      include: { assignedTo: { select: { name: true } } }
    });

    const csvRows = [
      ['Name', 'Email', 'Company', 'Industry', 'Budget (INR)', 'Lead Score', 'Status', 'Assigned To', 'Created At'].join(',')
    ];

    customers.forEach(c => {
      csvRows.push([
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.email.replace(/"/g, '""')}"`,
        `"${(c.company || '').replace(/"/g, '""')}"`,
        `"${(c.industry || '').replace(/"/g, '""')}"`,
        c.budget,
        `"${(c.leadScore || '').replace(/"/g, '""')}"`,
        c.status,
        `"${(c.assignedTo?.name || '').replace(/"/g, '""')}"`,
        c.createdAt.toISOString()
      ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="smartcrm-customers-export.csv"');
    res.send(csvRows.join('\n'));
    return;
  }

  if (type === 'leads') {
    const leads = await prisma.lead.findMany({
      include: { assignedTo: { select: { name: true } } }
    });

    const csvRows = [
      ['Title', 'Contact Name', 'Email', 'Company', 'Value (INR)', 'Stage', 'Priority', 'Assigned To'].join(',')
    ];

    leads.forEach(l => {
      csvRows.push([
        `"${l.title.replace(/"/g, '""')}"`,
        `"${l.contactName.replace(/"/g, '""')}"`,
        `"${l.email.replace(/"/g, '""')}"`,
        `"${(l.company || '').replace(/"/g, '""')}"`,
        l.value,
        l.stage,
        l.priority,
        `"${(l.assignedTo?.name || '').replace(/"/g, '""')}"`
      ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="smartcrm-leads-export.csv"');
    res.send(csvRows.join('\n'));
    return;
  }

  res.status(400).json({ success: false, message: 'Invalid report type' });
}
