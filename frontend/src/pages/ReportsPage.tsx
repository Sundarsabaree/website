import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Download,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Users,
  Target,
  Trophy,
} from "lucide-react";
import { reportService } from "../services/api.js";
import { Button } from "../components/ui/Button.js";
import { useAuth } from "../context/AuthContext.js";

const COLORS = [
  "#2563EB",
  "#06B6D4",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
];

interface AnalyticsData {
  summary: {
    totalRevenue: number;
    totalCustomers: number;
    totalLeads: number;
    wonLeads: number;
    leadConversionRate: number;
    inPipelineLeads: number;
  };
  industryBreakdown: {
    industry: string;
    customersCount: number;
    totalBudget: number;
  }[];
  leaderboard: {
    id: string;
    name: string;
    email: string;
    department: string;
    dealsWon: number;
    revenueGenerated: number;
  }[];
  monthlyData: Record<string, number>;
}

const fmt = (n: number) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toLocaleString()}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 shadow-xl">
        <p className="text-xs font-semibold text-slate-300 mb-1">{label}</p>
        {payload.map((e: any, i: number) => (
          <p key={i} className="text-xs" style={{ color: e.color }}>
            {e.name}:{" "}
            {typeof e.value === "number" && e.value > 1000
              ? fmt(e.value)
              : e.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ReportsPage() {
  const { isAdmin, isManager } = useAuth();
  const canExport = isAdmin || isManager;

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<"customers" | "leads" | null>(
    null,
  );

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await reportService.getAnalytics();
        setData(res.data.data);
      } catch (err: any) {
        setError(err?.message || "Unable to load reports. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleExport = async (type: "customers" | "leads") => {
    setExporting(type);
    try {
      await reportService.exportCsv(type);
    } catch (err: any) {
      setError(err?.message || `Failed to export ${type}.`);
    } finally {
      setExporting(null);
    }
  };

  // Prepare monthly chart data
  const monthlyChartData = data
    ? Object.entries(data.monthlyData)
        .slice(-6)
        .map(([month, revenue]) => ({ month, revenue }))
    : [];

  const industryData = data?.industryBreakdown.slice(0, 8) ?? [];

  const summaryCards = data
    ? [
        {
          label: "Total Revenue",
          value: fmt(data.summary.totalRevenue),
          icon: TrendingUp,
          tint: "text-emerald-400 bg-emerald-500/10",
          sub: "Closed won deals",
        },
        {
          label: "Total Customers",
          value: data.summary.totalCustomers,
          icon: Users,
          tint: "text-blue-400 bg-blue-500/10",
          sub: "In your CRM",
        },
        {
          label: "Lead Conversion",
          value: `${data.summary.leadConversionRate}%`,
          icon: Target,
          tint: "text-cyan-400 bg-cyan-500/10",
          sub: `${data.summary.wonLeads} / ${data.summary.totalLeads} leads won`,
        },
        {
          label: "Active Pipeline",
          value: data.summary.inPipelineLeads,
          icon: Trophy,
          tint: "text-violet-400 bg-violet-500/10",
          sub: "Leads in progress",
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-32 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading reports
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">
            Reports & Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Business insights from your CRM data.
          </p>
        </div>
        {canExport && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              isLoading={exporting === "customers"}
              onClick={() => handleExport("customers")}
            >
              Export Customers
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              isLoading={exporting === "leads"}
              onClick={() => handleExport("leads")}
            >
              Export Leads
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map(({ label, value, icon: Icon, tint, sub }) => (
              <div
                key={label}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${tint}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold font-heading text-white">
                  {value}
                </p>
                <p className="text-sm text-slate-400 mt-0.5">{label}</p>
                {sub && <p className="text-xs text-slate-600 mt-1">{sub}</p>}
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Revenue */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h3 className="font-heading font-bold text-white mb-1">
                Monthly Revenue
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Closed-won deal value by month
              </p>
              {monthlyChartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                  No closed deals data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1E293B"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#64748B", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#64748B", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => fmt(v)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="revenue"
                      fill="#2563EB"
                      radius={[6, 6, 0, 0]}
                      name="Revenue"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Industry Breakdown */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h3 className="font-heading font-bold text-white mb-1">
                Customers by Industry
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Distribution across industries
              </p>
              {industryData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                  No customer data yet
                </div>
              ) : (
                <div className="flex gap-6 items-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={industryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="customersCount"
                        nameKey="industry"
                      >
                        {industryData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, name) => [v, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 shrink-0">
                    {industryData.slice(0, 5).map((d, i) => (
                      <div key={d.industry} className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-xs text-slate-400 truncate max-w-[100px]">
                          {d.industry}
                        </span>
                        <span className="text-xs font-semibold text-slate-300">
                          {d.customersCount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard — only for ADMIN/MANAGER */}
          {(isAdmin || isManager) && data.leaderboard.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h3 className="font-heading font-bold text-white mb-1">
                Team Leaderboard
              </h3>
              <p className="text-xs text-slate-500 mb-5">
                Revenue generated per team member
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {["#", "Name", "Department", "Deals Won", "Revenue"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.leaderboard.map((emp, i) => (
                      <tr
                        key={emp.id}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-500 text-xs font-bold">
                          #{i + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                              {emp.name[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="text-slate-200 font-medium">
                                {emp.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {emp.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {emp.department || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center w-8 h-6 text-xs font-bold bg-emerald-500/10 text-emerald-400 rounded-full">
                            {emp.dealsWon}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-emerald-400 font-semibold">
                          {fmt(emp.revenueGenerated)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No leaderboard access */}
          {!(isAdmin || isManager) && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-sm">
              Team performance data is available to Managers and Admins.
            </div>
          )}
        </>
      )}
    </div>
  );
}
